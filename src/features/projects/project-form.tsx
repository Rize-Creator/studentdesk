"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/features/projects/actions";
import { safeCall } from "@/lib/action-result";

type Values = { name: string; description: string; type: "EVENT" | "ACADEMIC"; startDate: string; targetDate: string };

export function ProjectForm({ projectId, initial }: { projectId?: string; initial?: Values }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(
    initial ?? { name: "", description: "", type: "EVENT", startDate: "", targetDate: "" },
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const set = (patch: Partial<Values>) => setValues((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    if (projectId) {
      const result = await safeCall(() => updateProject(projectId, values));
      setPending(false);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success("Project saved");
      router.refresh();
      return;
    }
    const result = await safeCall(() => createProject(values));
    setPending(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }
    router.push(`/projects/${result.data.id}`);
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <Field id="name" label="Project name" errors={errors.name}>
        <Input id="name" required value={values.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field id="description" label="Description" errors={errors.description}>
        <Textarea id="description" value={values.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>
      <Field id="type" label="Type" errors={errors.type}>
        <select id="type" className={selectClass} value={values.type} onChange={(e) => set({ type: e.target.value as Values["type"] })}>
          <option value="EVENT">Event</option>
          <option value="ACADEMIC">Academic project</option>
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="startDate" label="Start date" errors={errors.startDate}>
          <Input id="startDate" type="date" required value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </Field>
        <Field id="targetDate" label="Target date" errors={errors.targetDate}>
          <Input id="targetDate" type="date" required value={values.targetDate} onChange={(e) => set({ targetDate: e.target.value })} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {projectId ? "Save changes" : "Create project"}
      </Button>
    </form>
  );
}
