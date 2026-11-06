import { MANILA_TZ } from "@/lib/dates";

export function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: MANILA_TZ, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function summarizeWork(tasks: { status: string; overdue: boolean; dueSoon: boolean }[], finished: number) {
  return {
    overdue: tasks.filter((task) => task.overdue).length,
    dueSoon: tasks.filter((task) => !task.overdue && task.dueSoon).length,
    inReview: tasks.filter((task) => task.status === "REVIEW").length,
    finished,
  };
}
