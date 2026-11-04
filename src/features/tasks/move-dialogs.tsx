"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deliverableSchema, sendBackSchema } from "@/lib/validators/schemas";

export function SubmitReviewDialog({
  taskTitle,
  onSubmit,
  onCancel,
}: {
  taskTitle: string;
  onSubmit: (values: { deliverableUrl: string | null; deliverableNote: string | null }) => void;
  onCancel: () => void;
}) {
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = deliverableSchema.safeParse({ deliverableUrl: link, deliverableNote: note });
    if (!parsed.success) {
      setLinkError(parsed.error.issues[0]?.message);
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit for review</DialogTitle>
          <DialogDescription>
            {taskTitle}. Add a link to your work if there is one, such as a Google Drive file. Both fields are optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="deliverable-link" label="Deliverable link" errors={linkError ? [linkError] : undefined}>
            <Input id="deliverable-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="drive.google.com/..." />
          </Field>
          <Field id="deliverable-note" label="Note">
            <Textarea id="deliverable-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" className="self-start">Submit for review</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SendBackDialog({
  taskTitle,
  onSubmit,
  onCancel,
}: {
  taskTitle: string;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = sendBackSchema.safeParse({ note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    onSubmit(parsed.data.note);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send back</DialogTitle>
          <DialogDescription>{taskTitle}. The assignee will see your note.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field id="send-back-note" label="What should they change?" errors={error ? [error] : undefined}>
            <Textarea id="send-back-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" className="self-start">Send back</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
