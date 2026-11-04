import { requireUser } from "@/features/auth/session";
import { OverviewView } from "@/features/metrics/overview";
import { getOverview } from "@/features/metrics/queries";

export default async function OverviewPage() {
  const user = await requireUser();
  return <OverviewView initial={await getOverview(user.id)} />;
}
