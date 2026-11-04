import { getSessionUser } from "@/features/auth/session";
import { getOverview } from "@/features/metrics/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  return Response.json(await getOverview(user.id));
}
