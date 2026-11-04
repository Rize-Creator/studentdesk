import { Badge } from "@/components/ui/badge";
import { requireMember } from "@/features/auth/session";
import { ProjectTabs } from "@/features/projects/project-tabs";
import { can, ROLE_LABELS } from "@/lib/permissions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { member, project } = await requireMember(projectId);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
          {project.status === "ARCHIVED" && <Badge variant="outline">Archived</Badge>}
        </div>
        <ProjectTabs projectId={projectId} showSettings={can(member.role, "project:edit")} />
      </div>
      {children}
    </div>
  );
}
