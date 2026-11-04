import { listCategories, listMembers, listMilestones } from "@/features/projects/queries";
import type { TaskFormOptions } from "./task-form";

export async function loadTaskFormOptions(projectId: string): Promise<TaskFormOptions> {
  const [categories, members, milestones] = await Promise.all([
    listCategories(),
    listMembers(projectId),
    listMilestones(projectId),
  ]);
  return {
    categories: categories.map(({ id, name }) => ({ id, name })),
    members: members.filter((m) => m.role !== "ADVISER").map((m) => ({ userId: m.userId, name: m.user.name })),
    milestones: milestones.map(({ id, title }) => ({ id, title })),
  };
}
