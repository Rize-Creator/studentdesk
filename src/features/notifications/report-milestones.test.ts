import { describe, expect, it } from "vitest";
import { reportMilestones } from "./report-milestones";

// 10 AM on Nov 11 in Manila.
const now = new Date("2026-11-11T02:00:00.000Z");
const milestone = (title: string, dueDate: string, flags: { complete?: boolean; overdue?: boolean } = {}) => ({
  title,
  dueDate,
  complete: flags.complete ?? false,
  overdue: flags.overdue ?? false,
});
const titles = (rows: { title: string }[]) => rows.map((row) => row.title);

describe("reportMilestones", () => {
  const result = reportMilestones(
    [
      milestone("Done already", "2026-11-01T15:59:59.999Z", { complete: true }),
      milestone("Late", "2026-11-05T15:59:59.999Z", { overdue: true }),
      milestone("Soon", "2026-11-16T15:59:59.999Z"),
      milestone("Far away", "2026-12-20T15:59:59.999Z"),
    ],
    now,
  );

  it("puts unfinished milestones past their due date in the overdue list", () => {
    expect(titles(result.overdue)).toEqual(["Late"]);
  });

  it("keeps overdue milestones out of the next 14 days", () => {
    expect(titles(result.upcoming)).toEqual(["Soon"]);
  });

  it("returns real dates for the email to format", () => {
    expect(result.overdue[0].dueDate).toEqual(new Date("2026-11-05T15:59:59.999Z"));
  });

  it("includes a milestone due exactly 14 days from now, but not later", () => {
    const edge = reportMilestones([milestone("Edge", "2026-11-25T02:00:00.000Z"), milestone("Just past", "2026-11-25T02:00:00.001Z")], now);
    expect(titles(edge.upcoming)).toEqual(["Edge"]);
  });
});
