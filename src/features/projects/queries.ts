import { prisma } from "@/lib/db";
import { summarizeTasks } from "./summary";

export function listMyProjects(userId: string) {
  return prisma.projectMember.findMany({
    where: { userId },
    include: { project: { include: { _count: { select: { tasks: true, members: true } } } } },
    orderBy: { project: { targetDate: "asc" } },
  });
}

export function listMembers(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true, committeeCategory: true },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });
}

// The same counts suggestions use: active work across active projects, and everything ever finished.
export async function getMemberRecords(userIds: string[]) {
  const [active, finished] = await Promise.all([
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { assigneeId: { in: userIds }, status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] }, project: { status: "ACTIVE" } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { assigneeId: { in: userIds }, status: "DONE" },
      _count: { _all: true },
    }),
  ]);
  const toMap = (rows: typeof active) => new Map(rows.map((row) => [row.assigneeId, row._count._all]));
  return { active: toMap(active), finished: toMap(finished) };
}

export async function countProjectParts(projectId: string) {
  const [members, milestones] = await Promise.all([
    prisma.projectMember.count({ where: { projectId } }),
    prisma.milestone.count({ where: { projectId } }),
  ]);
  return { members, milestones };
}

// Only people who have signed in at least once exist as users (spec Section 6).
export function searchPeople(projectId: string, query: string) {
  const text = query.trim();
  if (text.length < 2) return Promise.resolve([]);
  return prisma.user.findMany({
    where: {
      memberships: { none: { projectId } },
      OR: [
        { name: { contains: text, mode: "insensitive" } },
        { email: { contains: text, mode: "insensitive" } },
        { lmsId: { contains: text, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 10,
    orderBy: { name: "asc" },
  });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export function listMilestones(projectId: string) {
  return prisma.milestone.findMany({
    where: { projectId },
    include: { tasks: { select: { status: true } } },
    orderBy: { dueDate: "asc" },
  });
}

export async function getProjectSummary(projectId: string, targetDate: Date) {
  const [tasks, leads] = await Promise.all([
    prisma.task.findMany({ where: { projectId }, select: { status: true, deadline: true } }),
    prisma.projectMember.findMany({
      where: { projectId, role: "LEAD" },
      select: { user: { select: { name: true } } },
    }),
  ]);
  return {
    summary: summarizeTasks(tasks, targetDate, new Date()),
    leadNames: leads.map((lead) => lead.user.name),
  };
}
