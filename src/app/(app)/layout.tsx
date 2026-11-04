import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/features/auth/session";
import { isDemoMode } from "@/features/lms";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-board text-chalk">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Wordmark href="/home" />
          <nav aria-label="Main" className="flex items-center gap-4 text-sm">
            <Link href="/home" className="hover:text-marker">Home</Link>
            <Link href="/projects" className="hover:text-marker">Projects</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {isDemoMode() && (
              <span className="rounded-sm bg-marker px-2 py-0.5 text-xs font-bold text-foreground">Demo mode: sample data</span>
            )}
            <span className="hidden sm:inline">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
