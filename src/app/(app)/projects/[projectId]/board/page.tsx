import { requireMember } from "@/features/auth/session";
import { Board } from "@/features/tasks/board";
import { getBoard } from "@/features/tasks/queries";
import { loadTaskFormOptions } from "@/features/tasks/task-options";

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, member, project } = await requireMember(projectId);
  const [tasks, options] = await Promise.all([getBoard(projectId), loadTaskFormOptions(projectId)]);
  return (
    <Board
      projectId={projectId}
      initialTasks={tasks}
      viewerId={user.id}
      role={member.role}
      archived={project.status === "ARCHIVED"}
      options={options}
    />
  );
}
