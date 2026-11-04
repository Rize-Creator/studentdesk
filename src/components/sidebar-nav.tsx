"use client";

import { FolderKanban, House, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({ showOverview }: { showOverview: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/home", label: "Home", icon: House },
    ...(showOverview ? [{ href: "/overview", label: "Overview", icon: LayoutGrid }] : []),
    { href: "/projects", label: "Projects", icon: FolderKanban },
  ];
  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap gap-1 lg:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10",
                  current && "bg-white/15 font-semibold",
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
  );
}
