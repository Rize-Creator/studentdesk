import type { TaskStatus } from "./transitions";

// Red is left out on purpose: it means overdue or high priority everywhere else.
export const STAGE_STYLES: Record<TaskStatus, { badge: string; icon: string; edge: string }> = {
  BACKLOG: { badge: "bg-slate-200 text-slate-800", icon: "text-slate-600", edge: "border-slate-400" },
  TODO: { badge: "bg-sky-100 text-sky-800", icon: "text-sky-600", edge: "border-sky-500" },
  IN_PROGRESS: { badge: "bg-amber-100 text-amber-900", icon: "text-amber-600", edge: "border-amber-500" },
  REVIEW: { badge: "bg-violet-100 text-violet-800", icon: "text-violet-600", edge: "border-violet-500" },
  DONE: { badge: "bg-emerald-100 text-emerald-800", icon: "text-emerald-600", edge: "border-emerald-500" },
};
