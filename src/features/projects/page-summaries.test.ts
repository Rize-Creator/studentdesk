import { describe, expect, it } from "vitest";
import { canToggleComplete, dueLabel, isRowComplete, milestoneProgress, teamCounts } from "./page-summaries";

describe("dueLabel", () => {
  // 10 AM on Nov 6 in Manila.
  const now = new Date("2026-11-06T02:00:00.000Z");
  const endOfManilaDay = (key: string) => new Date(`${key}T15:59:59.999Z`);

  it("names today and tomorrow", () => {
    expect(dueLabel(endOfManilaDay("2026-11-06"), now)).toEqual({ text: "Due today", overdue: false });
    expect(dueLabel(endOfManilaDay("2026-11-07"), now)).toEqual({ text: "Due tomorrow", overdue: false });
  });

  it("counts the days left", () => {
    expect(dueLabel(endOfManilaDay("2026-11-11"), now)).toEqual({ text: "Due in 5 days", overdue: false });
  });

  it("counts the days overdue, with the right word for one", () => {
    expect(dueLabel(endOfManilaDay("2026-11-05"), now)).toEqual({ text: "1 day overdue", overdue: true });
    expect(dueLabel(endOfManilaDay("2026-11-03"), now)).toEqual({ text: "3 days overdue", overdue: true });
  });

  it("uses Manila dates, so late evening is still the next day's Due tomorrow", () => {
    const lateEvening = new Date("2026-11-06T15:30:00.000Z"); // 11:30 PM Nov 6 in Manila
    expect(dueLabel(endOfManilaDay("2026-11-07"), lateEvening)).toEqual({ text: "Due tomorrow", overdue: false });
  });
});

describe("isRowComplete", () => {
  it("is complete when marked, or when every task is done", () => {
    expect(isRowComplete({ markedComplete: true, done: 0, total: 3 })).toBe(true);
    expect(isRowComplete({ markedComplete: false, done: 3, total: 3 })).toBe(true);
    expect(isRowComplete({ markedComplete: false, done: 2, total: 3 })).toBe(false);
  });

  it("isn't complete just because it has no tasks", () => {
    expect(isRowComplete({ markedComplete: false, done: 0, total: 0 })).toBe(false);
  });
});

describe("canToggleComplete", () => {
  it("hides the button when finished tasks already make it complete", () => {
    expect(canToggleComplete({ done: 3, total: 3 })).toBe(false);
  });

  it("shows it while tasks are unfinished, or there are no tasks", () => {
    expect(canToggleComplete({ done: 2, total: 3 })).toBe(true);
    expect(canToggleComplete({ done: 0, total: 0 })).toBe(true);
  });
});

describe("milestoneProgress", () => {
  it("counts complete milestones", () => {
    const rows = [
      { markedComplete: false, done: 3, total: 3 },
      { markedComplete: true, done: 1, total: 3 },
      { markedComplete: false, done: 1, total: 3 },
      { markedComplete: false, done: 0, total: 0 },
    ];
    expect(milestoneProgress(rows)).toEqual({ complete: 2, total: 4, percent: 50 });
  });

  it("is zero with no milestones, without dividing by zero", () => {
    expect(milestoneProgress([])).toEqual({ complete: 0, total: 0, percent: 0 });
  });
});

describe("teamCounts", () => {
  it("uses the right word for one and for many", () => {
    expect(teamCounts(["LEAD", "MEMBER", "MEMBER", "ADVISER"])).toBe("1 lead, 2 members, 1 adviser");
    expect(teamCounts(["LEAD", "LEAD", "MEMBER", "ADVISER", "ADVISER"])).toBe("2 leads, 1 member, 2 advisers");
  });

  it("leaves out roles nobody has", () => {
    expect(teamCounts(["LEAD"])).toBe("1 lead");
  });
});
