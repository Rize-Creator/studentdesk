"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectDashboard } from "@/features/metrics/queries";
import { STATUS_LABELS, TASK_STATUSES } from "@/features/tasks/transitions";
import { formatDateKeyShort } from "@/lib/dates";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

function TooltipCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">{children}</div>;
}

// Shows a card for the hovered row. Recharts types each row loosely, so T names its shape here.
function tooltipFor<T>(render: (row: T) => React.ReactNode) {
  function ChartTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload?: T }[] }) {
    const row = payload?.[0]?.payload;
    return active && row ? <TooltipCard>{render(row)}</TooltipCard> : null;
  }
  return ChartTooltip;
}

function Figure({ title, summary, children }: { title: string; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-4">
      <figcaption className="text-sm font-bold">{title}</figcaption>
      {children}
      <div className="sr-only">{summary}</div>
    </figure>
  );
}

export function StageChart({ byStatus }: { byStatus: ProjectDashboard["byStatus"] }) {
  const rows = TASK_STATUSES.map((status) => ({ name: STATUS_LABELS[status], count: byStatus[status] }));
  return (
    <Figure
      title="Tasks per stage"
      summary={<ul>{rows.map((row) => <li key={row.name}>{row.name}: {row.count}</li>)}</ul>}
    >
      <div aria-hidden className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 20, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={0} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={tooltipFor<(typeof rows)[number]>((row) => <>{row.name}: {row.count} tasks</>)}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Figure>
  );
}

export function CategoryChart({ byCategory }: { byCategory: ProjectDashboard["byCategory"] }) {
  const rows = byCategory.map((row) => ({
    name: row.name,
    done: row.done,
    remaining: row.total - row.done,
    label: `${row.done} of ${row.total}`,
  }));
  return (
    <Figure
      title="Tasks done per category"
      summary={<ul>{rows.map((row) => <li key={row.name}>{row.name}: {row.label} done</li>)}</ul>}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <div aria-hidden className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
              <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="name" width={100} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={tooltipFor<(typeof rows)[number]>((row) => <>{row.name}: {row.label} done</>)}
              />
              <Bar dataKey="done" stackId="tasks" fill="var(--primary)" stroke="var(--background)" strokeWidth={2} maxBarSize={18} isAnimationActive={false} />
              <Bar dataKey="remaining" stackId="tasks" fill="var(--muted)" stroke="var(--background)" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                <LabelList dataKey="label" position="right" fill="var(--foreground)" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Figure>
  );
}

export function ProgressChart({ progress, total }: { progress: ProjectDashboard["progress"]; total: number }) {
  const rows = progress.map((row) => ({ ...row, label: formatDateKeyShort(row.date) }));
  const latest = rows.at(-1)?.done ?? 0;
  return (
    <Figure title="Tasks done over time" summary={<p>{latest} of {total} tasks done so far.</p>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">This project hasn&apos;t started yet.</p>
      ) : (
        <div aria-hidden className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 18, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={40} />
              <YAxis allowDecimals={false} domain={[0, Math.max(total, 1)]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              {total > 0 && (
                <ReferenceLine
                  y={total}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: `All ${total} tasks`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 12, dy: -16 }}
                />
              )}
              <Tooltip
                cursor={{ stroke: "var(--muted-foreground)" }}
                content={tooltipFor<(typeof rows)[number]>((row) => <>{row.label}: {row.done} tasks done</>)}
              />
              <Line
                dataKey="done"
                type="monotone"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Figure>
  );
}
