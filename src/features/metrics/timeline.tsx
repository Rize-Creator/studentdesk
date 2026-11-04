"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { timelinePercent } from "@/features/metrics/calculations";
import type { ProjectDashboard } from "@/features/metrics/queries";
import { barGeometry, groupTimeline } from "@/features/metrics/timeline-rows";
import { useProjectDashboard } from "@/features/metrics/use-dashboard";
import { STATUS_LABELS } from "@/features/tasks/transitions";
import { formatDateKeyShort, formatManilaDate, manilaDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TICKS = [0, 0.25, 0.5, 0.75, 1];

type Task = ProjectDashboard["timelineTasks"][number];
type Milestone = ProjectDashboard["milestones"][number];

// One column on phones, with the name above its bar. Beside it from the md breakpoint up.
const ROW_GRID = "grid gap-x-4 gap-y-1 md:grid-cols-[var(--names)_minmax(0,1fr)] md:items-center";

function barClass(task: Task) {
  if (task.overdue) return "bg-brand-red";
  if (task.status === "DONE") return "bg-primary";
  return "border border-primary bg-tint";
}

function statusText(task: Task) {
  return task.overdue ? "Overdue" : STATUS_LABELS[task.status];
}

function TaskRow({ projectId, task, start, end }: { projectId: string; task: Task; start: Date; end: Date }) {
  const bar = barGeometry(new Date(task.createdAt), new Date(task.deadline), start, end);
  const deadline = formatManilaDate(new Date(task.deadline));
  return (
    <li>
      <Link
        href={`/projects/${projectId}/board?task=${task.id}`}
        title={`${task.title}: ${statusText(task)}, due ${deadline}`}
        className={cn(ROW_GRID, "rounded-md px-2 py-1.5 hover:bg-muted")}
      >
        <span className="flex min-w-0 items-baseline justify-between gap-2 text-sm md:pl-5">
          <span className="min-w-0 truncate">{task.title}</span>
          <span className={cn("shrink-0 text-xs tabular-nums", task.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
            <span className="sr-only">{statusText(task)}, due </span>
            {deadline}
          </span>
        </span>
        <span aria-hidden className="relative block h-3">
          <span
            className={cn("absolute inset-y-0 rounded-full", barClass(task))}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
          />
        </span>
      </Link>
    </li>
  );
}

function MilestoneHeader({ milestone, start, end }: { milestone: Milestone; start: Date; end: Date }) {
  const status = milestone.complete ? "Complete" : milestone.overdue ? "Overdue" : `${milestone.done} of ${milestone.total} tasks done`;
  return (
    <div className={cn(ROW_GRID, "rounded-md bg-muted/70 px-2 py-1.5")}>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold">
            <Flag aria-hidden className={cn("size-3.5 shrink-0", milestone.overdue ? "text-brand-red" : "text-primary")} />
            <span className="min-w-0">{milestone.title}</span>
          </h2>
          <span className={cn("shrink-0 text-xs font-semibold tabular-nums", milestone.overdue ? "text-brand-red" : "text-muted-foreground")}>
            <span className="sr-only">Due </span>
            {formatManilaDate(new Date(milestone.dueDate))}
          </span>
        </div>
        <p className={cn("pl-5.5 text-xs", milestone.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>{status}</p>
      </div>
      <span aria-hidden className="relative block h-4">
        <Flag
          className={cn("absolute top-0 size-4 -translate-x-0.5", milestone.overdue ? "fill-brand-red text-brand-red" : "fill-primary text-primary")}
          style={{ left: `${timelinePercent(new Date(milestone.dueDate), start, end)}%` }}
        />
      </span>
    </div>
  );
}

export function TimelineView({ projectId, initial, now }: { projectId: string; initial: ProjectDashboard; now: number }) {
  const data = useProjectDashboard(projectId, initial);
  const start = new Date(data.project.startDate);
  const end = new Date(data.project.targetDate);
  const groups = groupTimeline(data.milestones, data.timelineTasks);
  const today = timelinePercent(new Date(now), start, end);
  const showToday = now >= start.getTime() && now <= end.getTime();

  if (groups.length === 0) {
    return (
      <main>
        <p className="text-muted-foreground">Nothing to show yet. Milestones and tasks appear here once they&apos;re added.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-3">
      <ul aria-label="What the bars mean" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-full bg-primary" />Done</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-full border border-primary bg-tint" />Not done yet</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-full bg-brand-red" />Overdue</li>
        <li className="flex items-center gap-1.5"><Flag aria-hidden className="size-3.5 fill-primary text-primary" />Milestone due date</li>
      </ul>

      <div className="rounded-xl border border-border p-2 [--gap:0px] [--names:0px] md:[--gap:1rem] md:[--names:18rem] lg:[--names:22rem]">
        <div className="relative pt-5">
          {showToday && (
            // Lines up with the bars: past the name column and gap, inside the rows' 0.5rem padding.
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-0 z-0 w-0.5 bg-brand-red"
              style={{ left: `calc(var(--names) + var(--gap) + 0.5rem + (100% - var(--names) - var(--gap) - 1rem) * ${today / 100})` }}
            >
              <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-sm bg-brand-red px-1 text-[0.65rem] font-bold whitespace-nowrap text-white">
                Today
              </span>
            </div>
          )}
          <div className={cn(ROW_GRID, "relative z-[1] px-2 pt-1 pb-2")}>
            <span className="hidden text-xs font-semibold text-muted-foreground md:block">Task and deadline</span>
            <div aria-hidden className="relative h-6 text-xs text-muted-foreground">
              {TICKS.map((tick) => (
                <span
                  key={tick}
                  className={cn("absolute top-1 whitespace-nowrap tabular-nums", tick === 1 ? "-translate-x-full" : tick > 0 && "-translate-x-1/2")}
                  style={{ left: `${tick * 100}%` }}
                >
                  {formatDateKeyShort(manilaDateKey(new Date(start.getTime() + tick * (end.getTime() - start.getTime()))))}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-[1] flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.milestone?.id ?? "none"} className="flex flex-col gap-0.5">
                {group.milestone ? (
                  <MilestoneHeader milestone={group.milestone} start={start} end={end} />
                ) : (
                  <h2 className="rounded-md bg-muted px-2 py-1.5 text-sm font-bold">No milestone</h2>
                )}
                {group.tasks.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground md:pl-7">No tasks linked yet.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {group.tasks.map((task) => (
                      <TaskRow key={task.id} projectId={projectId} task={task} start={start} end={end} />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
