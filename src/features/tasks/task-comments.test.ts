import { describe, expect, it } from "vitest";
import { leadComments } from "./task-comments";

const row = (id: string, note: string | null, changedAt: string) => ({
  id,
  note,
  changedAt,
  changedBy: { name: "Maria Santos" },
});

describe("leadComments", () => {
  it("keeps only history rows that have a note", () => {
    const comments = leadComments([row("a", null, "2026-11-01T00:00:00Z"), row("b", "Fix the date", "2026-11-02T00:00:00Z")]);
    expect(comments.map((c) => c.id)).toEqual(["b"]);
  });

  it("shows who wrote it and when", () => {
    const [comment] = leadComments([row("a", "Fix the date", "2026-11-02T00:00:00Z")]);
    expect(comment).toEqual({ id: "a", text: "Fix the date", author: "Maria Santos", at: "2026-11-02T00:00:00Z" });
  });

  it("puts the newest comment first", () => {
    const comments = leadComments([row("old", "First", "2026-11-01T00:00:00Z"), row("new", "Second", "2026-11-03T00:00:00Z")]);
    expect(comments.map((c) => c.id)).toEqual(["new", "old"]);
  });

  it("ignores a blank note", () => {
    expect(leadComments([row("a", "   ", "2026-11-01T00:00:00Z")])).toEqual([]);
  });

  it("returns nothing when there's no history", () => {
    expect(leadComments([])).toEqual([]);
  });
});
