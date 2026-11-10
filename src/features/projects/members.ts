"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/features/auth/session";
import { wouldRemoveLastLead } from "@/features/projects/member-rules";
import { searchPeople } from "@/features/projects/queries";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/db";
import { fieldErrors, memberSchema } from "@/lib/validators/schemas";

const LAST_LEAD = "A project must always have at least one lead.";

export async function addMember(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: parsed.data.userId } },
  });
  if (existing) return fail("That person is already in this project.");
  await prisma.projectMember.create({ data: { projectId, ...parsed.data } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function updateMember(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { userId, ...data } = parsed.data;
  const team = await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true, role: true } });
  if (wouldRemoveLastLead(team, { userId, newRole: data.role })) return fail(LAST_LEAD);
  await prisma.$transaction(async (tx) => {
    await tx.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data });
    // Advisers can't hold tasks, so unfinished work goes back to the lead to reassign.
    if (data.role === "ADVISER") {
      await tx.task.updateMany({
        where: { projectId, assigneeId: userId, status: { not: "DONE" } },
        data: { assigneeId: null },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const team = await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true, role: true } });
  if (wouldRemoveLastLead(team, { userId })) return fail(LAST_LEAD);
  await prisma.$transaction(async (tx) => {
    // Unfinished tasks are unassigned. Finished tasks keep their record for recommendations.
    await tx.task.updateMany({
      where: { projectId, assigneeId: userId, status: { not: "DONE" } },
      data: { assigneeId: null },
    });
    await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function findPeople(projectId: string, query: string): Promise<ActionResult<{ id: string; name: string }[]>> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  return ok(await searchPeople(projectId, query));
}
