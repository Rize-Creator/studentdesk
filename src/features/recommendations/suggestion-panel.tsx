"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSuggestions, type Suggestions } from "@/features/recommendations/actions";
import { safeCall } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export function useSuggestions(projectId: string, categoryId: string) {
  return useQuery({
    queryKey: ["suggestions", projectId, categoryId],
    enabled: Boolean(categoryId),
    staleTime: 0,
    queryFn: async (): Promise<Suggestions> => {
      const result = await safeCall(() => getSuggestions(projectId, categoryId));
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
  });
}

export function SuggestionPanel({
  projectId,
  categoryId,
  selectedUserId,
  query,
  onPick,
}: {
  projectId: string;
  categoryId: string;
  selectedUserId: string;
  query: ReturnType<typeof useSuggestions>;
  onPick: (userId: string) => void;
}) {
  const { data, isLoading, isError } = query;
  const shownIds = new Set(data?.suggestions.map((person) => person.userId));
  const heldBack = data?.atLimit.filter((person) => !shownIds.has(person.userId)) ?? [];

  return (
    <section aria-label="Suggested people" className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      <div>
        <h3 className="text-sm font-bold">Suggested people</h3>
        <p className="text-xs text-muted-foreground">Suggestions help you decide. You choose who to assign.</p>
      </div>

      {!categoryId && <p className="text-sm text-muted-foreground">Choose a category to see suggestions.</p>}
      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && <p role="alert" className="text-sm text-destructive">Suggestions couldn&apos;t load. You can still choose someone below.</p>}
      {data?.suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">Add members to this project to get suggestions.</p>
      )}

      {data && data.suggestions.length > 0 && (
        <ol className="flex flex-col gap-2">
          {data.suggestions.map((person) => {
            const selected = selectedUserId === person.userId;
            return (
              <li
                key={person.userId}
                className={cn("flex gap-3 rounded-lg border bg-card p-3", selected ? "border-primary" : "border-border")}
              >
                <span className="w-11 shrink-0 text-lg leading-tight font-bold tabular-nums">
                  {person.percent}%<span className="sr-only"> match</span>
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/projects/${projectId}/members/${person.userId}`}
                    target="_blank"
                    className="text-sm font-bold underline-offset-4 hover:underline"
                  >
                    {person.name}
                  </Link>
                  <ul className="mt-0.5 text-xs text-muted-foreground">
                    {person.reasons.map((reason) => (
                      <li key={reason} className={cn(person.atLimit && reason.startsWith("Heavy workload") && "font-bold text-brand-red")}>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-label={`Assign ${person.name}`}
                  aria-pressed={selected}
                  onClick={() => onPick(person.userId)}
                  className="shrink-0 self-start"
                >
                  {selected ? "Assigned" : "Assign"}
                </Button>
              </li>
            );
          })}
        </ol>
      )}

      {heldBack.map((person) => (
        <p key={person.userId} className="text-xs">
          <span className="font-bold text-brand-red">Not suggested: </span>
          {person.name} is at the workload limit ({person.activeTasks} active tasks).
        </p>
      ))}
    </section>
  );
}
