"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMilestone, deleteMilestone, setMilestoneComplete, updateMilestone } from "@/features/projects/actions";
import { safeCall, type ActionResult } from "@/lib/action-result";
import { formatManilaDate, manilaDateKey } from "@/lib/dates";

export type MilestoneRow = {
  id: string;
  title: string;
  dueDate: Date;
  markedComplete: boolean;
  done: number;
  total: number;
};

function MilestoneForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: { title: string; dueDate: string };
  submitLabel: string;
  onSubmit: (values: { title: string; dueDate: string }) => Promise<ActionResult>;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    const result = await safeCall(() => onSubmit(values));
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={submit} className="grid items-end gap-3 sm:grid-cols-[1fr_11rem_auto]">
      <Field id={`${submitLabel}-title`} label="Milestone" errors={errors.title}>
        <Input id={`${submitLabel}-title`} required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      </Field>
      <Field id={`${submitLabel}-due`} label="Due date" errors={errors.dueDate}>
        <Input id={`${submitLabel}-due`} type="date" required value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
      </Field>
      <Button type="submit" disabled={pending}>{submitLabel}</Button>
    </form>
  );
}

export function MilestonesManager({
  projectId,
  milestones,
  canManage,
}: {
  projectId: string;
  milestones: MilestoneRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function run(action: () => Promise<ActionResult>, done: string) {
    const result = await safeCall(action);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(done);
    router.refresh();
  }

  return (
    <main className="flex max-w-3xl flex-col gap-6">
      {milestones.length === 0 && (
        <p className="text-muted-foreground">
          {canManage ? "No milestones yet. Add the checkpoints your team needs to reach." : "No milestones yet."}
        </p>
      )}
      <ul className="divide-y divide-border">
        {milestones.map((milestone) => {
          const complete = milestone.markedComplete || (milestone.total > 0 && milestone.done === milestone.total);
          return (
            <li key={milestone.id} className="flex flex-col gap-3 py-3">
              {editingId === milestone.id ? (
                <MilestoneForm
                  initial={{ title: milestone.title, dueDate: manilaDateKey(milestone.dueDate) }}
                  submitLabel="Save"
                  onSubmit={async (values) => {
                    const result = await updateMilestone(projectId, milestone.id, values);
                    if (result.ok) {
                      setEditingId(null);
                      toast.success("Milestone saved");
                      router.refresh();
                    }
                    return result;
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 font-bold">{milestone.title}</span>
                  {complete && <Badge>Complete</Badge>}
                  <span className="text-sm text-muted-foreground">{milestone.done} of {milestone.total} tasks done</span>
                  <span className="text-sm tabular-nums">{formatManilaDate(milestone.dueDate)}</span>
                  {canManage && (
                    <span className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => run(() => setMilestoneComplete(projectId, milestone.id, !milestone.markedComplete), milestone.markedComplete ? "Marked not complete" : "Marked complete")}>
                        {milestone.markedComplete ? "Mark not complete" : "Mark complete"}
                      </Button>
                      <Button variant="edit" size="sm" onClick={() => setEditingId(milestone.id)}>Edit</Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Delete "${milestone.title}"? Its tasks stay on the board.`)) {
                            run(() => deleteMilestone(projectId, milestone.id), "Milestone deleted");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {canManage && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Add a milestone</h2>
          <MilestoneForm
            key={formKey}
            initial={{ title: "", dueDate: "" }}
            submitLabel="Add milestone"
            onSubmit={async (values) => {
              const result = await createMilestone(projectId, values);
              if (result.ok) {
                setFormKey((key) => key + 1);
                toast.success("Milestone added");
                router.refresh();
              }
              return result;
            }}
          />
        </section>
      )}
    </main>
  );
}
