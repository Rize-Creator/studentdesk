import { describe, expect, it } from "vitest";
import { barGeometry, groupTimeline } from "./timeline-rows";

const start = new Date("2026-01-01T00:00:00.000Z");
const end = new Date("2026-01-11T00:00:00.000Z");
const day = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString();

describe("barGeometry", () => {
  it("runs from the created date to the deadline", () => {
    expect(barGeometry(new Date(day(2)), new Date(day(6)), start, end)).toEqual({ left: 10, width: 40 });
  });

  it("starts at the left edge when created before the project starts", () => {
    expect(barGeometry(new Date("2025-12-01T00:00:00.000Z"), new Date(day(6)), start, end)).toEqual({ left: 0, width: 50 });
  });

  it("stops at the right edge when the deadline is after the project ends", () => {
    expect(barGeometry(new Date(day(6)), new Date("2026-02-01T00:00:00.000Z"), start, end)).toEqual({ left: 50, width: 50 });
  });

  it("keeps a visible bar when created and due on the same day", () => {
    const { width } = barGeometry(new Date(day(6)), new Date(day(6)), start, end);
    expect(width).toBeGreaterThan(0);
  });

  it("ends at the deadline when a task was added after its deadline", () => {
    const { left, width } = barGeometry(new Date(day(8)), new Date(day(4)), start, end);
    expect(left).toBe(30);
    expect(width).toBeGreaterThan(0);
  });

  it("keeps a short bar inside the track at the right edge", () => {
    const { left, width } = barGeometry(new Date(day(11)), new Date(day(11)), start, end);
    expect(left + width).toBeLessThanOrEqual(100);
  });
});

describe("groupTimeline", () => {
  const milestone = (id: string, dueDate: string) => ({ id, dueDate });
  const task = (id: string, milestoneId: string | null, deadline: string) => ({ id, milestoneId, deadline });

  it("puts tasks under their milestones, with milestones in date order", () => {
    const groups = groupTimeline(
      [milestone("late", day(9)), milestone("early", day(3))],
      [task("a", "late", day(8)), task("b", "early", day(2))],
    );
    expect(groups.map((g) => [g.milestone?.id, g.tasks.map((t) => t.id)])).toEqual([
      ["early", ["b"]],
      ["late", ["a"]],
    ]);
  });

  it("orders tasks by deadline within a group", () => {
    const [group] = groupTimeline([milestone("m", day(9))], [task("later", "m", day(8)), task("sooner", "m", day(2))]);
    expect(group.tasks.map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("puts tasks with no milestone in a last group", () => {
    const groups = groupTimeline([milestone("m", day(9))], [task("a", null, day(1)), task("b", "m", day(8))]);
    expect(groups.map((g) => g.milestone?.id ?? null)).toEqual(["m", null]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["a"]);
  });

  it("keeps a milestone with no tasks", () => {
    expect(groupTimeline([milestone("m", day(9))], [])).toEqual([{ milestone: milestone("m", day(9)), tasks: [] }]);
  });

  it("leaves out the last group when every task has a milestone", () => {
    const groups = groupTimeline([milestone("m", day(9))], [task("a", "m", day(1))]);
    expect(groups).toHaveLength(1);
  });

  it("returns nothing when there's nothing to show", () => {
    expect(groupTimeline([], [])).toEqual([]);
  });
});
