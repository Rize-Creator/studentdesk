import { FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getMembership, requireMember } from "@/features/auth/session";
import { getMemberHistory } from "@/features/recommendations/history";
import { formatManilaDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { canViewHistory, ROLE_LABELS } from "@/lib/permissions";

export default async function MemberHistoryPage({ params }: { params: Promise<{ projectId: string; userId: string }> }) {
  const { projectId, userId } = await params;
  const { user, member } = await requireMember(projectId);
  // Only people in this project have a history page here, and a member sees only their own.
  const target = await getMembership(projectId, userId);
  if (!target || !canViewHistory(member.role, user.id, userId)) notFound();

  const [person, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    getMemberHistory(userId, user.id, projectId),
  ]);
  const onTimePercent = history.doneTotal === 0 ? null : Math.round((history.doneOnTime * 100) / history.doneTotal);
  const mostInCategory = Math.max(1, ...history.perCategory.map((row) => row.count));

  return (
    <main className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href={`/projects/${projectId}/members`} className="text-sm text-muted-foreground hover:text-foreground">
          Back to members
        </Link>
        <h2 className="mt-1 text-2xl font-bold">{person.name}</h2>
      </div>

      {history.doneTotal === 0 ? (
        <p className="text-muted-foreground">No finished tasks yet. Their record builds up as they complete tasks.</p>
      ) : (
        <>
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Tasks finished</dt>
              <dd className="text-3xl font-bold tabular-nums">{history.doneTotal}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">On time</dt>
              <dd className="text-3xl font-bold tabular-nums">
                {onTimePercent}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {history.doneOnTime} of {history.doneTotal}
                </span>
              </dd>
            </div>
          </dl>
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-bold">Tasks finished by category</h3>
            <ul className="flex flex-col gap-2">
              {history.perCategory.map((row) => (
                <li key={row.name} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                  <span>{row.name}</span>
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(row.count * 100) / mostInCategory}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h3 className="text-lg font-bold">Tasks finished</h3>
            {history.finished.groups.map((group) => (
              <div key={group.projectId} className="overflow-hidden rounded-xl border border-border">
                <h4 className="flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                  <FolderKanban aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">{group.projectName}</span>
                  <span className="shrink-0 text-xs font-medium">
                    {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
                  </span>
                </h4>
                <ul className="divide-y divide-border">
                  {group.tasks.map((task) => (
                    <li key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                      <Link
                        href={`/projects/${group.projectId}/board?task=${task.id}`}
                        className="min-w-0 flex-1 basis-48 underline-offset-4 hover:text-primary hover:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">{task.categoryName}</span>
                      {task.completedAt && (
                        <span className="text-xs text-muted-foreground tabular-nums">{formatManilaDate(task.completedAt)}</span>
                      )}
                      <span
                        className={
                          task.onTime
                            ? "rounded-md bg-tint px-2 py-0.5 text-xs font-semibold text-primary"
                            : "rounded-md bg-brand-red/10 px-2 py-0.5 text-xs font-semibold text-brand-red"
                        }
                      >
                        {task.onTime ? "On time" : "Late"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {history.finished.hiddenCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {history.finished.hiddenCount} more {history.finished.hiddenCount === 1 ? "task" : "tasks"} in projects you aren&apos;t part of.
              </p>
            )}
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-lg font-bold">Projects and roles</h3>
        <ul className="divide-y divide-border border-y border-border">
          {history.memberships.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
              <span className="min-w-0 flex-1 font-semibold">{row.project.name}</span>
              <Badge variant="secondary">{ROLE_LABELS[row.role]}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
