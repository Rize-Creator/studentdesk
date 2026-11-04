import { getMembership, getSessionUser } from "@/features/auth/session";
import { getBoard } from "@/features/tasks/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const member = await getMembership(projectId, user.id);
  if (!member) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json({ tasks: await getBoard(projectId) });
}
