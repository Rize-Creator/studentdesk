import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/features/auth/options";
import { can, type ProjectAction } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export type SessionUser = { id: string; name: string; email: string };

// A session can outlive its account, such as after the sample data is reset. The person is then treated
// as signed out, instead of seeing empty pages and getting an error on every change.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true } });
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

export function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: true },
  });
}

export async function requireMember(projectId: string) {
  const user = await requireUser();
  const member = await getMembership(projectId, user.id);
  // People outside a project get "not found", so they can't tell it exists.
  if (!member) notFound();
  return { user, member, project: member.project };
}

export async function authorize(projectId: string, action: ProjectAction) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, message: "Please sign in again." };
  const member = await getMembership(projectId, user.id);
  if (!member || !can(member.role, action)) {
    return { ok: false as const, message: "You don't have permission to do that." };
  }
  // Archived projects are read-only, except that a lead can restore one.
  if (member.project.status === "ARCHIVED" && action !== "project:edit") {
    return { ok: false as const, message: "This project is archived." };
  }
  return { ok: true as const, user, member, project: member.project };
}
