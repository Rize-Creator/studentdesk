import { isOnTime } from "@/lib/dates";
import { prisma } from "@/lib/db";

export async function getMemberHistory(userId: string) {
  const [memberships, doneTasks] = await Promise.all([
    prisma.projectMember.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true, status: true } }, committeeCategory: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, status: "DONE" },
      include: { category: true },
    }),
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
  };
}
