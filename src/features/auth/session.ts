import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { authOptions } from "@/features/auth/options";
import { can, type ProjectAction } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export type SessionUser = { id: string; name: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  // Sessions are per request, and next-auth generates a token that can't be prerendered.
  await connection();
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

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
