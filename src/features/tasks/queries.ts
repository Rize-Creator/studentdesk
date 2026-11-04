import { prisma } from "@/lib/db";

export function getTaskDetail(projectId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignee: { select: { id: true, name: true } },
      category: true,
      milestone: { select: { id: true, title: true } },
      history: { include: { changedBy: { select: { name: true } } }, orderBy: { changedAt: "desc" } },
      assignments: {
        include: {
          assignee: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });
}

export function listTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { id: true, name: true } }, category: true },
    orderBy: { deadline: "asc" },
  });
}
