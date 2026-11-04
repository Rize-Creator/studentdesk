import { requireMember } from "@/features/auth/session";
import { formatManilaDate } from "@/lib/dates";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project } = await requireMember(projectId);
  return (
    <main className="flex max-w-2xl flex-col gap-2">
      {project.description && <p>{project.description}</p>}
      <p className="text-muted-foreground">
        {formatManilaDate(project.startDate)} to {formatManilaDate(project.targetDate)}
      </p>
    </main>
  );
}
