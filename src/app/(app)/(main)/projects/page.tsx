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
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ project, role }) => (
        <li key={project.id} className="min-w-0">
          <Link
            href={`/projects/${project.id}`}
            className="flex h-full flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 font-bold">{project.name}</span>
              <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
            </span>
            <span className="mt-auto flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{project.type === "EVENT" ? "Event" : "Academic project"}</span>
              <span className="tabular-nums">{formatManilaDate(project.targetDate)}</span>
            </span>
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
