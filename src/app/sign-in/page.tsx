import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/features/auth/google";
import { getSessionUser } from "@/features/auth/session";
import { isDemoMode } from "@/features/lms";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/features/lms/mock-client";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSessionUser()) redirect("/home");
  const { error } = await searchParams;
  const demo = isDemoMode();
  const quickPicks = demo
    ? DEMO_ACCOUNTS.filter((a) => a.quickPick).map((a) => ({ label: a.quickPick!, username: a.username, name: a.name }))
    : [];
  return (
    <SignInForm
      demoPassword={demo ? DEMO_PASSWORD : null}
      quickPicks={quickPicks}
      googleEnabled={isGoogleEnabled(process.env)}
      redirectError={error ?? null}
    />
  );
}
