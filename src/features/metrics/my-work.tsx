"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Flag } from "lucide-react";
import Link from "next/link";
import { PriorityChip } from "@/components/priority-chip";
import { StageBadge } from "@/components/stage-badge";
import { Badge } from "@/components/ui/badge";
import { summarizeWork } from "@/features/metrics/my-work-summary";
import type { MyWork } from "@/features/metrics/queries";
import { ReadinessBadge } from "@/features/metrics/readiness-badge";
import { formatManilaDate } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

function TaskRows({ tasks }: { tasks: MyWork["tasks"] }) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/projects/${task.projectId}/board?task=${task.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border p-3 transition-colors hover:border-primary"
          >
            <span className="min-w-0 flex-1 basis-56">
              <span className="block text-sm font-bold">{task.title}</span>
              <span className="block text-xs text-muted-foreground">
                {task.projectName}, {task.categoryName}
              </span>
            </span>
            <PriorityChip priority={task.priority} />
            <StageBadge status={task.status} />
            <span className={cn("flex w-28 items-center gap-1 text-xs tabular-nums", task.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
              <CalendarDays aria-hidden className="size-3.5" />
              {formatManilaDate(new Date(task.deadline))}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Group({ title, tasks, alert }: { title: string; tasks: MyWork["tasks"]; alert?: boolean }) {
  if (tasks.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className={cn("text-sm font-bold", alert && "text-brand-red")}>
        {title} ({tasks.length})
      </h3>
      <TaskRows tasks={tasks} />
    </section>
  );
}

function Numbers({ counts }: { counts: ReturnType<typeof summarizeWork> }) {
  const rows = [
    { label: "Overdue", value: counts.overdue, alert: counts.overdue > 0 },
    { label: "Due in 7 days", value: counts.dueSoon, alert: false },
    { label: "In Review", value: counts.inReview, alert: false },
    { label: "Finished", value: counts.finished, alert: false },
  ];
  return (
    <ul aria-label="Your tasks at a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {rows.map((row) => (
        <li key={row.label} className={cn("rounded-xl p-4", row.alert ? "bg-brand-red/10" : "bg-muted")}>
          <span className={cn("block font-heading text-3xl font-bold tabular-nums", row.alert && "text-brand-red")}>{row.value}</span>
          <span className={cn("block text-sm", row.alert ? "font-semibold text-brand-red" : "text-muted-foreground")}>{row.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewList({ tasks }: { tasks: MyWork["waitingForReview"] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Waiting for your review ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is waiting for your review.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/projects/${task.projectId}/board?task=${task.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-tint/40 p-3 transition-colors hover:border-primary"
              >
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block text-sm font-bold">{task.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {task.assigneeName ?? "Unassigned"}, {task.projectName}
                  </span>
                </span>
                <span className={cn("flex w-28 items-center gap-1 text-xs tabular-nums", task.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
                  <CalendarDays aria-hidden className="size-3.5" />
                  {formatManilaDate(new Date(task.deadline))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectCard({ project }: { project: MyWork["projects"][number] }) {
  const next = project.nextMilestone;
  return (
    <Link href={`/projects/${project.id}`} className="flex h-full flex-col gap-3 rounded-xl border border-border p-4 text-sm transition-colors hover:border-primary">
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-bold">{project.name}</span>
        <Badge variant="secondary">{ROLE_LABELS[project.role]}</Badge>
      </span>
      <span><ReadinessBadge status={project.readinessStatus} className="px-2 py-0.5 text-xs" /></span>
      <span className="flex flex-col gap-1">
        <span><span className="font-bold tabular-nums">{project.completion}%</span> complete</span>
        <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${project.completion}%` }} />
        </span>
      </span>
      <span className={cn("flex items-start gap-1.5 text-xs", next?.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
        <Flag aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0">
          {next ? `${next.overdue ? "Overdue" : "Next"}: ${next.title}, ${formatManilaDate(new Date(next.dueDate))}` : "No upcoming milestones"}
        </span>
      </span>
    </Link>
  );
}

export function MyWorkView({ initial, name, greeting }: { initial: MyWork; name: string; greeting: string }) {
  const { data } = useQuery({
    queryKey: ["my-work"],
    initialData: initial,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<MyWork> => {
      const response = await fetch("/api/me/work");
      if (!response.ok) throw new Error("Couldn't refresh your work.");
      return response.json();
    },
  });

  const overdue = data.tasks.filter((task) => task.overdue);
  const soon = data.tasks.filter((task) => !task.overdue && task.dueSoon);
  const later = data.tasks.filter((task) => !task.overdue && !task.dueSoon);
  const isLead = data.projects.some((project) => project.role === "LEAD");
  // Advisers don't get tasks, so their numbers would all be zero.
  const onlyAdvises = data.projects.length > 0 && data.projects.every((project) => project.role === "ADVISER");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">{greeting}, {name}</h1>
        <p className="text-xs text-muted-foreground">Updates automatically every 15 seconds</p>
      </div>

      {!onlyAdvises && <Numbers counts={summarizeWork(data.tasks, data.finishedCount)} />}

      <div className={cn("grid gap-8", !onlyAdvises && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        {!onlyAdvises && (
          <div className="flex min-w-0 flex-col gap-8">
            {isLead && <ReviewList tasks={data.waitingForReview} />}
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">My tasks</h2>
              {data.tasks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You have no unfinished tasks. New tasks show up here when a lead assigns them to you.
                </p>
              )}
              <Group title="Overdue" tasks={overdue} alert />
              <Group title="Due in the next 7 days" tasks={soon} />
              <Group title="Later" tasks={later} />
            </section>
          </div>
        )}

        <section aria-labelledby="my-projects" className="flex min-w-0 flex-col gap-2">
          <h2 id="my-projects" className="text-lg font-bold">My projects</h2>
          {onlyAdvises && (
            <p className="mb-2 text-sm text-muted-foreground">
              These are the projects you advise. Open one to see its dashboard, or use Overview to compare them.
            </p>
          )}
          {data.projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You aren&apos;t in any active projects yet. <Link href="/projects/new" className="text-primary underline underline-offset-2">Create one</Link> or ask your lead to add you.
            </p>
          )}
          <ul className={cn("grid gap-3", onlyAdvises && "md:grid-cols-2 lg:grid-cols-3")}>
            {data.projects.map((project) => (
              <li key={project.id} className="min-w-0">
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
