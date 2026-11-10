"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Field, selectClass } from "@/components/field";
import { PriorityChip } from "@/components/priority-chip";
import { StageBadge } from "@/components/stage-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteTask } from "@/features/tasks/actions";
import type { BoardTask } from "@/features/tasks/queries";
import { leadComments } from "@/features/tasks/task-comments";
import { TaskForm, type TaskFormOptions } from "@/features/tasks/task-form";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/features/tasks/transitions";
import { safeCall } from "@/lib/action-result";
import { formatManilaDate } from "@/lib/dates";
import { can, type ProjectRole } from "@/lib/permissions";

type TaskDetailData = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  deadline: string;
  assigneeId: string | null;
  milestoneId: string | null;
  deliverableUrl: string | null;
  deliverableNote: string | null;
  category: { name: string };
  assignee: { name: string } | null;
  milestone: { title: string } | null;
  history: {
    id: string;
    fromStatus: TaskStatus | null;
    toStatus: TaskStatus;
    note: string | null;
    changedAt: string;
    changedBy: { name: string };
  }[];
  assignments: {
    id: string;
    assignedAt: string;
    assignee: { name: string };
    assignedBy: { name: string };
  }[];
};

function historyEvents(task: TaskDetailData) {
  const moves = task.history.map((row) => ({
    id: row.id,
    at: row.changedAt,
    text: row.fromStatus
      ? `${row.changedBy.name} moved this from ${STATUS_LABELS[row.fromStatus]} to ${STATUS_LABELS[row.toStatus]}`
      : `${row.changedBy.name} created this in ${STATUS_LABELS[row.toStatus]}`,
  }));
  const assignments = task.assignments.map((row) => ({
    id: row.id,
    at: row.assignedAt,
    text: `${row.assignedBy.name} assigned this to ${row.assignee.name}`,
  }));
  return [...moves, ...assignments].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function TaskDetail({
  projectId,
  task,
  role,
  archived,
  allowedStages,
  options,
  onMove,
  onChanged,
  onClose,
}: {
  projectId: string;
  task: BoardTask;
  role: ProjectRole;
  archived: boolean;
  allowedStages: TaskStatus[];
  options: TaskFormOptions;
  onMove: (to: TaskStatus) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { data, isError } = useQuery({
    queryKey: ["task", task.id, task.status],
    queryFn: async (): Promise<TaskDetailData> => {
      const response = await fetch(`/api/projects/${projectId}/tasks/${task.id}`);
      if (!response.ok) throw new Error("Couldn't load this task.");
      return (await response.json()).task;
    },
  });
  const canManage = can(role, "tasks:manage") && !archived;

  async function remove() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const result = await safeCall(() => deleteTask(projectId, task.id));
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Task deleted");
    onChanged();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : task.title}</DialogTitle>
        </DialogHeader>
        {isError && <p role="alert" className="text-sm text-destructive">This task couldn&apos;t be loaded. Close this and try again.</p>}
        {!isError && !data && <Skeleton className="h-40 w-full" />}
        {data && editing && (
          <TaskForm
            projectId={projectId}
            task={data}
            {...options}
            onDone={() => {
              setEditing(false);
              onChanged();
            }}
          />
        )}
        {data && !editing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityChip priority={data.priority} />
              <span className="text-sm text-muted-foreground">{data.category.name}</span>
            </div>
            {data.description && <p className="text-sm whitespace-pre-wrap">{data.description}</p>}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Assignee</dt>
              <dd>{data.assignee?.name ?? "Unassigned"}</dd>
              <dt className="text-muted-foreground">Deadline</dt>
              <dd>{formatManilaDate(new Date(data.deadline))}</dd>
              {data.milestone && (
                <>
                  <dt className="text-muted-foreground">Milestone</dt>
                  <dd>{data.milestone.title}</dd>
                </>
              )}
            </dl>
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <MessageSquare aria-hidden className="size-4 text-primary" />
                Lead&apos;s comments
              </h3>
              {leadComments(data.history).length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. A lead adds one when sending this task back from Review.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {leadComments(data.history).map((comment) => (
                    <li key={comment.id} className="rounded-lg border-l-4 border-primary bg-tint p-3 text-sm">
                      <p className="break-words whitespace-pre-wrap">{comment.text}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {comment.author}, {formatManilaDate(new Date(comment.at))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {(data.deliverableUrl || data.deliverableNote) && (
              <section className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
                <h3 className="font-bold">Deliverable</h3>
                {data.deliverableUrl && (
                  <a href={data.deliverableUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-2">
                    {data.deliverableUrl}
                  </a>
                )}
                {data.deliverableNote && <p className="whitespace-pre-wrap">{data.deliverableNote}</p>}
              </section>
            )}
            {allowedStages.length > 1 ? (
              <Field id="task-status" label="Status">
                <select
                  id="task-status"
                  className={selectClass}
                  value={task.status}
                  onChange={(e) => onMove(e.target.value as TaskStatus)}
                >
                  {TASK_STATUSES.filter((stage) => allowedStages.includes(stage)).map((stage) => (
                    <option key={stage} value={stage}>{STATUS_LABELS[stage]}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Status:</span><StageBadge status={task.status} /></p>
            )}
            {canManage && (
              <div className="flex gap-2">
                <Button variant="edit" size="sm" onClick={() => setEditing(true)}>Edit task</Button>
                {task.status !== "DONE" && <Button variant="destructive" size="sm" onClick={remove}>Delete task</Button>}
              </div>
            )}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-bold">History</h3>
              <ol className="flex flex-col gap-2 text-sm">
                {historyEvents(data).map((event) => (
                  <li key={event.id} className="border-l-2 border-border pl-3">
                    <p>{event.text}</p>
                    <p className="text-xs text-muted-foreground">{formatManilaDate(new Date(event.at))}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
