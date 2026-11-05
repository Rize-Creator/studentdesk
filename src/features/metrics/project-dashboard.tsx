"use client";

import { CalendarDays, Flag } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryChart, ProgressChart, StageChart } from "@/features/metrics/dashboard-charts";
import type { ProjectDashboard } from "@/features/metrics/queries";
import { ReadinessBadge } from "@/features/metrics/readiness-badge";
import { useProjectDashboard } from "@/features/metrics/use-dashboard";
import { SendReportButton } from "@/features/notifications/send-report-button";
import { WORKLOAD_LIMIT } from "@/features/recommendations/engine";
import { formatManilaDate } from "@/lib/dates";
import { can, canViewHistory, type ProjectRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function ReadinessPanel({ readiness }: { readiness: ProjectDashboard["readiness"] }) {
  const completion = Math.round(readiness.completion);
  const expected = Math.round(readiness.expected);
  return (
    <section aria-label="Readiness" className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <ReadinessBadge status={readiness.status} className="text-base" />
        {readiness.reasons.length > 0 && <p className="text-sm text-muted-foreground">{readiness.reasons.join(", ")}</p>}
      </div>
      {readiness.status !== "NO_TASKS" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm">
            <span className="font-bold tabular-nums">{completion}%</span> of tasks done.{" "}
            <span className="text-muted-foreground">By today, about {expected}% should be done.</span>
          </p>
          <div aria-hidden className="relative h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
            <div className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground" style={{ left: `${expected}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

function OverdueList({ projectId, tasks }: { projectId: string; tasks: ProjectDashboard["overdue"] }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <h2 className="text-sm font-bold">Overdue tasks ({tasks.length})</h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is overdue.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Link href={`/projects/${projectId}/board?task=${task.id}`} className="min-w-0 flex-1 basis-40 font-semibold hover:text-primary hover:underline">
                {task.title}
              </Link>
              <span className="text-xs text-muted-foreground">{task.assigneeName ?? "Unassigned"}</span>
              <span className="flex items-center gap-1 text-xs font-bold text-brand-red">
                <CalendarDays aria-hidden className="size-3.5" />
                {formatManilaDate(new Date(task.deadline))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MilestoneList({ milestones }: { milestones: ProjectDashboard["milestones"] }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <h2 className="text-sm font-bold">Milestones</h2>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Flag aria-hidden className={cn("size-4 shrink-0", milestone.overdue ? "text-brand-red" : "text-primary")} />
              <span className="min-w-0 flex-1 basis-32 font-semibold">{milestone.title}</span>
              <span className="text-xs text-muted-foreground">{milestone.done} of {milestone.total} tasks</span>
              <span className={cn("text-xs tabular-nums", milestone.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
                {milestone.complete ? "Complete" : milestone.overdue ? "Overdue" : formatManilaDate(new Date(milestone.dueDate))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkloadTable({
  projectId,
  rows,
  viewerId,
  role,
}: {
  projectId: string;
  rows: ProjectDashboard["workload"];
  viewerId: string;
  role: ProjectRole;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <h2 className="text-sm font-bold">Member workload in this project</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead className="text-right">Active</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-right">Done</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.userId}>
              <TableCell className="font-semibold">
                {canViewHistory(role, viewerId, row.userId) ? (
                  <Link href={`/projects/${projectId}/members/${row.userId}`} className="underline-offset-4 hover:underline">{row.name}</Link>
                ) : (
                  row.name
                )}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", row.active >= WORKLOAD_LIMIT && "font-bold text-brand-red")}>{row.active}</TableCell>
              <TableCell className={cn("text-right tabular-nums", row.overdue > 0 && "font-bold text-brand-red")}>{row.overdue}</TableCell>
              <TableCell className="text-right tabular-nums">{row.done}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function ProjectDashboardView({
  projectId,
  initial,
  viewerId,
  role,
}: {
  projectId: string;
  initial: ProjectDashboard;
  viewerId: string;
  role: ProjectRole;
}) {
  const data = useProjectDashboard(projectId, initial);
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {data.project.status === "ARCHIVED" ? "This project is archived." : "Updates automatically every 15 seconds"}
        </p>
        {data.project.status === "ACTIVE" && can(role, "report:send") && <SendReportButton projectId={projectId} />}
      </div>
      <ReadinessPanel readiness={data.readiness} />
      <div className="grid gap-4 lg:grid-cols-2">
        <StageChart byStatus={data.byStatus} />
        <CategoryChart byCategory={data.byCategory} />
      </div>
      <ProgressChart progress={data.progress} total={data.total} />
      <div className="grid gap-4 lg:grid-cols-2">
        <OverdueList projectId={projectId} tasks={data.overdue} />
        <MilestoneList milestones={data.milestones} />
      </div>
      <WorkloadTable projectId={projectId} rows={data.workload} viewerId={viewerId} role={role} />
    </main>
  );
}
