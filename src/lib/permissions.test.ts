import { describe, expect, it } from "vitest";
import { can, canViewHistory, type ProjectAction } from "./permissions";

const LEAD_ONLY: ProjectAction[] = [
  "project:edit",
  "members:manage",
  "tasks:manage",
  "suggestions:view",
  "milestones:manage",
  "review:decide",
];

describe("can", () => {
  it.each(LEAD_ONLY)("lets only leads do %s", (action) => {
    expect(can("LEAD", action)).toBe(true);
    expect(can("MEMBER", action)).toBe(false);
    expect(can("ADVISER", action)).toBe(false);
  });

  it("lets leads and advisers send the report, but not members", () => {
    expect(can("LEAD", "report:send")).toBe(true);
    expect(can("ADVISER", "report:send")).toBe(true);
    expect(can("MEMBER", "report:send")).toBe(false);
  });
});

describe("canViewHistory", () => {
  it("lets leads and advisers view anyone's history", () => {
    expect(canViewHistory("LEAD", "me", "them")).toBe(true);
    expect(canViewHistory("ADVISER", "me", "them")).toBe(true);
  });

  it("lets members view only their own", () => {
    expect(canViewHistory("MEMBER", "me", "me")).toBe(true);
    expect(canViewHistory("MEMBER", "me", "them")).toBe(false);
  });
});
