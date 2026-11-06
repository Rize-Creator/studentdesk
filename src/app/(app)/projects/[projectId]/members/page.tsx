import { requireMember } from "@/features/auth/session";
import { MembersManager } from "@/features/projects/members-manager";
import { getMemberRecords, listMembers } from "@/features/projects/queries";
import { can } from "@/lib/permissions";

export default async function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, member, project } = await requireMember(projectId);
  const members = await listMembers(projectId);
  // Members can only see their own history, so they don't get these numbers either.
  const showWork = member.role !== "MEMBER";
  const records = showWork ? await getMemberRecords(members.map((row) => row.userId)) : null;
  return (
    <MembersManager
      projectId={projectId}
      viewerId={user.id}
      viewerRole={member.role}
      canManage={can(member.role, "members:manage") && project.status === "ACTIVE"}
      showWork={showWork}
      members={members.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        role: row.role,
        committeeCategoryId: row.committeeCategoryId,
        committeeTitle: row.committeeTitle,
        active: records ? (records.active.get(row.userId) ?? 0) : null,
        finished: records ? (records.finished.get(row.userId) ?? 0) : null,
      }))}
    />
  );
}
