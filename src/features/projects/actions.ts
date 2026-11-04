"use server";

import { revalidatePath } from "next/cache";
import { authorize, getSessionUser } from "@/features/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { endOfManilaDay, startOfManilaDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, milestoneSchema, projectSchema } from "@/lib/validators/schemas";

const CHECK_FORM = "Please check the form.";

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  const { startDate, targetDate, ...rest } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...rest,
      startDate: startOfManilaDay(startDate),
      targetDate: endOfManilaDay(targetDate),
      createdById: user.id,
      members: { create: { userId: user.id, role: "LEAD" } },
    },
  });
  revalidatePath("/projects");
  return ok({ id: project.id });
}

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "project:edit");
  if (!auth.ok) return fail(auth.message);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  const { startDate, targetDate, ...rest } = parsed.data;
  await prisma.project.update({
    where: { id: projectId },
    data: { ...rest, startDate: startOfManilaDay(startDate), targetDate: endOfManilaDay(targetDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionResult> {
  const auth = await authorize(projectId, "project:edit");
  if (!auth.ok) return fail(auth.message);
  await prisma.project.update({ where: { id: projectId }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function createMilestone(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  await prisma.milestone.create({
    data: { projectId, title: parsed.data.title, dueDate: endOfManilaDay(parsed.data.dueDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function updateMilestone(projectId: string, milestoneId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  // updateMany with projectId stops a lead of one project editing another project's milestone.
  await prisma.milestone.updateMany({
    where: { id: milestoneId, projectId },
    data: { title: parsed.data.title, dueDate: endOfManilaDay(parsed.data.dueDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function setMilestoneComplete(projectId: string, milestoneId: string, complete: boolean): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  await prisma.milestone.updateMany({
    where: { id: milestoneId, projectId },
    data: { completedAt: complete ? new Date() : null },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  await prisma.milestone.deleteMany({ where: { id: milestoneId, projectId } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
