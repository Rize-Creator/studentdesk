import { requireMember } from "@/features/auth/session";
import { MembersManager } from "@/features/projects/members-manager";
import { listMembers } from "@/features/projects/queries";
import { can } from "@/lib/permissions";

export default async function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, member, project } = await requireMember(projectId);
  const members = await listMembers(projectId);
  return (
    <MembersManager
      projectId={projectId}
      viewerId={user.id}
      viewerRole={member.role}
      canManage={can(member.role, "members:manage") && project.status === "ACTIVE"}
      members={members.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        role: row.role,
        committeeCategoryId: row.committeeCategoryId,
        committeeTitle: row.committeeTitle,
      }))}
    />
  );
}
