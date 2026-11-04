"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { assignLanes, timelinePercent } from "@/features/metrics/calculations";
import type { ProjectDashboard } from "@/features/metrics/queries";
import { useProjectDashboard } from "@/features/metrics/use-dashboard";
import { STATUS_LABELS } from "@/features/tasks/transitions";
import { formatDateKeyShort, formatManilaDate, manilaDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TICKS = [0, 0.25, 0.5, 0.75, 1];
const LABEL_LANE_PX = 40;
const DOT_LANE_PX = 18;
// A milestone label takes up at most this share of the track's width, at its narrowest.
const LABEL_SHARE_PERCENT = 25;
const DOT_GAP_PERCENT = 1.8;

type Task = ProjectDashboard["timelineTasks"][number];

function dotClass(task: Task) {
  if (task.overdue) return "border-brand-red bg-brand-red";
  if (task.status === "DONE") return "border-primary bg-primary";
  return "border-primary bg-card";
}

export function TimelineView({ projectId, initial, now }: { projectId: string; initial: ProjectDashboard; now: number }) {
  const data = useProjectDashboard(projectId, initial);

  const start = new Date(data.project.startDate);
  const end = new Date(data.project.targetDate);
  const place = (iso: string) => timelinePercent(new Date(iso), start, end);

  const milestones = data.milestones.map((milestone) => ({ ...milestone, at: place(milestone.dueDate) }));
  // Labels near the right edge extend leftward, so lanes are worked out from where each label starts.
  const flipsLeft = (at: number) => at > 100 - LABEL_SHARE_PERCENT;
  const milestoneLanes = assignLanes(
    milestones.map((m) => (flipsLeft(m.at) ? m.at - LABEL_SHARE_PERCENT : m.at)),
    LABEL_SHARE_PERCENT,
  );
  const labelHeight = (Math.max(-1, ...milestoneLanes) + 1) * LABEL_LANE_PX;

  const tasks = data.timelineTasks.map((task) => ({ ...task, at: place(task.deadline) }));
  const taskLanes = assignLanes(tasks.map((t) => t.at), DOT_GAP_PERCENT);
  const dotHeight = (Math.max(0, ...taskLanes) + 1) * DOT_LANE_PX;

  const today = timelinePercent(new Date(now), start, end);
  const showToday = now >= start.getTime() && now <= end.getTime();

  const events = [
    ...data.milestones.map((m) => ({ key: `m-${m.id}`, kind: "milestone" as const, at: m.dueDate, title: m.title, status: m.complete ? "Complete" : m.overdue ? "Overdue" : "Milestone", alert: m.overdue, taskId: null as string | null })),
    ...data.timelineTasks.map((t) => ({ key: `t-${t.id}`, kind: "task" as const, at: t.deadline, title: t.title, status: t.overdue ? "Overdue" : STATUS_LABELS[t.status], alert: t.overdue, taskId: t.id })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <main className="flex flex-col gap-6">
      {events.length === 0 ? (
        <p className="text-muted-foreground">Nothing to show yet. Milestones and task deadlines appear here once they&apos;re added.</p>
      ) : (
        <section aria-hidden className="thin-scroll relative overflow-x-auto rounded-xl border border-border p-4">
          <div className="relative min-w-[44rem]">
            {showToday && (
              <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-brand-red" style={{ left: `${today}%` }}>
                <span className="absolute -top-0.5 left-1 rounded-sm bg-brand-red px-1 text-[0.65rem] font-bold whitespace-nowrap text-white">Today</span>
              </div>
            )}
            <div className="relative mt-5" style={{ height: labelHeight }}>
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  title={milestone.title}
                  className={cn("absolute flex w-44 items-start gap-1 text-xs", flipsLeft(milestone.at) && "-translate-x-full flex-row-reverse text-right")}
                  style={{ left: `${milestone.at}%`, top: milestoneLanes[index] * LABEL_LANE_PX }}
                >
                  <Flag className={cn("mt-0.5 size-3.5 shrink-0", milestone.overdue ? "text-brand-red" : "text-primary")} />
                  <span>
                    <span className="block truncate font-bold">{milestone.title}</span>
                    <span className="block text-muted-foreground">{formatManilaDate(new Date(milestone.dueDate))}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="relative border-b border-border" style={{ height: dotHeight + 8 }}>
              {tasks.map((task, index) => (
                <Link
                  key={task.id}
                  href={`/projects/${projectId}/board?task=${task.id}`}
                  tabIndex={-1}
                  title={`${task.title}, ${formatManilaDate(new Date(task.deadline))}`}
                  className={cn("absolute size-3 -translate-x-1/2 rounded-full border-2 hover:scale-125", dotClass(task))}
                  style={{ left: `${task.at}%`, bottom: 6 + taskLanes[index] * DOT_LANE_PX }}
                />
              ))}
            </div>
            <div className="relative mt-1 h-5 text-xs text-muted-foreground">
              {TICKS.map((tick) => {
                const label = formatDateKeyShort(manilaDateKey(new Date(start.getTime() + tick * (end.getTime() - start.getTime()))));
                return (
                  <span
                    key={tick}
                    className={cn("absolute whitespace-nowrap tabular-nums", tick === 0 ? "" : tick === 1 ? "-translate-x-full" : "-translate-x-1/2")}
                    style={{ left: `${tick * 100}%` }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-primary bg-primary" />Done</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-primary bg-card" />Not done yet</li>
            <li className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-brand-red bg-brand-red" />Overdue</li>
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">All dates</h2>
          <ul className="divide-y divide-border border-y border-border">
            {events.map((event) => (
              <li key={event.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{formatManilaDate(new Date(event.at))}</span>
                {event.kind === "milestone" && <Flag aria-hidden className="size-4 shrink-0 text-primary" />}
                {event.taskId ? (
                  <Link href={`/projects/${projectId}/board?task=${event.taskId}`} className="min-w-0 flex-1 basis-40 hover:text-primary hover:underline">{event.title}</Link>
                ) : (
                  <span className="min-w-0 flex-1 basis-40 font-bold">{event.title}</span>
                )}
                <span className={cn("text-xs", event.alert ? "font-bold text-brand-red" : "text-muted-foreground")}>{event.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
