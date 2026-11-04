import { notFound } from "next/navigation";
import { requireMember } from "@/features/auth/session";
import { ArchiveButton } from "@/features/projects/archive-button";
import { ProjectForm } from "@/features/projects/project-form";
import { manilaDateKey } from "@/lib/dates";
import { can } from "@/lib/permissions";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { member, project } = await requireMember(projectId);
  if (!can(member.role, "project:edit")) notFound();
  const archived = project.status === "ARCHIVED";
  return (
    <main className="flex flex-col gap-10">
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
      <section className="flex max-w-xl flex-col items-start gap-2">
        <h2 className="text-xl font-bold">{archived ? "Restore this project" : "Archive this project"}</h2>
        <p className="text-muted-foreground">
          {archived
            ? "Restoring lets your team change tasks again and turns reminders back on."
            : "Archiving makes the project read-only and stops its reminders. Its records still count toward suggestions."}
        </p>
        <ArchiveButton projectId={projectId} archived={archived} />
      </section>
    </main>
  );
}
