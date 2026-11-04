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
import { TaskForm, type EditableTask, type TaskFormOptions } from "@/features/tasks/task-form";
import { STATUS_LABELS, type TaskStatus } from "@/features/tasks/transitions";
import { safeCall } from "@/lib/action-result";
import { formatManilaDate } from "@/lib/dates";

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
}: {
  projectId: string;
  tasks: TaskRow[];
  canManage: boolean;
  options: TaskFormOptions;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TaskRow | "new" | null>(null);

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
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-bold whitespace-normal">{task.title}</TableCell>
                <TableCell>{task.categoryName}</TableCell>
                <TableCell><PriorityChip priority={task.priority} /></TableCell>
                <TableCell><Badge variant="secondary">{STATUS_LABELS[task.status]}</Badge></TableCell>
                <TableCell>{task.assigneeName ?? "Unassigned"}</TableCell>
                <TableCell className="tabular-nums">{formatManilaDate(task.deadline)}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(task)}>Edit</Button>
                    {task.status !== "DONE" && (
                      <Button variant="ghost" size="sm" onClick={() => remove(task)}>Delete</Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
