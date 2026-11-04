import { getMembership, getSessionUser } from "@/features/auth/session";
import { getTaskDetail } from "@/features/tasks/queries";

type Params = { params: Promise<{ projectId: string; taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId, taskId } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const member = await getMembership(projectId, user.id);
  if (!member) return Response.json({ message: "Not found." }, { status: 404 });
  const task = await getTaskDetail(projectId, taskId);
  if (!task) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json({ task });
}
