import { requireUser } from "@/features/auth/session";

// Each section below adds the app shell, because project pages give it their own summary panel.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
