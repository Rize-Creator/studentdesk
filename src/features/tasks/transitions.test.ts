import { describe, expect, it } from "vitest";
import { checkMove, isSendBack, type MoveInput } from "./transitions";

const base: MoveInput = {
  role: "MEMBER",
  archived: false,
  isAssignee: true,
  hasAssignee: true,
  from: "TODO",
  to: "IN_PROGRESS",
};

const denied = (input: Partial<MoveInput>) => {
  const result = checkMove({ ...base, ...input });
  return result.ok ? null : result.reason;
};

describe("leads", () => {
  const lead = { role: "LEAD" as const, isAssignee: false };

  it("can move any assigned task to any stage", () => {
    expect(denied({ ...lead, from: "BACKLOG", to: "DONE" })).toBeNull();
    expect(denied({ ...lead, from: "DONE", to: "TODO" })).toBeNull();
  });

  it("must add a note to send a task back from Review", () => {
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS" })).toBe("note-required");
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS", note: "Fix the date" })).toBeNull();
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS", note: "   " })).toBe("note-required");
  });

  it("can mark Done from Review with no note", () => {
    expect(denied({ ...lead, from: "REVIEW", to: "DONE" })).toBeNull();
  });
});

describe("members", () => {
  it("can move their own task between To Do, In Progress and Review", () => {
    expect(denied({ from: "TODO", to: "IN_PROGRESS" })).toBeNull();
    expect(denied({ from: "IN_PROGRESS", to: "REVIEW" })).toBeNull();
    expect(denied({ from: "REVIEW", to: "IN_PROGRESS" })).toBeNull();
  });

  it("can't mark a task Done", () => {
    expect(denied({ from: "REVIEW", to: "DONE" })).toBe("lead-only");
  });

  it("can't move a task into or out of Backlog or out of Done", () => {
    expect(denied({ from: "BACKLOG", to: "TODO" })).toBe("lead-only");
    expect(denied({ from: "TODO", to: "BACKLOG" })).toBe("lead-only");
    expect(denied({ from: "DONE", to: "IN_PROGRESS" })).toBe("lead-only");
  });

  // Review Focus 2: a stale board, where the card was reassigned a few seconds ago.
  it("can't move a card that was reassigned to someone else", () => {
    expect(denied({ isAssignee: false, from: "TODO", to: "IN_PROGRESS" })).toBe("not-assignee");
  });

  it("can reorder their own card within a column", () => {
    expect(denied({ from: "TODO", to: "TODO" })).toBeNull();
  });
});

describe("advisers", () => {
  it("can't move anything", () => {
    expect(denied({ role: "ADVISER", isAssignee: false })).toBe("adviser");
  });
});

describe("any role", () => {
  it("can't move a task in an archived project", () => {
    expect(denied({ role: "LEAD", archived: true })).toBe("archived");
  });

  it.each(["IN_PROGRESS", "REVIEW", "DONE"] as const)("needs an assignee to enter %s", (to) => {
    expect(denied({ role: "LEAD", hasAssignee: false, isAssignee: false, from: "TODO", to })).toBe("needs-assignee");
  });

  it("allows an unassigned task in Backlog and To Do", () => {
    expect(denied({ role: "LEAD", hasAssignee: false, isAssignee: false, from: "BACKLOG", to: "TODO" })).toBeNull();
  });
});

describe("isSendBack", () => {
  it("is true when leaving Review for an earlier stage", () => {
    expect(isSendBack("REVIEW", "IN_PROGRESS")).toBe(true);
    expect(isSendBack("REVIEW", "TODO")).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isSendBack("REVIEW", "DONE")).toBe(false);
    expect(isSendBack("REVIEW", "REVIEW")).toBe(false);
    expect(isSendBack("TODO", "IN_PROGRESS")).toBe(false);
  });
});
