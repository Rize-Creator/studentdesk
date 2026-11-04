import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/features/auth/session";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
