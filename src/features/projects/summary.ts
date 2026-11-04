import type { TaskStatus } from "@/features/tasks/transitions";
import { manilaDateKey } from "@/lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;

function calendarDaysBetween(from: Date, to: Date): number {
  const start = Date.parse(`${manilaDateKey(from)}T00:00:00.000Z`);
  const end = Date.parse(`${manilaDateKey(to)}T00:00:00.000Z`);
  return Math.round((end - start) / DAY_MS);
}

export function summarizeTasks(tasks: { status: TaskStatus; deadline: Date }[], targetDate: Date, now: Date) {
  const done = tasks.filter((task) => task.status === "DONE").length;
  return {
    total: tasks.length,
    done,
    percent: tasks.length === 0 ? 0 : Math.round((done * 100) / tasks.length),
    inReview: tasks.filter((task) => task.status === "REVIEW").length,
    overdue: tasks.filter((task) => task.status !== "DONE" && task.deadline.getTime() < now.getTime()).length,
    daysLeft: Math.max(0, calendarDaysBetween(now, targetDate)),
  };
}
