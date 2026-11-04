import { requireMember } from "@/features/auth/session";
import { listTasks } from "@/features/tasks/queries";
import { loadTaskFormOptions } from "@/features/tasks/task-options";
import { TasksTable } from "@/features/tasks/tasks-table";
import { can } from "@/lib/permissions";

export default async function TasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { member, project } = await requireMember(projectId);
  const [tasks, options] = await Promise.all([listTasks(projectId), loadTaskFormOptions(projectId)]);
  return (
    <TasksTable
      projectId={projectId}
      canManage={can(member.role, "tasks:manage") && project.status === "ACTIVE"}
      options={options}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        deadline: task.deadline,
        assigneeId: task.assigneeId,
        milestoneId: task.milestoneId,
        status: task.status,
        categoryName: task.category.name,
        assigneeName: task.assignee?.name ?? null,
      }))}
    />
  );
}
