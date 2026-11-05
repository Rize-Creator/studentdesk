import { describe, expect, it } from "vitest";
import { dedupeKey, moveNotificationType, withoutActor } from "./keys";

describe("dedupeKey", () => {
  it("never lets a reminder and an overdue notice clash", () => {
    const reminder = dedupeKey("DEADLINE_REMINDER", "task1", "2026-11-07", "user1");
    const overdue = dedupeKey("TASK_OVERDUE", "task1", "2026-11-07", "user1");
    expect(reminder).not.toBe(overdue);
  });

  it("gives the same key for the same event", () => {
    expect(dedupeKey("READINESS_SUMMARY", "p1", "2026-11-07", "u1")).toBe(
      dedupeKey("READINESS_SUMMARY", "p1", "2026-11-07", "u1"),
    );
  });
});

describe("moveNotificationType", () => {
  it("tells leads when a task enters Review", () => {
    expect(moveNotificationType("IN_PROGRESS", "REVIEW")).toBe("TASK_IN_REVIEW");
  });

  it("tells the assignee when a task is sent back", () => {
    expect(moveNotificationType("REVIEW", "IN_PROGRESS")).toBe("TASK_RETURNED");
  });

  it("tells the assignee when a task is Done", () => {
    expect(moveNotificationType("REVIEW", "DONE")).toBe("TASK_DONE");
  });

  it("sends nothing for other moves or reorders", () => {
    expect(moveNotificationType("TODO", "IN_PROGRESS")).toBeNull();
    expect(moveNotificationType("REVIEW", "REVIEW")).toBeNull();
    expect(moveNotificationType("DONE", "DONE")).toBeNull();
  });
});

describe("withoutActor", () => {
  it("removes the person who made the change and any repeats", () => {
    expect(withoutActor(["a", "b", "a", "c"], "c")).toEqual(["a", "b"]);
  });
});
