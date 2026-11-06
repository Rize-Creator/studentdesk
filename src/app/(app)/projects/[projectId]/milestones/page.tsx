import { requireMember } from "@/features/auth/session";
import { MilestonesManager } from "@/features/projects/milestones-manager";
import { dueLabel } from "@/features/projects/page-summaries";
import { listMilestones } from "@/features/projects/queries";
import { can } from "@/lib/permissions";

export default async function MilestonesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { member, project } = await requireMember(projectId);
  const milestones = await listMilestones(projectId);
  const now = new Date();
  return (
    <MilestonesManager
      projectId={projectId}
      canManage={can(member.role, "milestones:manage") && project.status === "ACTIVE"}
      milestones={milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        dueDate: milestone.dueDate,
        due: dueLabel(milestone.dueDate, now),
        markedComplete: milestone.completedAt !== null,
        done: milestone.tasks.filter((task) => task.status === "DONE").length,
        total: milestone.tasks.length,
      }))}
    />
  );
}
