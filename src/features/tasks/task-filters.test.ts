import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterTasks, hasActiveFilters, type FilterableTask } from "./task-filters";

const now = new Date("2026-11-05T02:00:00.000Z");
const past = new Date("2026-11-01T15:59:59.999Z");
const future = new Date("2026-11-20T15:59:59.999Z");

const task = (id: string, overrides: Partial<FilterableTask> = {}): FilterableTask => ({
  id,
  title: `Task ${id}`,
  status: "TODO",
  priority: "MEDIUM",
  categoryId: "logistics",
  assigneeId: "juan",
  deadline: future,
  ...overrides,
});

const ids = (rows: FilterableTask[]) => rows.map((row) => row.id);
const run = (rows: FilterableTask[], filters: Partial<typeof EMPTY_FILTERS>) =>
  ids(filterTasks(rows, { ...EMPTY_FILTERS, ...filters }, "juan", now));

describe("filterTasks", () => {
  it("returns everything with no filters, keeping the order", () => {
    expect(run([task("a"), task("b")], {})).toEqual(["a", "b"]);
  });

  it("searches titles without caring about case or spaces around the text", () => {
    const rows = [task("a", { title: "Book the sound system" }), task("b", { title: "Design poster" })];
    expect(run(rows, { search: "  SOUND " })).toEqual(["a"]);
  });

  it("finds Filipino names with or without the ñ", () => {
    const rows = [task("a", { title: "Ipadala kay Bañas" }), task("b", { title: "Design poster" })];
    expect(run(rows, { search: "banas" })).toEqual(["a"]);
    expect(run(rows, { search: "bañas" })).toEqual(["a"]);
  });

  it("filters by stage, category and priority", () => {
    const rows = [
      task("a", { status: "DONE" }),
      task("b", { categoryId: "finance" }),
      task("c", { priority: "HIGH" }),
    ];
    expect(run(rows, { status: "DONE" })).toEqual(["a"]);
    expect(run(rows, { categoryId: "finance" })).toEqual(["b"]);
    expect(run(rows, { priority: "HIGH" })).toEqual(["c"]);
  });

  it("filters by a person, by me, and by unassigned", () => {
    const rows = [task("mine"), task("anas", { assigneeId: "ana" }), task("nobody", { assigneeId: null })];
    expect(run(rows, { assignee: "ana" })).toEqual(["anas"]);
    expect(run(rows, { assignee: "me" })).toEqual(["mine"]);
    expect(run(rows, { assignee: "none" })).toEqual(["nobody"]);
  });

  it("shows only unfinished late tasks when overdue is on", () => {
    const rows = [
      task("late", { deadline: past }),
      task("finished", { deadline: past, status: "DONE" }),
      task("upcoming"),
    ];
    expect(run(rows, { overdueOnly: true })).toEqual(["late"]);
  });

  it("combines filters", () => {
    const rows = [
      task("match", { priority: "HIGH", categoryId: "finance" }),
      task("wrong-priority", { categoryId: "finance" }),
      task("wrong-category", { priority: "HIGH" }),
    ];
    expect(run(rows, { priority: "HIGH", categoryId: "finance" })).toEqual(["match"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(run([task("a")], { search: "zzz" })).toEqual([]);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is false when the search is only spaces", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "   " })).toBe(false);
  });

  it("is true when anything is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: "DONE" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, overdueOnly: true })).toBe(true);
  });
});
