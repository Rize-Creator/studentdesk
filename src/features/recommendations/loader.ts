import { prisma } from "@/lib/db";
import { buildCandidateRecords } from "./records";

export async function loadCandidates(projectId: string, categoryId: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId, role: { in: ["LEAD", "MEMBER"] } },
    include: { user: { select: { id: true, name: true } } },
  });
  const ids = members.map((member) => member.userId);

  // Records come from every project, including archived ones.
  const [doneTasks, active, roles] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: { in: ids }, status: "DONE" },
      select: { assigneeId: true, categoryId: true, deadline: true, completedAt: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { in: ids },
        status: { in: ["TODO", "IN_PROGRESS", "REVIEW"] },
        project: { status: "ACTIVE" },
      },
      _count: { _all: true },
    }),
    prisma.projectMember.findMany({
      where: { userId: { in: ids }, committeeCategoryId: categoryId },
      include: { project: { select: { name: true } } },
    }),
  ]);

  return buildCandidateRecords({
    categoryId,
    people: members.map((member) => member.user),
    doneTasks,
    activeCounts: active.map((row) => ({ assigneeId: row.assigneeId, count: row._count._all })),
    roles: roles.map((role) => ({
      userId: role.userId,
      committeeTitle: role.committeeTitle,
      projectName: role.project.name,
    })),
  });
}
