"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMilestone, deleteMilestone, setMilestoneComplete, updateMilestone } from "@/features/projects/actions";
import { canToggleComplete, isRowComplete, milestoneProgress } from "@/features/projects/page-summaries";
import { safeCall, type ActionResult } from "@/lib/action-result";
import { formatManilaDate, manilaDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type MilestoneRow = {
  id: string;
  title: string;
  dueDate: Date;
  due: { text: string; overdue: boolean };
  markedComplete: boolean;
  done: number;
  total: number;
};

function MilestoneForm({
  initial,
  submitLabel,
  stacked,
  onSubmit,
}: {
  initial: { title: string; dueDate: string };
  submitLabel: string;
  stacked?: boolean;
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
    <form onSubmit={submit} className={cn("grid items-end gap-3", !stacked && "sm:grid-cols-[1fr_11rem_auto]")}>
      <Field id={`${submitLabel}-title`} label="Milestone" errors={errors.title}>
        <Input id={`${submitLabel}-title`} className="bg-card" required value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      </Field>
      <Field id={`${submitLabel}-due`} label="Due date" errors={errors.dueDate}>
        <Input id={`${submitLabel}-due`} className="bg-card" type="date" required value={values.dueDate} onChange={(e) => setValues({ ...values, dueDate: e.target.value })} />
      </Field>
      <Button type="submit" disabled={pending} className={cn(stacked && "justify-self-start")}>{submitLabel}</Button>
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
  const progress = milestoneProgress(milestones);

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
    <main className={cn("grid items-start gap-8", canManage && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
      <div className="flex min-w-0 flex-col gap-4">
        {milestones.length === 0 ? (
          <p className="text-muted-foreground">
            {canManage ? "No milestones yet. Add the checkpoints your team needs to reach." : "No milestones yet."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-semibold">{progress.complete} of {progress.total} milestones complete</p>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}
        <ul className="divide-y divide-border">
          {milestones.map((milestone) => {
            const complete = isRowComplete(milestone);
            const percent = milestone.total === 0 ? 0 : Math.round((milestone.done * 100) / milestone.total);
            return (
              <li key={milestone.id} className="flex flex-col gap-2 py-4">
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
                  <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="min-w-0 flex-1 basis-40 font-bold">{milestone.title}</span>
                      {complete ? (
                        <Badge>Complete</Badge>
                      ) : (
                        <span className={cn("text-sm", milestone.due.overdue ? "font-bold text-brand-red" : "text-muted-foreground")}>{milestone.due.text}</span>
                      )}
                      <span className="text-sm tabular-nums">{formatManilaDate(milestone.dueDate)}</span>
                      {canManage && (
                        <span className="flex gap-1">
                          {canToggleComplete(milestone) && (
                            <Button variant="ghost" size="sm" onClick={() => run(() => setMilestoneComplete(projectId, milestone.id, !milestone.markedComplete), milestone.markedComplete ? "Marked not complete" : "Marked complete")}>
                              {milestone.markedComplete ? "Mark not complete" : "Mark complete"}
                            </Button>
                          )}
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
                    {milestone.total === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks linked yet.</p>
                    ) : (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="whitespace-nowrap">{milestone.done} of {milestone.total} tasks done</span>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {canManage && (
        <section className="flex flex-col gap-3 rounded-xl bg-muted p-4">
          <h2 className="text-lg font-bold">Add a milestone</h2>
          <MilestoneForm
            key={formKey}
            stacked
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
