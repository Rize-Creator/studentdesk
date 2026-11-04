import { TASK_STATUSES, type TaskStatus } from "@/features/tasks/transitions";
import { addDaysToKey, manilaDateKey } from "@/lib/dates";

export type MetricTask = { status: TaskStatus; priority: "LOW" | "MEDIUM" | "HIGH"; deadline: Date };
export type MetricMilestone = { dueDate: Date; completedAt: Date | null; taskStatuses: TaskStatus[] };
export type ReadinessStatus = "NO_TASKS" | "ON_TRACK" | "AT_RISK" | "BEHIND";
export type Readiness = {
  status: ReadinessStatus;
  completion: number;
  expected: number;
  overdueTasks: number;
  reasons: string[];
};

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  NO_TASKS: "No tasks yet",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  BEHIND: "Behind",
};

// Draft thresholds, to confirm with advisers in Phase 8.
const AT_RISK_POINTS = 10;
const BEHIND_POINTS = 25;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function isOverdue(task: Pick<MetricTask, "status" | "deadline">, now: Date): boolean {
  return task.status !== "DONE" && task.deadline.getTime() < now.getTime();
}

export function isMilestoneComplete(milestone: MetricMilestone): boolean {
  if (milestone.completedAt) return true;
  return milestone.taskStatuses.length > 0 && milestone.taskStatuses.every((status) => status === "DONE");
}

export function isMilestoneOverdue(milestone: MetricMilestone, now: Date): boolean {
  return !isMilestoneComplete(milestone) && milestone.dueDate.getTime() < now.getTime();
}

export function timelinePercent(date: Date, start: Date, end: Date): number {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return date.getTime() >= end.getTime() ? 100 : 0;
  return Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / span) * 100));
}

export function computeReadiness(input: {
  tasks: MetricTask[];
  milestones: MetricMilestone[];
  startDate: Date;
  targetDate: Date;
  now: Date;
}): Readiness {
  const { tasks, milestones, startDate, targetDate, now } = input;
  const expected = timelinePercent(now, startDate, targetDate);
  if (tasks.length === 0) {
    return { status: "NO_TASKS", completion: 0, expected, overdueTasks: 0, reasons: [] };
  }

  const done = tasks.filter((task) => task.status === "DONE").length;
  const completion = (done * 100) / tasks.length;
  // Rounded so that float maths can't move a project across a threshold.
  const pointsBehind = Number((expected - completion).toFixed(6));
  const overdue = tasks.filter((task) => isOverdue(task, now));
  const overdueHigh = overdue.filter((task) => task.priority === "HIGH").length;
  const overdueMilestones = milestones.filter((milestone) => isMilestoneOverdue(milestone, now)).length;

  const reasons: string[] = [];
  if (overdueHigh > 0) reasons.push(`${plural(overdueHigh, "overdue high-priority task")}`);
  if (overdueMilestones > 0) reasons.push(`${plural(overdueMilestones, "overdue milestone")}`);
  if (overdue.length > overdueHigh) {
    reasons.push(plural(overdue.length - overdueHigh, overdueHigh > 0 ? "other overdue task" : "overdue task"));
  }
  if (pointsBehind >= AT_RISK_POINTS) reasons.push(`${Math.round(pointsBehind)} points behind schedule`);

  let status: ReadinessStatus = "ON_TRACK";
  if (overdueHigh > 0 || overdueMilestones > 0 || pointsBehind >= BEHIND_POINTS) status = "BEHIND";
  else if (overdue.length > 0 || pointsBehind >= AT_RISK_POINTS) status = "AT_RISK";

  return { status, completion, expected, overdueTasks: overdue.length, reasons };
}

export function countByStatus(tasks: { status: TaskStatus }[]): Record<TaskStatus, number> {
  const counts = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<TaskStatus, number>;
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}

export function countByCategory(tasks: { categoryName: string; status: TaskStatus }[]) {
  const rows = new Map<string, { name: string; total: number; done: number }>();
  for (const task of tasks) {
    const row = rows.get(task.categoryName) ?? { name: task.categoryName, total: 0, done: 0 };
    row.total += 1;
    if (task.status === "DONE") row.done += 1;
    rows.set(task.categoryName, row);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function progressOverTime(events: { at: Date; delta: 1 | -1 }[], startKey: string, endKey: string) {
  const perDay = new Map<string, number>();
  for (const event of events) {
    const key = manilaDateKey(event.at);
    perDay.set(key, (perDay.get(key) ?? 0) + event.delta);
  }
  let running = [...perDay.entries()]
    .filter(([key]) => key < startKey)
    .reduce((sum, [, delta]) => sum + delta, 0);

  const series: { date: string; done: number }[] = [];
  for (let key = startKey; key <= endKey; key = addDaysToKey(key, 1)) {
    running += perDay.get(key) ?? 0;
    series.push({ date: key, done: running });
  }
  return series;
}

const READINESS_ORDER: Record<ReadinessStatus, number> = { BEHIND: 0, AT_RISK: 1, ON_TRACK: 2, NO_TASKS: 3 };

export function sortByReadiness<T extends { readiness: { status: ReadinessStatus } }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => READINESS_ORDER[a.readiness.status] - READINESS_ORDER[b.readiness.status]);
}

// Gives each item the first lane where it won't overlap, so timeline labels stay readable.
export function assignLanes(positions: number[], minGap: number): number[] {
  const laneEnds: number[] = [];
  const lanes = new Array<number>(positions.length);
  const order = positions.map((position, index) => ({ position, index })).sort((a, b) => a.position - b.position);
  for (const { position, index } of order) {
    let lane = laneEnds.findIndex((end) => position - end >= minGap);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = position;
    lanes[index] = lane;
  }
  return lanes;
}
