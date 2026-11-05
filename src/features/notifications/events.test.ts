import { describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { draftAssignment, draftMove } from "./events";

const project = { id: "p1", name: "Foundation Day" };
const maria = { id: "maria", name: "Maria" };
const juan = { id: "juan", name: "Juan" };
const task = { id: "t1", title: "Poster", assigneeId: "juan", deliverableUrl: null, milestoneId: null };

function fakeClient(options: { unfinished?: number; completedAt?: Date | null } = {}) {
  return {
    projectMember: {
      findMany: async ({ where }: { where: { role: string | { in: string[] } } }) =>
        where.role === "LEAD" ? [{ userId: "maria" }] : [{ userId: "maria" }, { userId: "elena" }],
    },
    task: { count: async () => options.unfinished ?? 1 },
    milestone: { findUnique: async () => ({ id: "m1", title: "Budget approved", completedAt: options.completedAt ?? null }) },
  } as unknown as Prisma.TransactionClient;
}

const move = { historyId: "h1", note: null, project, task };
const to = (drafts: { recipientId: string }[]) => drafts.map((draft) => draft.recipientId);

describe("draftMove", () => {
  it("tells the lead when a member moves a task to Review", async () => {
    const drafts = await draftMove(fakeClient(), { ...move, from: "IN_PROGRESS", to: "REVIEW", actor: juan });
    expect(to(drafts)).toEqual(["maria"]);
    expect(drafts[0].type).toBe("TASK_IN_REVIEW");
  });

  it("doesn't email a lead about their own move to Review", async () => {
    const drafts = await draftMove(fakeClient(), { ...move, task: { ...task, assigneeId: "maria" }, from: "IN_PROGRESS", to: "REVIEW", actor: maria });
    expect(drafts).toEqual([]);
  });

  it("tells the assignee when a task is sent back, with the note", async () => {
    const drafts = await draftMove(fakeClient(), { ...move, note: "Fix the date", from: "REVIEW", to: "IN_PROGRESS", actor: maria });
    expect(to(drafts)).toEqual(["juan"]);
    expect(drafts[0].type).toBe("TASK_RETURNED");
    expect(drafts[0].body).toContain("Fix the date");
  });

  it("tells the assignee when a lead marks a task Done", async () => {
    const drafts = await draftMove(fakeClient(), { ...move, from: "REVIEW", to: "DONE", actor: maria });
    expect(to(drafts)).toEqual(["juan"]);
    expect(drafts[0].type).toBe("TASK_DONE");
  });

  it("sends nothing for an ordinary move", async () => {
    expect(await draftMove(fakeClient(), { ...move, from: "TODO", to: "IN_PROGRESS", actor: juan })).toEqual([]);
  });

  it("gives each move its own key, so a second send-back still sends", async () => {
    const first = await draftMove(fakeClient(), { ...move, from: "REVIEW", to: "IN_PROGRESS", actor: maria });
    const second = await draftMove(fakeClient(), { ...move, historyId: "h2", from: "REVIEW", to: "IN_PROGRESS", actor: maria });
    expect(first[0].dedupeKey).not.toBe(second[0].dedupeKey);
  });

  it("tells leads and advisers when the last task of a milestone is done", async () => {
    const drafts = await draftMove(fakeClient({ unfinished: 0 }), { ...move, task: { ...task, milestoneId: "m1" }, from: "REVIEW", to: "DONE", actor: maria });
    expect(drafts.filter((draft) => draft.type === "MILESTONE_COMPLETED").map((draft) => draft.recipientId)).toEqual(["elena"]);
  });

  it("stays quiet about a milestone with tasks left or one already complete", async () => {
    const withTasksLeft = await draftMove(fakeClient({ unfinished: 2 }), { ...move, task: { ...task, milestoneId: "m1" }, from: "REVIEW", to: "DONE", actor: maria });
    const alreadyComplete = await draftMove(fakeClient({ unfinished: 0, completedAt: new Date() }), { ...move, task: { ...task, milestoneId: "m1" }, from: "REVIEW", to: "DONE", actor: maria });
    expect(withTasksLeft.some((draft) => draft.type === "MILESTONE_COMPLETED")).toBe(false);
    expect(alreadyComplete.some((draft) => draft.type === "MILESTONE_COMPLETED")).toBe(false);
  });
});

describe("draftAssignment", () => {
  const input = { assignmentId: "a1", project, task: { id: "t1", title: "Poster", deadline: new Date("2026-11-07T15:59:59.999Z") } };

  it("tells the new assignee", () => {
    const drafts = draftAssignment({ ...input, assigneeId: "juan", actor: maria });
    expect(to(drafts)).toEqual(["juan"]);
    expect(drafts[0].type).toBe("TASK_ASSIGNED");
  });

  it("doesn't email someone who assigned themselves", () => {
    expect(draftAssignment({ ...input, assigneeId: "maria", actor: maria })).toEqual([]);
  });
});
