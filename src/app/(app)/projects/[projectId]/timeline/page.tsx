import { requireMember } from "@/features/auth/session";
import { getProjectDashboard } from "@/features/metrics/queries";
import { TimelineView } from "@/features/metrics/timeline";

export default async function TimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requireMember(projectId);
  const initial = await getProjectDashboard(projectId);
  // One time from the server, so the first render here and in the browser match.
  return <TimelineView projectId={projectId} initial={initial} now={new Date().getTime()} />;
}
