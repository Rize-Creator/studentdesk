"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId, showSettings }: { projectId: string; showSettings: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/board`, label: "Board" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/timeline`, label: "Timeline" },
    { href: `${base}/members`, label: "Members" },
    { href: `${base}/milestones`, label: "Milestones" },
    ...(showSettings ? [{ href: `${base}/settings`, label: "Settings" }] : []),
  ];

  return (
    <nav aria-label="Project" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((tab) => {
          const current = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2 text-sm",
                  current ? "border-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
