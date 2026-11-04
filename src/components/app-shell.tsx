import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { Wordmark } from "@/components/wordmark";
import type { SessionUser } from "@/features/auth/session";
import { isDemoMode } from "@/features/lms";

const DEMO_LABEL = "Demo mode: sample data";

export function AppShell({
  user,
  panel,
  children,
}: {
  user: SessionUser;
  panel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const demo = isDemoMode();
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-navy text-white lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:h-svh lg:w-80 lg:overflow-y-auto lg:py-6">
        <div className="flex items-center justify-between gap-3">
          <Wordmark href="/home" />
          <div className="flex items-center gap-2 lg:hidden">
            {demo && <span className="rounded-md bg-white/15 px-2 py-1 text-xs">Demo</span>}
            <SignOutButton />
          </div>
        </div>
        <SidebarNav />
        {panel}
        <div className="mt-auto hidden flex-col gap-2 border-t border-white/15 pt-4 lg:flex">
          {demo && <span className="text-xs text-white/75">{DEMO_LABEL}</span>}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 rounded-t-3xl bg-background p-4 text-foreground sm:p-6 lg:my-3 lg:mr-3 lg:rounded-3xl lg:p-8">
        {children}
      </div>
    </div>
  );
}
