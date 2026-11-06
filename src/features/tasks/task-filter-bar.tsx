"use client";

import { Search } from "lucide-react";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_FILTERS, hasActiveFilters, type TaskFilters } from "@/features/tasks/task-filters";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/features/tasks/transitions";

export function TaskFilterBar({
  filters,
  onChange,
  categories,
  people,
  showMine,
  shownCount,
  totalCount,
}: {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  categories: { id: string; name: string }[];
  people: { id: string; name: string }[];
  showMine: boolean;
  shownCount: number;
  totalCount: number;
}) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });
  const active = hasActiveFilters(filters);

  return (
    <section aria-label="Filter tasks" className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-3 xl:grid-cols-[minmax(12rem,2fr)_repeat(4,minmax(9rem,1fr))]">
        <Field id="filter-search" label="Search" className="col-span-full xl:col-span-1">
          <div className="relative">
            <Search aria-hidden className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              id="filter-search"
              type="search"
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Task name"
              className="bg-card pl-8"
            />
          </div>
        </Field>
        <Field id="filter-stage" label="Stage">
          <select id="filter-stage" className={selectClass} value={filters.status} onChange={(e) => set({ status: e.target.value as TaskStatus | "" })}>
            <option value="">All stages</option>
            {TASK_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
        </Field>
        <Field id="filter-category" label="Category">
          <select id="filter-category" className={selectClass} value={filters.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field id="filter-priority" label="Priority">
          <select id="filter-priority" className={selectClass} value={filters.priority} onChange={(e) => set({ priority: e.target.value as TaskFilters["priority"] })}>
            <option value="">All priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </Field>
        <Field id="filter-assignee" label="Assignee">
          <select id="filter-assignee" className={selectClass} value={filters.assignee} onChange={(e) => set({ assignee: e.target.value })}>
            <option value="">Everyone</option>
            {showMine && <option value="me">Assigned to me</option>}
            <option value="none">Unassigned</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="-ml-2 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 font-medium transition-colors hover:bg-brand-red/10 hover:text-brand-red focus-within:bg-brand-red/10 focus-within:text-brand-red">
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={(e) => set({ overdueOnly: e.target.checked })}
            className="size-4 cursor-pointer accent-brand-red"
          />
          Overdue only
        </label>
        <p aria-live="polite" className="text-muted-foreground">
          {active ? `Showing ${shownCount} of ${totalCount} tasks` : `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`}
        </p>
        {active && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</Button>
        )}
      </div>
    </section>
  );
}
