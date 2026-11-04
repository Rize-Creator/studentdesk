import { requireMember } from "@/features/auth/session";
import { ProjectDashboardView } from "@/features/metrics/project-dashboard";
import { getProjectDashboard } from "@/features/metrics/queries";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, member } = await requireMember(projectId);
  const initial = await getProjectDashboard(projectId);
  return <ProjectDashboardView projectId={projectId} initial={initial} viewerId={user.id} role={member.role} />;
}
