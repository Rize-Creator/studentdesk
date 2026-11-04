import { describe, expect, it } from "vitest";
import { summarizeTasks } from "./summary";

const now = new Date("2026-11-05T02:00:00.000Z"); // Nov 5, 10 AM in Manila.
const targetDate = new Date("2026-11-20T15:59:59.999Z"); // End of Nov 20 in Manila.
const past = new Date("2026-11-01T15:59:59.999Z");
const future = new Date("2026-11-10T15:59:59.999Z");

describe("summarizeTasks", () => {
  it("counts tasks, progress, reviews and overdue work", () => {
    const summary = summarizeTasks(
      [
        { status: "DONE", deadline: past },
        { status: "REVIEW", deadline: future },
        { status: "TODO", deadline: past },
      ],
      targetDate,
      now,
    );
    expect(summary).toEqual({ total: 3, done: 1, percent: 33, inReview: 1, overdue: 1, daysLeft: 15 });
  });

  it("doesn't count a finished task as overdue", () => {
    expect(summarizeTasks([{ status: "DONE", deadline: past }], targetDate, now).overdue).toBe(0);
  });

  it("shows 0% with no tasks", () => {
    expect(summarizeTasks([], targetDate, now)).toMatchObject({ total: 0, percent: 0 });
  });

  it("counts days using Manila dates", () => {
    // 11 PM on Nov 19 in Manila is one calendar day before the target date.
    const lateNight = new Date("2026-11-19T15:00:00.000Z");
    expect(summarizeTasks([], targetDate, lateNight).daysLeft).toBe(1);
  });

  it("stays at 0 days after the target date", () => {
    const later = new Date("2026-12-01T02:00:00.000Z");
    expect(summarizeTasks([], targetDate, later).daysLeft).toBe(0);
  });
});
