import { describe, expect, it } from "vitest";
import { splitByOwner } from "./board-groups";

const task = (id: string, assigneeId: string | null) => ({ id, assigneeId });

describe("splitByOwner", () => {
  it("separates the viewer's tasks from everyone else's, keeping their order", () => {
    const { mine, others } = splitByOwner(
      [task("a", "juan"), task("b", "ana"), task("c", "juan"), task("d", null)],
      "juan",
    );
    expect(mine.map((t) => t.id)).toEqual(["a", "c"]);
    expect(others.map((t) => t.id)).toEqual(["b", "d"]);
  });

  it("treats unassigned tasks as not the viewer's", () => {
    expect(splitByOwner([task("a", null)], "juan").mine).toEqual([]);
  });

  it("handles an empty column", () => {
    expect(splitByOwner([], "juan")).toEqual({ mine: [], others: [] });
  });
});
