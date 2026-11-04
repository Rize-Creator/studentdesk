"use client";

import { CalendarRange, Columns3, Flag, LayoutDashboard, ListChecks, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({
  projectId,
  projectName,
  showSettings,
}: {
  projectId: string;
  projectName: string;
  showSettings: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview", icon: LayoutDashboard },
    { href: `${base}/board`, label: "Board", icon: Columns3 },
    { href: `${base}/tasks`, label: "Tasks", icon: ListChecks },
    { href: `${base}/timeline`, label: "Timeline", icon: CalendarRange },
    { href: `${base}/members`, label: "Members", icon: Users },
    { href: `${base}/milestones`, label: "Milestones", icon: Flag },
    ...(showSettings ? [{ href: `${base}/settings`, label: "Settings", icon: Settings }] : []),
  ];
  const isCurrent = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));
  const currentLabel = tabs.find((tab) => isCurrent(tab.href))?.label;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li><Link href="/projects" className="hover:text-foreground">Projects</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={base} className="hover:text-foreground">{projectName}</Link></li>
          {currentLabel && (
            <>
              <li aria-hidden>/</li>
              <li aria-current="page" className="font-semibold text-foreground">{currentLabel}</li>
            </>
          )}
        </ol>
      </nav>
      <nav aria-label="Project" className="thin-scroll -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1 border-b border-border">
          {tabs.map(({ href, label, icon: Icon }) => {
            const current = isCurrent(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm",
                    current ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
