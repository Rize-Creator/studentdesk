import { describe, expect, it } from "vitest";
import {
  assignLanes,
  sortByReadiness,
  computeReadiness,
  countByCategory,
  countByStatus,
  isMilestoneComplete,
  isMilestoneOverdue,
  isOverdue,
  progressOverTime,
  timelinePercent,
  type MetricTask,
} from "./calculations";

const startDate = new Date("2026-01-01T00:00:00.000Z");
const targetDate = new Date("2026-01-11T00:00:00.000Z");
const now = new Date("2026-01-06T00:00:00.000Z"); // Halfway, so expected is 50.
const future = new Date("2026-02-01T00:00:00.000Z");
const past = new Date("2026-01-02T00:00:00.000Z");

const tasks = (done: number, other: number): MetricTask[] => [
  ...Array.from({ length: done }, () => ({ status: "DONE" as const, priority: "LOW" as const, deadline: past })),
  ...Array.from({ length: other }, () => ({ status: "TODO" as const, priority: "LOW" as const, deadline: future })),
];

const readiness = (taskList: MetricTask[], milestones = [] as Parameters<typeof computeReadiness>[0]["milestones"], at = now) =>
  computeReadiness({ tasks: taskList, milestones, startDate, targetDate, now: at });

describe("computeReadiness", () => {
  it("reports no tasks", () => {
    expect(readiness([]).status).toBe("NO_TASKS");
  });

  it("is on track when progress is close to schedule", () => {
    const result = readiness(tasks(9, 11)); // 45% done, 5 points behind.
    expect(result).toMatchObject({ status: "ON_TRACK", completion: 45, expected: 50, overdueTasks: 0 });
  });

  it("is at risk at exactly 10 points behind", () => {
    expect(readiness(tasks(2, 3)).status).toBe("AT_RISK"); // 40%.
  });

  it("is behind at exactly 25 points behind", () => {
    expect(readiness(tasks(1, 3)).status).toBe("BEHIND"); // 25%.
  });

  it("is at risk with any overdue task, even when ahead of schedule", () => {
    const list: MetricTask[] = [...tasks(9, 0), { status: "TODO", priority: "MEDIUM", deadline: past }];
    expect(readiness(list).status).toBe("AT_RISK");
  });

  it("is behind with an overdue high-priority task, even when ahead of schedule", () => {
    const list: MetricTask[] = [...tasks(9, 0), { status: "TODO", priority: "HIGH", deadline: past }];
    const result = readiness(list);
    expect(result.status).toBe("BEHIND");
    expect(result.reasons).toContain("1 overdue high-priority task");
  });

  it("is behind with an overdue milestone", () => {
    const milestones = [{ dueDate: past, completedAt: null, taskStatuses: ["TODO" as const] }];
    const result = readiness(tasks(9, 1), milestones);
    expect(result.status).toBe("BEHIND");
    expect(result.reasons).toContain("1 overdue milestone");
  });

  it("caps expected at 100 after the target date", () => {
    const late = new Date("2026-03-01T00:00:00.000Z");
    expect(readiness(tasks(5, 0), [], late)).toMatchObject({ status: "ON_TRACK", expected: 100, completion: 100 });
  });

  it("caps expected at 0 before the start date", () => {
    const early = new Date("2025-12-01T00:00:00.000Z");
    expect(readiness(tasks(0, 2), [], early)).toMatchObject({ status: "ON_TRACK", expected: 0 });
  });

  it("handles a project that starts and ends on the same moment", () => {
    const result = computeReadiness({ tasks: tasks(1, 0), milestones: [], startDate, targetDate: startDate, now });
    expect(result.expected).toBe(100);
  });
});

