"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PriorityChip } from "@/components/priority-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTask } from "@/features/tasks/actions";
import { TaskFilterBar } from "@/features/tasks/task-filter-bar";
import { EMPTY_FILTERS, filterTasks } from "@/features/tasks/task-filters";
import { TaskForm, type EditableTask, type TaskFormOptions } from "@/features/tasks/task-form";
import { STATUS_LABELS, type TaskStatus } from "@/features/tasks/transitions";
import { safeCall } from "@/lib/action-result";
import { formatManilaDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type TaskRow = EditableTask & {
  status: TaskStatus;
  deadline: Date;
  categoryName: string;
  assigneeName: string | null;
};

export function TasksTable({
  projectId,
  tasks,
  canManage,
  options,
  viewerId,
}: {
  projectId: string;
  tasks: TaskRow[];
  canManage: boolean;
  options: TaskFormOptions;
  viewerId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TaskRow | "new" | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [now] = useState(() => new Date());

  const shown = filterTasks(tasks, filters, viewerId, now);
  const people = [...new Map(tasks.filter((task) => task.assigneeId && task.assigneeId !== viewerId).map((task) => [task.assigneeId!, task.assigneeName ?? ""])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const categories = [...new Map(tasks.map((task) => [task.categoryId, task.categoryName])).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  async function remove(task: TaskRow) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const result = await safeCall(() => deleteTask(projectId, task.id));
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Task deleted");
    router.refresh();
  }

  return (
    <main className="flex flex-col gap-4">
      {canManage && (
        <Button className="self-start" onClick={() => setEditing("new")}>New task</Button>
      )}
      {tasks.length === 0 ? (
        <p className="text-muted-foreground">
          {canManage ? "No tasks yet. Create the first one to get your team moving." : "No tasks yet. Your lead hasn't added any."}
        </p>
      ) : (
        <>
        <TaskFilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories}
          people={people}
          showMine={tasks.some((task) => task.assigneeId === viewerId)}
          shownCount={shown.length}
          totalCount={tasks.length}
        />
        {shown.length === 0 ? (
          <p className="text-muted-foreground">No tasks match these filters. Try removing one, or clear them all.</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Deadline</TableHead>
              {canManage && <TableHead><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-bold whitespace-normal">{task.title}</TableCell>
                <TableCell>{task.categoryName}</TableCell>
                <TableCell><PriorityChip priority={task.priority} /></TableCell>
                <TableCell><Badge variant="secondary">{STATUS_LABELS[task.status]}</Badge></TableCell>
                <TableCell>{task.assigneeName ?? "Unassigned"}</TableCell>
                <TableCell className={cn("tabular-nums", task.status !== "DONE" && task.deadline.getTime() < now.getTime() && "font-bold text-brand-red")}>{formatManilaDate(task.deadline)}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="edit" size="sm" onClick={() => setEditing(task)}>Edit</Button>
                    {task.status !== "DONE" && (
                      <Button variant="destructive" size="sm" onClick={() => remove(task)}>Delete</Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
        </>
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New task" : "Edit task"}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <TaskForm
              projectId={projectId}
              task={editing === "new" ? undefined : editing}
              {...options}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
