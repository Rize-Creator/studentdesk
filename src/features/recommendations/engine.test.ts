import { describe, expect, it } from "vitest";
import { peopleAtLimit, rankCandidates, type CandidateRecord } from "./engine";

const task = { categoryName: "Logistics" };

const person = (overrides: Partial<CandidateRecord> & { name: string }): CandidateRecord => ({
  userId: overrides.name.toLowerCase(),
  doneInCategory: 0,
  doneTotal: 0,
  doneOnTime: 0,
  activeTasks: 0,
  categoryRoles: [],
  ...overrides,
});

describe("rankCandidates", () => {
  it("matches the worked example in the spec", () => {
    const [top] = rankCandidates(task, [
      person({
        name: "Juan",
        doneInCategory: 6,
        doneTotal: 6,
        doneOnTime: 5,
        activeTasks: 1,
        categoryRoles: ["Logistics Head, Foundation Day 2025 (sample)"],
      }),
    ]);
    expect(top.score).toBeCloseTo(0.865);
    expect(top.percent).toBe(87);
    expect(top.reasons).toEqual([
      "Completed 6 Logistics tasks",
      "5 of 6 tasks on time",
      "1 active task",
      "Logistics Head, Foundation Day 2025 (sample)",
    ]);
  });

  it("returns at most three people, ranked from 1", () => {
    const result = rankCandidates(task, ["A", "B", "C", "D"].map((name) => person({ name })));
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("scores experience against the highest count in the group", () => {
    const result = rankCandidates(task, [
      person({ name: "More", doneInCategory: 4, doneTotal: 4, doneOnTime: 4 }),
      person({ name: "Less", doneInCategory: 2, doneTotal: 4, doneOnTime: 4 }),
    ]);
    expect(result[0].name).toBe("More");
    expect(result[0].score - result[1].score).toBeCloseTo(0.3 * 0.5);
  });

  it("doesn't let one on-time task beat a long record", () => {
    const result = rankCandidates(task, [
      person({ name: "One", doneTotal: 1, doneOnTime: 1 }),
      person({ name: "Long", doneTotal: 20, doneOnTime: 19 }),
    ]);
    expect(result[0].name).toBe("Long");
  });

  it("ranks anyone at the workload limit below everyone under it, and warns", () => {
    const result = rankCandidates(task, [
      person({ name: "Busy", doneInCategory: 10, doneTotal: 10, doneOnTime: 10, activeTasks: 5, categoryRoles: ["Head, X"] }),
      person({ name: "Free" }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["Free", "Busy"]);
    expect(result[1].atLimit).toBe(true);
    expect(result[1].reasons).toContain("Heavy workload: 5 active tasks");
  });

  it("doesn't flag someone just under the limit", () => {
    const [only] = rankCandidates(task, [person({ name: "Nearly", activeTasks: 4 })]);
    expect(only.atLimit).toBe(false);
  });

  it("keeps availability at 0 above the limit", () => {
    const [only] = rankCandidates(task, [person({ name: "Over", activeTasks: 9 })]);
    expect(only.score).toBeCloseTo(0.25 * 0.5);
  });

  it("breaks ties by fewer active tasks, then by name", () => {
    const sameScore = rankCandidates(task, [person({ name: "Zed" }), person({ name: "Abe" })]);
    expect(sameScore.map((r) => r.name)).toEqual(["Abe", "Zed"]);
  });

  // Review Focus 5: thin data.
  it("returns nothing when there are no candidates", () => {
    expect(rankCandidates(task, [])).toEqual([]);
  });

  it("works with one candidate and no history anywhere", () => {
    const [only] = rankCandidates(task, [person({ name: "New" })]);
    expect(only.score).toBeCloseTo(0.25 * 0.5 + 0.3);
    expect(only.reasons).toEqual(["No task history yet", "No active tasks"]);
  });

  it("still ranks when everyone is at the limit", () => {
    const result = rankCandidates(task, [
      person({ name: "A", activeTasks: 5 }),
      person({ name: "B", activeTasks: 6, doneInCategory: 3, doneTotal: 3, doneOnTime: 3 }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["B", "A"]);
    expect(result.every((r) => r.atLimit)).toBe(true);
  });

  it("says when someone has history but none in this category", () => {
    const [only] = rankCandidates(task, [person({ name: "Other", doneTotal: 2, doneOnTime: 1 })]);
    expect(only.reasons[0]).toBe("No Logistics tasks yet");
    expect(only.reasons[1]).toBe("1 of 2 tasks on time");
  });
});

describe("peopleAtLimit", () => {
  it("lists only people at or over the limit", () => {
    const result = peopleAtLimit([
      person({ name: "Busy", activeTasks: 5 }),
      person({ name: "Nearly", activeTasks: 4 }),
    ]);
    expect(result).toEqual([{ userId: "busy", name: "Busy", activeTasks: 5 }]);
  });
});
