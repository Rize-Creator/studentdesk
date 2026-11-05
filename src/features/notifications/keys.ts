import { isSendBack, type TaskStatus } from "@/features/tasks/transitions";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_IN_REVIEW"
  | "TASK_RETURNED"
  | "TASK_DONE"
  | "MILESTONE_COMPLETED"
  | "DEADLINE_REMINDER"
  | "TASK_OVERDUE"
  | "READINESS_SUMMARY";

export function dedupeKey(type: NotificationType, ...parts: string[]): string {
  return [type, ...parts].join(":");
}

export function moveNotificationType(from: TaskStatus, to: TaskStatus) {
  if (from === to) return null;
  if (to === "REVIEW") return "TASK_IN_REVIEW" as const;
  if (to === "DONE") return "TASK_DONE" as const;
  if (isSendBack(from, to)) return "TASK_RETURNED" as const;
  return null;
}

export function withoutActor(recipientIds: string[], actorId: string): string[] {
  return [...new Set(recipientIds)].filter((id) => id !== actorId);
}
