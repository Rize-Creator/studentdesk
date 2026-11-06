import { notFound } from "next/navigation";
import { requireMember } from "@/features/auth/session";
import { ArchiveButton } from "@/features/projects/archive-button";
import { ProjectForm } from "@/features/projects/project-form";
import { countProjectParts, getProjectSummary } from "@/features/projects/queries";
import { manilaDateKey } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { member, project } = await requireMember(projectId);
  if (!can(member.role, "project:edit")) notFound();
  const archived = project.status === "ARCHIVED";
  const [{ summary }, parts] = await Promise.all([getProjectSummary(projectId, project.targetDate), countProjectParts(projectId)]);
  const rows = [
    { label: "Tasks", value: summary.total },
    { label: "Overdue tasks", value: summary.overdue },
    { label: "Members", value: parts.members },
    { label: "Milestones", value: parts.milestones },
    { label: "Days left", value: summary.daysLeft },
  ];

  return (
    // The form stops at its own width, so the summary takes all the space left over.
    <main className={cn("grid items-start gap-8", !archived && "lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]")}>
      {!archived && (
        <ProjectForm
          projectId={projectId}
          initial={{
            name: project.name,
            description: project.description,
            type: project.type,
            startDate: manilaDateKey(project.startDate),
            targetDate: manilaDateKey(project.targetDate),
          }}
        />
      )}
      <div className={cn("flex flex-col gap-4", archived && "max-w-xl")}>
        <section aria-labelledby="project-summary" className="flex flex-col gap-4 rounded-xl bg-muted p-5">
          <h2 id="project-summary" className="text-xl font-bold">Project summary</h2>
          <div className="flex flex-col gap-1.5">
            <span><span className="text-2xl font-bold tabular-nums">{summary.percent}%</span> complete</span>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-card">
              <div className="h-full rounded-full bg-primary" style={{ width: `${summary.percent}%` }} />
            </div>
          </div>
          <dl className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className={cn("font-bold tabular-nums", row.label === "Overdue tasks" && row.value > 0 && "text-brand-red")}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="flex flex-col items-start gap-2 rounded-xl border border-brand-red/40 p-5">
          <h2 className="text-xl font-bold">{archived ? "Restore this project" : "Archive this project"}</h2>
          <p className="text-sm text-muted-foreground">
            {archived
              ? "Restoring lets your team change tasks again and turns reminders back on."
              : "Archiving makes the project read-only and stops its reminders. Its records still count toward suggestions."}
          </p>
          <ArchiveButton projectId={projectId} archived={archived} />
        </section>
      </div>
    </main>
  );
}
