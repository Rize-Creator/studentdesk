import { isOnTime } from "@/lib/dates";
import type { CandidateRecord } from "./engine";

type BuildInput = {
  categoryId: string;
  people: { id: string; name: string }[];
  doneTasks: { assigneeId: string | null; categoryId: string; deadline: Date; completedAt: Date | null }[];
  activeCounts: { assigneeId: string | null; count: number }[];
  roles: { userId: string; committeeTitle: string | null; projectName: string }[];
};

export function buildCandidateRecords(input: BuildInput): CandidateRecord[] {
  return input.people.map((person) => {
    const done = input.doneTasks.filter((task) => task.assigneeId === person.id);
    return {
      userId: person.id,
      name: person.name,
      doneInCategory: done.filter((task) => task.categoryId === input.categoryId).length,
      doneTotal: done.length,
      doneOnTime: done.filter((task) => task.completedAt && isOnTime(task.completedAt, task.deadline)).length,
      activeTasks: input.activeCounts.find((row) => row.assigneeId === person.id)?.count ?? 0,
      categoryRoles: input.roles
        .filter((role) => role.userId === person.id)
        .map((role) => `${role.committeeTitle ?? "Committee member"}, ${role.projectName}`),
    };
  });
}