describe("overdue rules", () => {
  it("doesn't count a Done task as overdue", () => {
    expect(isOverdue({ status: "DONE", deadline: past }, now)).toBe(false);
  });

  it("counts a late unfinished task as overdue", () => {
    expect(isOverdue({ status: "REVIEW", deadline: past }, now)).toBe(true);
  });

  it("treats a milestone as complete when marked, or when all its tasks are Done", () => {
    expect(isMilestoneComplete({ dueDate: past, completedAt: now, taskStatuses: ["TODO"] })).toBe(true);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: ["DONE", "DONE"] })).toBe(true);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: ["DONE", "TODO"] })).toBe(false);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: [] })).toBe(false);
  });

  it("doesn't count a complete milestone as overdue", () => {
    expect(isMilestoneOverdue({ dueDate: past, completedAt: now, taskStatuses: [] }, now)).toBe(false);
  });
});

describe("counts", () => {
  it("counts every stage, including empty ones", () => {
    expect(countByStatus(tasks(2, 1))).toEqual({ BACKLOG: 0, TODO: 1, IN_PROGRESS: 0, REVIEW: 0, DONE: 2 });
  });

  it("counts total and done per category", () => {
    const list = [
      { categoryName: "Finance", status: "DONE" as const },
      { categoryName: "Finance", status: "TODO" as const },
      { categoryName: "Creatives", status: "TODO" as const },
    ];
    expect(countByCategory(list)).toEqual([
      { name: "Creatives", total: 1, done: 0 },
      { name: "Finance", total: 2, done: 1 },
    ]);
  });
});

describe("progressOverTime", () => {
  it("adds up moves into Done per Manila day, and subtracts moves out", () => {
    const series = progressOverTime(
      [
        { at: new Date("2026-01-01T02:00:00.000Z"), delta: 1 },
        { at: new Date("2026-01-01T15:59:00.000Z"), delta: 1 },
        // 16:00 UTC is already the next day in Manila.
        { at: new Date("2026-01-01T16:00:00.000Z"), delta: 1 },
        { at: new Date("2026-01-03T02:00:00.000Z"), delta: -1 },
      ],
      "2026-01-01",
      "2026-01-03",
    );
    expect(series).toEqual([
      { date: "2026-01-01", done: 2 },
      { date: "2026-01-02", done: 3 },
      { date: "2026-01-03", done: 2 },
    ]);
  });

  it("keeps events from before the range in the running total", () => {
    const series = progressOverTime([{ at: new Date("2025-12-30T02:00:00.000Z"), delta: 1 }], "2026-01-01", "2026-01-01");
    expect(series).toEqual([{ date: "2026-01-01", done: 1 }]);
  });
});

describe("timelinePercent", () => {
  it("places a date along the project's span", () => {
    expect(timelinePercent(now, startDate, targetDate)).toBe(50);
  });

  it("stays within 0 to 100", () => {
    expect(timelinePercent(future, startDate, targetDate)).toBe(100);
    expect(timelinePercent(new Date("2025-01-01T00:00:00.000Z"), startDate, targetDate)).toBe(0);
  });
});

describe("sortByReadiness", () => {
  it("puts the projects needing attention first", () => {
    const rows = [
      { name: "a", readiness: { status: "ON_TRACK" as const } },
      { name: "b", readiness: { status: "NO_TASKS" as const } },
      { name: "c", readiness: { status: "BEHIND" as const } },
      { name: "d", readiness: { status: "AT_RISK" as const } },
    ];
    expect(sortByReadiness(rows).map((row) => row.name)).toEqual(["c", "d", "a", "b"]);
  });
});

describe("assignLanes", () => {
  it("keeps items on one lane when they're far apart", () => {
    expect(assignLanes([10, 40, 70], 20)).toEqual([0, 0, 0]);
  });

  it("moves an item to the next lane when it would overlap", () => {
    expect(assignLanes([10, 15, 20, 60], 20)).toEqual([0, 1, 2, 0]);
  });

  it("reuses a lane once there's room again", () => {
    expect(assignLanes([10, 15, 35], 20)).toEqual([0, 1, 0]);
  });

  it("keeps results in the order given, even if the input isn't sorted", () => {
    expect(assignLanes([60, 10, 15], 20)).toEqual([0, 0, 1]);
  });

  it("handles no items", () => {
    expect(assignLanes([], 20)).toEqual([]);
  });
});
