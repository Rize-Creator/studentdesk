import { timelinePercent } from "./calculations";

// Keeps a task created and due on the same day visible.
const MIN_WIDTH = 1.5;

const round = (value: number) => Number(value.toFixed(4));

export function barGeometry(createdAt: Date, deadline: Date, start: Date, end: Date) {
  const right = timelinePercent(deadline, start, end);
  // A task added after its deadline has no real span, so it's drawn up to the deadline.
  const from = Math.min(timelinePercent(createdAt, start, end), right);
  const width = Math.max(right - from, MIN_WIDTH);
  return { left: round(Math.max(0, Math.min(from, 100 - width))), width: round(width) };
}

export function groupTimeline<
  M extends { id: string; dueDate: string },
  T extends { milestoneId: string | null; deadline: string },
>(milestones: M[], tasks: T[]) {
  const byDeadline = (a: T, b: T) => Date.parse(a.deadline) - Date.parse(b.deadline);
  const groups: { milestone: M | null; tasks: T[] }[] = [...milestones]
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate))
    .map((milestone) => ({
      milestone,
      tasks: tasks.filter((task) => task.milestoneId === milestone.id).sort(byDeadline),
    }));

  const ungrouped = tasks.filter((task) => task.milestoneId === null).sort(byDeadline);
  if (ungrouped.length > 0) groups.push({ milestone: null, tasks: ungrouped });
  return groups;
}
