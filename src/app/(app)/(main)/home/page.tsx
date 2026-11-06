import { requireUser } from "@/features/auth/session";
import { MyWorkView } from "@/features/metrics/my-work";
import { greetingFor } from "@/features/metrics/my-work-summary";
import { getMyWork } from "@/features/metrics/queries";

export default async function HomePage() {
  const user = await requireUser();
  return <MyWorkView initial={await getMyWork(user.id)} name={user.name} greeting={greetingFor(new Date())} />;
}
