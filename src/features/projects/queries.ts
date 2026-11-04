import { prisma } from "@/lib/db";

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
