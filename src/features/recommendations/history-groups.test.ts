import { describe, expect, it } from "vitest";
import { groupFinishedTasks } from "./history-groups";

const deadline = new Date("2026-11-07T15:59:59.999Z");
const onTimeAt = new Date("2026-11-06T02:00:00.000Z");
const lateAt = new Date("2026-11-08T02:00:00.000Z");

const task = (id: string, projectId: string, completedAt: Date | null = onTimeAt) => ({
  id,
  title: `Task ${id}`,
  deadline,
  completedAt,
  category: { name: "Logistics" },
  project: { id: projectId, name: `Project ${projectId}` },
});

describe("groupFinishedTasks", () => {
  it("groups tasks by project, with the current project first", () => {
    const { groups } = groupFinishedTasks([task("a", "old"), task("b", "here")], ["old", "here"], "here");
    expect(groups.map((group) => group.projectId)).toEqual(["here", "old"]);
  });

  it("orders other projects by their most recent finished task", () => {
    const { groups } = groupFinishedTasks(
      [task("a", "older", new Date("2026-01-01T00:00:00.000Z")), task("b", "newer", new Date("2026-06-01T00:00:00.000Z"))],
      ["older", "newer", "here"],
      "here",
    );
    expect(groups.map((group) => group.projectId)).toEqual(["newer", "older"]);
  });

  it("puts the newest task first within a project", () => {
    const { groups } = groupFinishedTasks(
      [task("a", "here", new Date("2026-01-01T00:00:00.000Z")), task("b", "here", new Date("2026-06-01T00:00:00.000Z"))],
      ["here"],
      "here",
    );
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("marks tasks on time or late", () => {
    const { groups } = groupFinishedTasks([task("a", "here", onTimeAt), task("b", "here", lateAt)], ["here"], "here");
    const byId = Object.fromEntries(groups[0].tasks.map((t) => [t.id, t.onTime]));
    expect(byId).toEqual({ a: true, b: false });
  });

  it("only counts tasks from projects the viewer isn't in, without naming them", () => {
    const result = groupFinishedTasks([task("a", "here"), task("b", "private"), task("c", "private")], ["here"], "here");
    expect(result.groups.map((group) => group.projectId)).toEqual(["here"]);
    expect(result.hiddenCount).toBe(2);
    expect(JSON.stringify(result)).not.toContain("Project private");
    expect(JSON.stringify(result)).not.toContain("Task b");
  });

  it("gives empty results when there are no tasks", () => {
    expect(groupFinishedTasks([], ["here"], "here")).toEqual({ groups: [], hiddenCount: 0 });
  });
});
