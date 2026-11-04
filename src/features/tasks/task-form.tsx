"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SuggestionPanel, useSuggestions } from "@/features/recommendations/suggestion-panel";
import { createTask, updateTask } from "@/features/tasks/actions";
import { safeCall } from "@/lib/action-result";
import { manilaDateKey } from "@/lib/dates";

export type TaskFormOptions = {
  categories: { id: string; name: string }[];
  members: { userId: string; name: string }[];
  milestones: { id: string; title: string }[];
};

export type EditableTask = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  deadline: string | Date;
  assigneeId: string | null;
  milestoneId: string | null;
};

export function TaskForm({
  projectId,
  task,
  categories,
  members,
  milestones,
  onDone,
}: TaskFormOptions & { projectId: string; task?: EditableTask; onDone: () => void }) {
  const [values, setValues] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    categoryId: task?.categoryId ?? "",
    priority: task?.priority ?? "MEDIUM",
    deadline: task ? manilaDateKey(new Date(task.deadline)) : "",
    assigneeId: task?.assigneeId ?? "",
    milestoneId: task?.milestoneId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const suggestions = useSuggestions(projectId, values.categoryId);
  const set = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    // Any pick in the top 3 counts as following a suggestion, however the lead picked it.
    const recommendedRank = suggestions.data?.suggestions.find((person) => person.userId === values.assigneeId)?.rank ?? null;
    const input = { ...values, recommendedRank };
    const result = await safeCall<unknown>(() => (task ? updateTask(projectId, task.id, input) : createTask(projectId, input)));
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }
    toast.success(task ? "Task saved" : "Task created");
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field id="task-title" label="Title" errors={errors.title}>
        <Input id="task-title" required value={values.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field id="task-description" label="Description" errors={errors.description}>
        <Textarea id="task-description" value={values.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="task-category" label="Category" errors={errors.categoryId}>
          <select id="task-category" required className={selectClass} value={values.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
            <option value="">Choose a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </Field>
        <Field id="task-priority" label="Priority" errors={errors.priority}>
          <select id="task-priority" className={selectClass} value={values.priority} onChange={(e) => set({ priority: e.target.value as typeof values.priority })}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </Field>
        <Field id="task-deadline" label="Deadline" errors={errors.deadline}>
          <Input id="task-deadline" type="date" required value={values.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
        <Field id="task-milestone" label="Milestone" errors={errors.milestoneId}>
          <select id="task-milestone" className={selectClass} value={values.milestoneId} onChange={(e) => set({ milestoneId: e.target.value })}>
            <option value="">None</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
            ))}
          </select>
        </Field>
      </div>
      <SuggestionPanel
        projectId={projectId}
        categoryId={values.categoryId}
        selectedUserId={values.assigneeId}
        query={suggestions}
        onPick={(userId) => set({ assigneeId: userId })}
      />
      <Field id="task-assignee" label="Assignee" errors={errors.assigneeId}>
        <select id="task-assignee" className={selectClass} value={values.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>{member.name}</option>
          ))}
        </select>
      </Field>
      <Button type="submit" disabled={pending} className="self-start">Save task</Button>
    </form>
  );
}
