import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/features/auth/session";
import { listMyProjects } from "@/features/projects/queries";
import { formatManilaDate } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/permissions";

type Row = Awaited<ReturnType<typeof listMyProjects>>[number];

function ProjectList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map(({ project, role }) => (
        <li key={project.id}>
          <Link href={`/projects/${project.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-secondary/60">
            <span className="min-w-0 flex-1 font-bold">{project.name}</span>
            <span className="text-sm text-muted-foreground">{project.type === "EVENT" ? "Event" : "Academic project"}</span>
            <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            <span className="w-28 text-right text-sm tabular-nums">{formatManilaDate(project.targetDate)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectsPage() {
  const user = await requireUser();
  const rows = await listMyProjects(user.id);
  const active = rows.filter((row) => row.project.status === "ACTIVE");
  const archived = rows.filter((row) => row.project.status === "ARCHIVED");

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="max-w-lg text-muted-foreground">
          You aren&apos;t in any projects yet. Create one for your event or capstone, or ask your lead to add you.
        </p>
      )}
      {active.length > 0 && <ProjectList rows={active} />}
      {archived.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Archived</h2>
          <ProjectList rows={archived} />
        </section>
      )}
    </main>
  );
}
