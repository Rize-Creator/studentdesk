import { requireMember } from "@/features/auth/session";
import { Board } from "@/features/tasks/board";
import { getBoard } from "@/features/tasks/queries";
import { loadTaskFormOptions } from "@/features/tasks/task-options";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { projectId } = await params;
  const { task } = await searchParams;
  const { user, member, project } = await requireMember(projectId);
  const [tasks, options] = await Promise.all([getBoard(projectId), loadTaskFormOptions(projectId)]);
  return (
    <Board
      projectId={projectId}
      initialTasks={tasks}
      initialOpenTaskId={task ?? null}
      viewerId={user.id}
      role={member.role}
      archived={project.status === "ARCHIVED"}
      options={options}
    />
  );
}
