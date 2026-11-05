import type { ProjectRole } from "@/lib/permissions";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export const TASK_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

export const MEMBER_STAGES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW"];
const NEEDS_ASSIGNEE: TaskStatus[] = ["IN_PROGRESS", "REVIEW", "DONE"];

export type MoveInput = {
  role: ProjectRole;
  archived: boolean;
  isAssignee: boolean;
  hasAssignee: boolean;
  from: TaskStatus;
  to: TaskStatus;
  note?: string | null;
};

export type MoveDenied = "archived" | "adviser" | "lead-only" | "not-assignee" | "needs-assignee" | "note-required";

const MESSAGES: Record<MoveDenied, string> = {
  archived: "This project is archived.",
  adviser: "Advisers can view tasks but can't move them.",
  "lead-only": "Only a lead can make that move.",
  "not-assignee": "This task isn't assigned to you anymore.",
  "needs-assignee": "Assign someone before moving this task there.",
  "note-required": "Add a note so the assignee knows what to change.",
};

const deny = (reason: MoveDenied) => ({ ok: false as const, reason, message: MESSAGES[reason] });

// A Backlog card has nobody working on it, so giving it an assignee makes it their To Do.
export function statusAfterAssigning(status: TaskStatus, assigneeId: string | null): TaskStatus {
  return status === "BACKLOG" && assigneeId ? "TODO" : status;
}

export function isSendBack(from: TaskStatus, to: TaskStatus): boolean {
  return from === "REVIEW" && to !== "REVIEW" && to !== "DONE";
}

export function checkMove(input: MoveInput): { ok: true } | ReturnType<typeof deny> {
  const { role, archived, isAssignee, hasAssignee, from, to, note } = input;
  if (archived) return deny("archived");
  if (role === "ADVISER") return deny("adviser");
  if (role === "MEMBER") {
    if (!isAssignee) return deny("not-assignee");
    if (!MEMBER_STAGES.includes(from) || !MEMBER_STAGES.includes(to)) return deny("lead-only");
  }
  if (from !== to && !hasAssignee && NEEDS_ASSIGNEE.includes(to)) return deny("needs-assignee");
  // A member pulling their own task back from Review needs no note. Only a lead's send-back does.
  if (role === "LEAD" && isSendBack(from, to) && !note?.trim()) return deny("note-required");
  return { ok: true };
}
