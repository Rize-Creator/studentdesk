"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleDashed, CircleDot, Eye, Inbox, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BoardCardView, SortableBoardCard } from "@/features/tasks/board-card";
import { boardCollision } from "@/features/tasks/board-collision";
import { splitByOwner } from "@/features/tasks/board-groups";
import { SendBackDialog, SubmitReviewDialog } from "@/features/tasks/move-dialogs";
import { dropTarget, positionAtEnd, positionBetween } from "@/features/tasks/positions";
import { moveTask } from "@/features/tasks/actions";
import type { BoardTask } from "@/features/tasks/queries";
import { TaskDetail } from "@/features/tasks/task-detail";
import { TaskForm, type TaskFormOptions } from "@/features/tasks/task-form";
import { STATUS_LABELS, TASK_STATUSES, checkMove, type TaskStatus } from "@/features/tasks/transitions";
import { safeCall } from "@/lib/action-result";
import { can, type ProjectRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const REFRESH_MS = 10_000;

const STAGE_ICONS: Record<TaskStatus, LucideIcon> = {
  BACKLOG: Inbox,
  TODO: CircleDashed,
  IN_PROGRESS: CircleDot,
  REVIEW: Eye,
  DONE: CircleCheck,
};

type MoveRequest = { task: BoardTask; to: TaskStatus; beforeId: string | null; afterId: string | null };
type MoveInput = MoveRequest & { note?: string | null; deliverableUrl?: string | null; deliverableNote?: string | null };
type PendingDialog = { kind: "review" | "sendBack"; move: MoveRequest };
type BoardData = { tasks: BoardTask[] };

function applyMove(tasks: BoardTask[], { task, to, beforeId, afterId }: MoveInput): BoardTask[] {
  const positionOf = (id: string | null) => tasks.find((t) => t.id === id)?.position ?? null;
  const before = positionOf(beforeId);
  const after = positionOf(afterId);
  const column = tasks.filter((t) => t.status === to && t.id !== task.id).map((t) => t.position);
  const position =
    before === null && after === null
      ? positionAtEnd(column.length > 0 ? Math.max(...column) : null)
      : positionBetween(before, after);
  return tasks.map((t) => (t.id === task.id ? { ...t, status: to, position } : t));
}

function GroupLabel({ children }: { children: string }) {
  return <li className="px-1 pt-1 text-xs font-bold text-muted-foreground first:pt-0">{children}</li>;
}

function Column({
  status,
  tasks,
  children,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const Icon = STAGE_ICONS[status];
  return (
    <section
      aria-label={STATUS_LABELS[status]}
      className="flex w-72 shrink-0 snap-start flex-col gap-2 lg:w-auto lg:min-w-44 lg:flex-1 lg:shrink"
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-bold">
        <Icon aria-hidden className={cn("size-4", status === "DONE" ? "text-primary" : "text-muted-foreground")} />
        {STATUS_LABELS[status]}
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{tasks.length}</span>
      </h2>
      <div
        ref={setNodeRef}
        className={cn("min-h-40 flex-1 rounded-2xl bg-muted p-2 transition-colors", isOver && "bg-tint")}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">{children}</ul>
        </SortableContext>
      </div>
    </section>
  );
}

export function Board({
  projectId,
  initialTasks,
  initialOpenTaskId,
  viewerId,
  role,
  archived,
  options,
}: {
  projectId: string;
  initialTasks: BoardTask[];
  initialOpenTaskId: string | null;
  viewerId: string;
  role: ProjectRole;
  archived: boolean;
  options: TaskFormOptions;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["board", projectId];
  const [dragging, setDragging] = useState<BoardTask | null>(null);
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(initialOpenTaskId);
  const [creating, setCreating] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [now] = useState(() => Date.now());

  const { data } = useQuery({
    queryKey,
    initialData: { tasks: initialTasks },
    refetchInterval: dragging ? false : REFRESH_MS,
    queryFn: async (): Promise<BoardData> => {
      const response = await fetch(`/api/projects/${projectId}/board`);
      if (!response.ok) throw new Error("Couldn't refresh the board.");
      return response.json();
    },
  });
  const tasks = data.tasks;

  const mutation = useMutation({
    mutationFn: async ({ task, to, beforeId, afterId, note, deliverableUrl, deliverableNote }: MoveInput) => {
      const result = await safeCall(() =>
        moveTask(projectId, task.id, { to, beforeId, afterId, note, deliverableUrl, deliverableNote }),
      );
      if (!result.ok) throw new Error(result.message);
    },
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BoardData>(queryKey);
      queryClient.setQueryData<BoardData>(queryKey, (old) => (old ? { tasks: applyMove(old.tasks, move) } : old));
      return { previous };
    },
    onError: (error, _move, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Someone else's move also changes the summary in the side panel, so refresh it when stages change.
  const stageSignature = tasks.map((task) => `${task.id}:${task.status}`).sort().join();
  const lastSignature = useRef(stageSignature);
  useEffect(() => {
    if (lastSignature.current === stageSignature) return;
    lastSignature.current = stageSignature;
    router.refresh();
  }, [router, stageSignature]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const checkFor = (task: BoardTask, to: TaskStatus, note?: string) =>
    checkMove({
      role,
      archived,
      isAssignee: task.assigneeId === viewerId,
      hasAssignee: task.assigneeId !== null,
      from: task.status,
      to,
      note,
    });

  function requestMove(move: MoveRequest) {
    const { task, to } = move;
    const check = checkFor(task, to);
    if (!check.ok) {
      if (check.reason === "note-required") {
        setOpenTaskId(null);
        setPending({ kind: "sendBack", move });
      } else {
        toast.error(check.message);
      }
      return;
    }
    if (to === "REVIEW" && task.status !== "REVIEW") {
      setOpenTaskId(null);
      setPending({ kind: "review", move });
      return;
    }
    mutation.mutate(move);
  }

  function handleDragStart(event: DragStartEvent) {
    setDragging(tasks.find((task) => task.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null);
    const task = tasks.find((t) => t.id === event.active.id);
    if (!task || !event.over) return;
    const target = dropTarget(tasks, task.id, String(event.over.id));
    if (target) requestMove({ task, ...target });
  }

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey });
    router.refresh();
  };

  const myTaskCount = splitByOwner(tasks, viewerId).mine.length;
  const showOnlyMine = onlyMine && myTaskCount > 0;
  const openTask = tasks.find((task) => task.id === openTaskId);
  const canCreate = can(role, "tasks:manage") && !archived;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>New task</Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {archived ? "This project is archived, so its board is read-only." : role === "ADVISER" ? "You can view this board but not change it." : "You can move tasks assigned to you."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {myTaskCount > 0 && (
            <div role="group" aria-label="Show tasks" className="flex rounded-lg bg-muted p-0.5">
              {[
                { label: "Everyone", value: false },
                { label: `My tasks (${myTaskCount})`, value: true },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={showOnlyMine === value}
                  onClick={() => setOnlyMine(value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-semibold",
                    showOnlyMine === value ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Updates automatically every 10 seconds</p>
        </div>
      </div>

      <DndContext
        id="board"
        sensors={sensors}
        collisionDetection={boardCollision}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="thin-scroll relative -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
          {TASK_STATUSES.map((status) => {
            const column = tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position);
            const { mine, others } = splitByOwner(column, viewerId);
            const visibleOthers = showOnlyMine ? [] : others;
            const renderCard = (task: BoardTask) => (
              <SortableBoardCard
                key={task.id}
                task={task}
                now={now}
                mine={task.assigneeId === viewerId}
                movable={checkFor(task, task.status).ok}
                onOpen={() => setOpenTaskId(task.id)}
              />
            );
            return (
              <Column key={status} status={status} tasks={[...mine, ...visibleOthers]}>
                {mine.length > 0 && <GroupLabel>Your tasks</GroupLabel>}
                {mine.map(renderCard)}
                {mine.length > 0 && visibleOthers.length > 0 && <GroupLabel>Other members</GroupLabel>}
                {visibleOthers.map(renderCard)}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{dragging && <BoardCardView task={dragging} now={now} mine={dragging.assigneeId === viewerId} className="rotate-1 shadow-lg" />}</DragOverlay>
      </DndContext>

      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {canCreate ? "No tasks yet. Create the first one to get your team moving." : "No tasks yet. Your lead hasn't added any."}
        </p>
      )}

      {creating && (
        <Dialog open onOpenChange={(open) => !open && setCreating(false)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New task</DialogTitle>
            </DialogHeader>
            <TaskForm
              projectId={projectId}
              {...options}
              onDone={() => {
                setCreating(false);
                afterChange();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {openTask && (
        <TaskDetail
          key={openTask.id}
          projectId={projectId}
          task={openTask}
          role={role}
          archived={archived}
          options={options}
          allowedStages={TASK_STATUSES.filter((stage) => stage === openTask.status || checkFor(openTask, stage, "note").ok)}
          onMove={(to) => requestMove({ task: openTask, to, beforeId: null, afterId: null })}
          onChanged={afterChange}
          onClose={() => setOpenTaskId(null)}
        />
      )}

      {pending?.kind === "review" && (
        <SubmitReviewDialog
          taskTitle={pending.move.task.title}
          onCancel={() => setPending(null)}
          onSubmit={(values) => {
            mutation.mutate({ ...pending.move, ...values });
            setPending(null);
          }}
        />
      )}

      {pending?.kind === "sendBack" && (
        <SendBackDialog
          taskTitle={pending.move.task.title}
          onCancel={() => setPending(null)}
          onSubmit={(note) => {
            mutation.mutate({ ...pending.move, note });
            setPending(null);
          }}
        />
      )}
    </main>
  );
}
