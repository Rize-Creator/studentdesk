import type { ProjectRole } from "@/lib/permissions";
import { calendarDaysBetween } from "./summary";

type MilestoneCounts = { markedComplete: boolean; done: number; total: number };

export function dueLabel(dueDate: Date, now: Date): { text: string; overdue: boolean } {
  const days = calendarDaysBetween(now, dueDate);
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due in ${days} days`, overdue: false };
}

export function isRowComplete({ markedComplete, done, total }: MilestoneCounts): boolean {
  return markedComplete || (total > 0 && done === total);
}

// When every task is done, the milestone stays complete whatever the button says, so the button would do nothing.
export function canToggleComplete({ done, total }: { done: number; total: number }): boolean {
  return total === 0 || done < total;
}

export function milestoneProgress(rows: MilestoneCounts[]) {
  const complete = rows.filter(isRowComplete).length;
  return { complete, total: rows.length, percent: rows.length === 0 ? 0 : Math.round((complete * 100) / rows.length) };
}

export function teamCounts(roles: ProjectRole[]): string {
  const part = (role: ProjectRole, word: string) => {
    const count = roles.filter((value) => value === role).length;
    return count === 0 ? null : `${count} ${word}${count === 1 ? "" : "s"}`;
  };
  return [part("LEAD", "lead"), part("MEMBER", "member"), part("ADVISER", "adviser")].filter(Boolean).join(", ");
}
