import { describe, expect, it } from "vitest";
import { wouldRemoveLastLead } from "./member-rules";

const team = [
  { userId: "a", role: "LEAD" as const },
  { userId: "b", role: "MEMBER" as const },
];

describe("wouldRemoveLastLead", () => {
  it("blocks removing the only lead", () => {
    expect(wouldRemoveLastLead(team, { userId: "a" })).toBe(true);
  });

  it("blocks changing the only lead to another role", () => {
    expect(wouldRemoveLastLead(team, { userId: "a", newRole: "MEMBER" })).toBe(true);
  });

  it("allows a lead to stay a lead", () => {
    expect(wouldRemoveLastLead(team, { userId: "a", newRole: "LEAD" })).toBe(false);
  });

  it("allows removing a member", () => {
    expect(wouldRemoveLastLead(team, { userId: "b" })).toBe(false);
  });

  it("allows removing one of two leads", () => {
    const twoLeads = [...team, { userId: "c", role: "LEAD" as const }];
    expect(wouldRemoveLastLead(twoLeads, { userId: "a" })).toBe(false);
  });
});
