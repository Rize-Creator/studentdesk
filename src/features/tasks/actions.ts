"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/features/auth/session";
import { positionAtEnd } from "@/features/tasks/positions";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { endOfManilaDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, taskSchema } from "@/lib/validators/schemas";

const NEEDS_ASSIGNEE = ["IN_PROGRESS", "REVIEW", "DONE"];

async function checkReferences(
  projectId: string,
  data: { assigneeId: string | null; milestoneId: string | null; categoryId: string },
): Promise<string | null> {
  if (data.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: data.assigneeId } },
    });
    if (!member || member.role === "ADVISER") return "That person can't be assigned tasks in this project.";
  }
  if (data.milestoneId) {
    const count = await prisma.milestone.count({ where: { id: data.milestoneId, projectId } });
    if (count === 0) return "That milestone isn't in this project.";
  }
  const category = await prisma.category.count({ where: { id: data.categoryId } });
  return category === 0 ? "Choose a category." : null;
}

export async function createTask(projectId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { deadline, recommendedRank, ...data } = parsed.data;
  const problem = await checkReferences(projectId, data);
  if (problem) return fail(problem);

  const status = data.assigneeId ? "TODO" : "BACKLOG";
  const task = await prisma.$transaction(async (tx) => {
    const last = await tx.task.aggregate({ where: { projectId, status }, _max: { position: true } });
    const created = await tx.task.create({
      data: {
        ...data,
        projectId,
        status,
        position: positionAtEnd(last._max.position),
        deadline: endOfManilaDay(deadline),
        createdById: auth.user.id,
      },
    });
    await tx.taskStatusHistory.create({
      data: { taskId: created.id, fromStatus: null, toStatus: status, changedById: auth.user.id },
    });
    if (data.assigneeId) {
      await tx.taskAssignment.create({
        data: {
          taskId: created.id,
          assigneeId: data.assigneeId,
          assignedById: auth.user.id,
          recommendedRank: recommendedRank ?? null,
        },
      });
    }
    return created;
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok({ id: task.id });
}

export async function updateTask(projectId: string, taskId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { deadline, recommendedRank, ...data } = parsed.data;
  const problem = await checkReferences(projectId, data);
  if (problem) return fail(problem);

  const current = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!current) return fail("That task no longer exists.");
  if (!data.assigneeId && NEEDS_ASSIGNEE.includes(current.status)) {
    return fail("Move this task back to To Do before removing its assignee.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { ...data, deadline: endOfManilaDay(deadline) } });
    if (data.assigneeId && data.assigneeId !== current.assigneeId) {
      await tx.taskAssignment.create({
        data: {
          taskId,
          assigneeId: data.assigneeId,
          assignedById: auth.user.id,
          recommendedRank: recommendedRank ?? null,
        },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function deleteTask(projectId: string, taskId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const current = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!current) return fail("That task no longer exists.");
  // Recommendations depend on the records of finished tasks.
  if (current.status === "DONE") return fail("Finished tasks can't be deleted.");
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
