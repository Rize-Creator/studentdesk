import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/features/auth/options";
import { prisma } from "@/lib/db";

export type SessionUser = { id: string; name: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
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
