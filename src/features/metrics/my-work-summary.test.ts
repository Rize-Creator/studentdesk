import { describe, expect, it } from "vitest";
import { greetingFor, summarizeWork } from "./my-work-summary";

describe("greetingFor", () => {
  it("uses Manila time, whatever time zone the server runs in", () => {
    expect(greetingFor(new Date("2026-11-06T01:00:00.000Z"))).toBe("Good morning"); // 9 AM
    expect(greetingFor(new Date("2026-11-06T05:00:00.000Z"))).toBe("Good afternoon"); // 1 PM
    expect(greetingFor(new Date("2026-11-06T12:00:00.000Z"))).toBe("Good evening"); // 8 PM
  });

  it("switches at noon and 6 PM", () => {
    expect(greetingFor(new Date("2026-11-06T03:59:00.000Z"))).toBe("Good morning"); // 11:59 AM
    expect(greetingFor(new Date("2026-11-06T04:00:00.000Z"))).toBe("Good afternoon"); // 12 noon
    expect(greetingFor(new Date("2026-11-06T10:00:00.000Z"))).toBe("Good evening"); // 6 PM
  });

  it("doesn't say good morning in the middle of the night", () => {
    expect(greetingFor(new Date("2026-11-06T17:00:00.000Z"))).toBe("Good evening"); // 1 AM
    expect(greetingFor(new Date("2026-11-06T21:00:00.000Z"))).toBe("Good morning"); // 5 AM
  });
});

describe("summarizeWork", () => {
  const task = (status: string, overdue: boolean, dueSoon: boolean) => ({ status, overdue, dueSoon });

  it("counts each task under the right number", () => {
    const tasks = [
      task("IN_PROGRESS", true, true),
      task("TODO", false, true),
      task("REVIEW", false, true),
      task("TODO", false, false),
    ];
    expect(summarizeWork(tasks, 6)).toEqual({ overdue: 1, dueSoon: 2, inReview: 1, finished: 6 });
  });

  it("doesn't count an overdue task as due soon, but still counts it as in Review", () => {
    expect(summarizeWork([task("REVIEW", true, true)], 0)).toEqual({ overdue: 1, dueSoon: 0, inReview: 1, finished: 0 });
  });

  it("is all zeros with no tasks", () => {
    expect(summarizeWork([], 0)).toEqual({ overdue: 0, dueSoon: 0, inReview: 0, finished: 0 });
  });
});
