"use server";

import { revalidatePath } from "next/cache";
import { authorize, getMembership, getSessionUser } from "@/features/auth/session";
import { positionAtEnd, positionBetween } from "@/features/tasks/positions";
import { checkMove } from "@/features/tasks/transitions";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { endOfManilaDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { deliverableSchema, fieldErrors, moveSchema, taskSchema } from "@/lib/validators/schemas";

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

export async function moveTask(projectId: string, taskId: string, input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.");
  const member = await getMembership(projectId, user.id);
  if (!member) return fail("You don't have permission to do that.");
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { to, beforeId, afterId, note } = parsed.data;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) return fail("That task no longer exists.");

  // The server re-checks every move, because the board on screen may be out of date.
  const check = checkMove({
    role: member.role,
    archived: member.project.status === "ARCHIVED",
    isAssignee: task.assigneeId === user.id,
    hasAssignee: task.assigneeId !== null,
    from: task.status,
    to,
    note,
  });
  if (!check.ok) return fail(check.message);

  const deliverable = deliverableSchema.safeParse(input);
  if (!deliverable.success) return fail("Please check the form.", fieldErrors(deliverable.error));

  const neighbours = await prisma.task.findMany({
    where: { projectId, status: to, id: { in: [beforeId, afterId].filter((id): id is string => Boolean(id)) } },
    select: { id: true, position: true },
  });
  const before = neighbours.find((n) => n.id === beforeId)?.position ?? null;
  const after = neighbours.find((n) => n.id === afterId)?.position ?? null;
  const changedStage = task.status !== to;

  await prisma.$transaction(async (tx) => {
    let position = positionBetween(before, after);
    if (before === null && after === null) {
      const last = await tx.task.aggregate({ where: { projectId, status: to }, _max: { position: true } });
      position = positionAtEnd(last._max.position);
    }
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: to,
        position,
        completedAt: to === "DONE" ? (task.completedAt ?? new Date()) : null,
        // Leaving the dialog blank keeps whatever was submitted earlier.
        ...(to === "REVIEW" && changedStage
          ? {
              deliverableUrl: deliverable.data.deliverableUrl ?? task.deliverableUrl,
              deliverableNote: deliverable.data.deliverableNote ?? task.deliverableNote,
            }
          : {}),
      },
    });
    if (changedStage) {
      await tx.taskStatusHistory.create({
        data: { taskId, fromStatus: task.status, toStatus: to, changedById: user.id, note },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
