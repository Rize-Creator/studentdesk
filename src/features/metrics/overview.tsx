"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Overview } from "@/features/metrics/queries";
import { ReadinessBadge } from "@/features/metrics/readiness-badge";
import { formatManilaDate } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

export function OverviewView({ initial }: { initial: Overview }) {
  const { data } = useQuery({
    queryKey: ["overview"],
    initialData: initial,
    refetchInterval: REFRESH_MS,
    queryFn: async (): Promise<Overview> => {
      const response = await fetch("/api/me/overview");
      if (!response.ok) throw new Error("Couldn't refresh the overview.");
      return response.json();
    },
  });

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-xs text-muted-foreground">Updates automatically every 15 seconds</p>
      </div>
      {data.projects.length === 0 && (
        <p className="text-muted-foreground">Projects you advise or lead appear here, with the ones needing attention first.</p>
      )}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.projects.map((project) => {
          const percent = Math.round(project.readiness.completion);
          return (
            <li key={project.id} className="min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-bold">{project.name}</span>
                  <Badge variant="secondary">{ROLE_LABELS[project.role]}</Badge>
                </span>
                <span><ReadinessBadge status={project.readiness.status} /></span>
                <span className="flex flex-col gap-1">
                  <span className="text-sm"><span className="font-bold tabular-nums">{percent}%</span> complete</span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                  </span>
                </span>
                <span className="mt-auto flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className={cn(project.overdueCount > 0 && "font-bold text-brand-red")}>
                    {project.overdueCount} overdue {project.overdueCount === 1 ? "task" : "tasks"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flag aria-hidden className="size-3.5 shrink-0" />
                    <span className="min-w-0">
                      {project.nextMilestone
                        ? `${project.nextMilestone.title}, ${formatManilaDate(new Date(project.nextMilestone.dueDate))}`
                        : "No upcoming milestones"}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
