import { requireUser } from "@/features/auth/session";
import { MyWorkView } from "@/features/metrics/my-work";
import { getMyWork } from "@/features/metrics/queries";

export default async function HomePage() {
  const user = await requireUser();
  return <MyWorkView initial={await getMyWork(user.id)} />;
}
