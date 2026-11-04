import { isOnTime } from "@/lib/dates";

type FinishedTask = {
  id: string;
  title: string;
  deadline: Date;
  completedAt: Date | null;
  category: { name: string };
  project: { id: string; name: string };
};

export function groupFinishedTasks(tasks: FinishedTask[], viewerProjectIds: string[], currentProjectId: string) {
  const visible = tasks.filter((task) => viewerProjectIds.includes(task.project.id));
  const finishedAt = (task: FinishedTask) => task.completedAt?.getTime() ?? 0;

  const groups = new Map<string, { projectId: string; projectName: string; tasks: FinishedTask[] }>();
  for (const task of visible) {
    const group = groups.get(task.project.id) ?? { projectId: task.project.id, projectName: task.project.name, tasks: [] };
    group.tasks.push(task);
    groups.set(task.project.id, group);
  }

  const latest = (group: { tasks: FinishedTask[] }) => Math.max(...group.tasks.map(finishedAt));
  return {
    // Names of tasks in projects the viewer isn't part of stay out of this result entirely.
    hiddenCount: tasks.length - visible.length,
    groups: [...groups.values()]
      .sort(
        (a, b) =>
          Number(b.projectId === currentProjectId) - Number(a.projectId === currentProjectId) || latest(b) - latest(a),
      )
      .map((group) => ({
        projectId: group.projectId,
        projectName: group.projectName,
        tasks: [...group.tasks]
          .sort((a, b) => finishedAt(b) - finishedAt(a))
          .map((task) => ({
            id: task.id,
            title: task.title,
            categoryName: task.category.name,
            completedAt: task.completedAt,
            onTime: task.completedAt !== null && isOnTime(task.completedAt, task.deadline),
          })),
      })),
  };
}
