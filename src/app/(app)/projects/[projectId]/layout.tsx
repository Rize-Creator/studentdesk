import { AppShell } from "@/components/app-shell";
import { requireMember } from "@/features/auth/session";
import { ProjectPanel } from "@/features/projects/project-panel";
import { ProjectTabs } from "@/features/projects/project-tabs";
import { getProjectSummary } from "@/features/projects/queries";
import { can } from "@/lib/permissions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, member, project } = await requireMember(projectId);
  const { summary, leadNames } = await getProjectSummary(project.id, project.targetDate);
  return (
    <AppShell
      user={user}
      panel={
        <ProjectPanel
          name={project.name}
          type={project.type}
          archived={project.status === "ARCHIVED"}
          role={member.role}
          leadNames={leadNames}
          startDate={project.startDate}
          targetDate={project.targetDate}
          summary={summary}
        />
      }
    >
      <div className="flex flex-col gap-6">
        <ProjectTabs projectId={projectId} projectName={project.name} showSettings={can(member.role, "project:edit")} />
        {children}
      </div>
    </AppShell>
  );
}
