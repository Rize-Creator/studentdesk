"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { PriorityChip } from "@/components/priority-chip";
import { StageBadge } from "@/components/stage-badge";
import { Badge } from "@/components/ui/badge";
import type { MyWork } from "@/features/metrics/queries";
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
      <h2 className={cn("text-sm font-bold", alert && "text-brand-red")}>
        {title} ({tasks.length})
      </h2>
      <TaskRows tasks={tasks} />
    </section>
  );
}

export function MyWorkView({ initial }: { initial: MyWork }) {
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

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">My work</h1>
        <p className="text-xs text-muted-foreground">Updates automatically every 15 seconds</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          {data.tasks.length === 0 && (
            <p className="text-muted-foreground">
              You have no unfinished tasks. New tasks show up here when a lead assigns them to you.
            </p>
          )}
          <Group title="Overdue" tasks={overdue} alert />
          <Group title="Due in the next 7 days" tasks={soon} />
          <Group title="Later" tasks={later} />
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">My projects</h2>
          {data.projects.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You aren&apos;t in any active projects yet. <Link href="/projects/new" className="text-primary underline underline-offset-2">Create one</Link> or ask your lead to add you.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {data.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm transition-colors hover:border-primary">
                  <span className="min-w-0 font-semibold">{project.name}</span>
                  <Badge variant="secondary">{ROLE_LABELS[project.role]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
