import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/session";
import { isDemoMode } from "@/features/lms";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/features/lms/mock-client";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  if (await getSessionUser()) redirect("/home");
  const demo = isDemoMode();
  const quickPicks = demo
    ? DEMO_ACCOUNTS.filter((a) => a.quickPick).map((a) => ({ label: a.quickPick!, username: a.username, name: a.name }))
    : [];
  return <SignInForm demoPassword={demo ? DEMO_PASSWORD : null} quickPicks={quickPicks} />;
}
