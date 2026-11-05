import { prisma } from "@/lib/db";
import type { TaskStatus } from "./transitions";

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

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  position: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  categoryName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  deadline: string;
  hasDeliverable: boolean;
  commentCount: number;
};

export async function getBoard(projectId: string): Promise<BoardTask[]> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true } },
      category: true,
      _count: { select: { history: { where: { note: { not: null } } } } },
    },
    orderBy: { position: "asc" },
  });
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    position: task.position,
    priority: task.priority,
    categoryName: task.category.name,
    assigneeId: task.assignee?.id ?? null,
    assigneeName: task.assignee?.name ?? null,
    deadline: task.deadline.toISOString(),
    hasDeliverable: Boolean(task.deliverableUrl),
    commentCount: task._count.history,
  }));
}
