"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CalendarDays, Link2, MessageSquare } from "lucide-react";
import { PriorityChip } from "@/components/priority-chip";
import type { BoardTask } from "@/features/tasks/queries";
import { formatManilaDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const NEEDS_ASSIGNEE = ["IN_PROGRESS", "REVIEW", "DONE"];

function initials(name: string): string {
  return name
    .replace(/^Prof\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BoardCardView({
  task,
  now,
  mine,
  onOpen,
  className,
}: {
  task: BoardTask;
  now: number;
  mine: boolean;
  onOpen?: () => void;
  className?: string;
}) {
  const overdue = task.status !== "DONE" && Date.parse(task.deadline) < now;
  const missingAssignee = !task.assigneeId && NEEDS_ASSIGNEE.includes(task.status);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-xs",
        mine && "border-l-4 border-l-primary",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <PriorityChip priority={task.priority} />
        <span className="text-xs text-muted-foreground">{task.categoryName}</span>
      </div>
      {task.commentCount > 0 && (
        <span className="flex items-center gap-1 self-start rounded-md bg-tint px-1.5 py-0.5 text-xs font-semibold text-primary">
          <MessageSquare aria-hidden className="size-3" />
          {task.commentCount} {task.commentCount === 1 ? "comment" : "comments"}
        </span>
      )}
      <button type="button" onClick={onOpen} className="text-left text-sm font-bold hover:text-primary">
        {task.title}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-2 text-xs">
        <span className={cn("flex items-center gap-1 whitespace-nowrap", overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>
          <CalendarDays aria-hidden className="size-3.5" />
          {overdue && "Overdue: "}
          {formatManilaDate(new Date(task.deadline))}
          {task.hasDeliverable && <Link2 aria-label="Has a deliverable link" className="ml-1 size-3.5" />}
        </span>
        {mine ? (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold text-primary-foreground">
            You
          </span>
        ) : task.assigneeName ? (
          <span
            title={task.assigneeName}
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-tint text-[0.65rem] font-bold text-primary"
          >
            <span className="sr-only">{task.assigneeName}</span>
            <span aria-hidden>{initials(task.assigneeName)}</span>
          </span>
        ) : (
          <span className={cn("shrink-0", missingAssignee ? "font-bold text-brand-red" : "text-muted-foreground")}>
            Unassigned
          </span>
        )}
      </div>
    </div>
  );
}

export function SortableBoardCard({
  task,
  now,
  mine,
  movable,
  onOpen,
}: {
  task: BoardTask;
  now: number;
  mine: boolean;
  movable: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !movable,
  });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role={undefined}
      tabIndex={movable ? 0 : undefined}
      aria-label={movable ? `Move ${task.title}` : undefined}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={cn(
        "touch-manipulation rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring",
        movable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <BoardCardView task={task} now={now} mine={mine} onOpen={onOpen} />
    </li>
  );
}
