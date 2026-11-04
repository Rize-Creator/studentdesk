import { isOnTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { groupFinishedTasks } from "./history-groups";

export async function getMemberHistory(userId: string, viewerId: string, currentProjectId: string) {
  const [memberships, doneTasks, viewerMemberships] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true, status: true } }, committeeCategory: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, status: "DONE" },
      include: { category: true, project: { select: { id: true, name: true } } },
    }),
    prisma.projectMember.findMany({ where: { userId: viewerId }, select: { projectId: true } }),
  ]);

  const perCategory = new Map<string, number>();
  for (const task of doneTasks) {
    perCategory.set(task.category.name, (perCategory.get(task.category.name) ?? 0) + 1);
  }

  return {
    memberships,
    doneTotal: doneTasks.length,
    doneOnTime: doneTasks.filter((task) => task.completedAt && isOnTime(task.completedAt, task.deadline)).length,
    perCategory: [...perCategory.entries()].map(([name, count]) => ({ name, count })),
    finished: groupFinishedTasks(
      doneTasks,
      viewerMemberships.map((row) => row.projectId),
      currentProjectId,
    ),
  };
}
