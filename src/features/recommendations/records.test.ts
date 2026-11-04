import { describe, expect, it } from "vitest";
import { buildCandidateRecords } from "./records";

const deadline = new Date("2026-11-07T15:59:59.999Z");
const early = new Date("2026-11-06T02:00:00.000Z");
const late = new Date("2026-11-08T02:00:00.000Z");

describe("buildCandidateRecords", () => {
  const records = buildCandidateRecords({
    categoryId: "logistics",
    people: [
      { id: "juan", name: "Juan" },
      { id: "ana", name: "Ana" },
    ],
    doneTasks: [
      { assigneeId: "juan", categoryId: "logistics", deadline, completedAt: early },
      { assigneeId: "juan", categoryId: "logistics", deadline, completedAt: late },
      { assigneeId: "juan", categoryId: "finance", deadline, completedAt: early },
    ],
    activeCounts: [{ assigneeId: "juan", count: 2 }],
    roles: [
      { userId: "juan", committeeTitle: "Logistics Head", projectName: "Foundation Day 2025 (sample)" },
      { userId: "juan", committeeTitle: null, projectName: "Intramurals 2025 (sample)" },
    ],
  });

  it("counts Done tasks in the category and overall", () => {
    expect(records[0]).toMatchObject({ doneInCategory: 2, doneTotal: 3 });
  });

  it("counts on-time tasks overall", () => {
    expect(records[0].doneOnTime).toBe(2);
  });

  it("carries active counts", () => {
    expect(records[0].activeTasks).toBe(2);
  });

  it("words committee roles, with a fallback when there's no title", () => {
    expect(records[0].categoryRoles).toEqual([
      "Logistics Head, Foundation Day 2025 (sample)",
      "Committee member, Intramurals 2025 (sample)",
    ]);
  });

  it("gives zeros to someone with no records", () => {
    expect(records[1]).toEqual({
      userId: "ana",
      name: "Ana",
      doneInCategory: 0,
      doneTotal: 0,
      doneOnTime: 0,
      activeTasks: 0,
      categoryRoles: [],
    });
  });
});
