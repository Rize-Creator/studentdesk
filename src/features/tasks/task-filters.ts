import type { TaskStatus } from "./transitions";

export type FilterableTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "LOW" | "MEDIUM" | "HIGH";
  categoryId: string;
  assigneeId: string | null;
  deadline: Date;
};

export type TaskFilters = {
  search: string;
  status: TaskStatus | "";
  categoryId: string;
  priority: FilterableTask["priority"] | "";
  // A user ID, or "me" or "none".
  assignee: string;
  overdueOnly: boolean;
};

export const EMPTY_FILTERS: TaskFilters = {
  search: "",
  status: "",
  categoryId: "",
  priority: "",
  assignee: "",
  overdueOnly: false,
};

// Lets "banas" find "Bañas", since people often type names without the ñ.
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "" ||
    filters.categoryId !== "" ||
    filters.priority !== "" ||
    filters.assignee !== "" ||
    filters.overdueOnly
  );
}

export function filterTasks<T extends FilterableTask>(tasks: T[], filters: TaskFilters, viewerId: string, now: Date): T[] {
  const search = normalize(filters.search);
  return tasks.filter((task) => {
    if (search && !normalize(task.title).includes(search)) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.categoryId && task.categoryId !== filters.categoryId) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignee === "me" && task.assigneeId !== viewerId) return false;
    if (filters.assignee === "none" && task.assigneeId !== null) return false;
    if (filters.assignee && filters.assignee !== "me" && filters.assignee !== "none" && task.assigneeId !== filters.assignee) return false;
    if (filters.overdueOnly && (task.status === "DONE" || task.deadline.getTime() >= now.getTime())) return false;
    return true;
  });
}
