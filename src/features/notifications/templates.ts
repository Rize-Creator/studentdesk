import { READINESS_LABELS, type Readiness } from "@/features/metrics/calculations";
import { STATUS_LABELS, TASK_STATUSES, type TaskStatus } from "@/features/tasks/transitions";
import { formatManilaDate } from "@/lib/dates";

type Base = { appUrl: string; projectId: string; projectName: string };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const boardUrl = (data: Base) => `${data.appUrl}/projects/${data.projectId}/board`;
const dashboardUrl = (data: Base) => `${data.appUrl}/projects/${data.projectId}`;

function layout(heading: string, content: string, linkUrl: string, linkLabel: string): string {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2933;max-width:560px">
<h2 style="font-size:18px;margin:0 0 12px;color:#0a2472">${escapeHtml(heading)}</h2>
${content}
<p style="margin:20px 0"><a href="${escapeHtml(linkUrl)}" style="background:#0a2472;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(linkLabel)}</a></p>
<p style="font-size:12px;color:#6b7280">Sent by StudentDesk.</p>
</div>`;
}

const paragraph = (text: string) => `<p style="margin:0 0 10px">${text}</p>`;
const safe = escapeHtml;

export function taskAssignedEmail(data: Base & { taskTitle: string; deadline: Date; assignerName: string }) {
  return {
    subject: `New task: ${data.taskTitle}`,
    body: layout(
      "You have a new task",
      paragraph(`${safe(data.assignerName)} assigned you <strong>${safe(data.taskTitle)}</strong> in ${safe(data.projectName)}.`) +
        paragraph(`Deadline: ${formatManilaDate(data.deadline)}`),
      boardUrl(data),
      "Open the board",
    ),
  };
}

export function taskInReviewEmail(data: Base & { taskTitle: string; memberName: string; deliverableUrl: string | null }) {
  const link = data.deliverableUrl
    ? paragraph(`Deliverable: <a href="${safe(data.deliverableUrl)}">${safe(data.deliverableUrl)}</a>`)
    : "";
  return {
    subject: `Ready for review: ${data.taskTitle}`,
    body: layout(
      "A task is ready for review",
      paragraph(`${safe(data.memberName)} moved <strong>${safe(data.taskTitle)}</strong> to Review in ${safe(data.projectName)}.`) + link,
      boardUrl(data),
      "Review it",
    ),
  };
}

export function taskReturnedEmail(data: Base & { taskTitle: string; leadName: string; note: string | null }) {
  return {
    subject: `Sent back: ${data.taskTitle}`,
    body: layout(
      "A task needs more work",
      paragraph(`${safe(data.leadName)} sent back <strong>${safe(data.taskTitle)}</strong> in ${safe(data.projectName)}.`) +
        (data.note ? paragraph(`Note: ${safe(data.note)}`) : ""),
      boardUrl(data),
      "Open the board",
    ),
  };
}

export function taskDoneEmail(data: Base & { taskTitle: string }) {
  return {
    subject: `Done: ${data.taskTitle}`,
    body: layout(
      "Your task is done",
      paragraph(`<strong>${safe(data.taskTitle)}</strong> in ${safe(data.projectName)} was marked Done. Thank you!`),
      boardUrl(data),
      "Open the board",
    ),
  };
}

export function milestoneCompletedEmail(data: Base & { milestoneTitle: string }) {
  return {
    subject: `Milestone reached: ${data.milestoneTitle}`,
    body: layout(
      "A milestone was completed",
      paragraph(`<strong>${safe(data.milestoneTitle)}</strong> in ${safe(data.projectName)} is complete.`),
      dashboardUrl(data),
      "Open the dashboard",
    ),
  };
}

export function deadlineReminderEmail(data: Base & { taskTitle: string; deadline: Date }) {
  return {
    subject: `Due soon: ${data.taskTitle}`,
    body: layout(
      "A task is due soon",
      paragraph(`<strong>${safe(data.taskTitle)}</strong> in ${safe(data.projectName)} is due ${formatManilaDate(data.deadline)}.`),
      boardUrl(data),
      "Open the board",
    ),
  };
}

export function taskOverdueEmail(data: Base & { taskTitle: string; deadline: Date; assigneeName: string }) {
  return {
    subject: `Overdue: ${data.taskTitle}`,
    body: layout(
      "A task is overdue",
      paragraph(`<strong>${safe(data.taskTitle)}</strong> in ${safe(data.projectName)}, assigned to ${safe(data.assigneeName)}, was due ${formatManilaDate(data.deadline)}.`),
      boardUrl(data),
      "Open the board",
    ),
  };
}

const list = (items: string[], empty: string) =>
  items.length === 0
    ? paragraph(empty)
    : `<ul style="margin:0 0 10px;padding-left:20px">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;

export function readinessEmail(
  data: Base & {
    readiness: Readiness;
    byStatus: Record<TaskStatus, number>;
    overdue: { title: string; assigneeName: string | null; deadline: Date }[];
    inReview: { title: string; assigneeName: string | null }[];
    upcomingMilestones: { title: string; dueDate: Date }[];
  },
) {
  const label = READINESS_LABELS[data.readiness.status];
  const stages = TASK_STATUSES.map((status) => `${STATUS_LABELS[status]}: ${data.byStatus[status]}`).join(" · ");
  const person = (name: string | null) => safe(name ?? "Unassigned");
  return {
    subject: `Readiness report: ${data.projectName} is ${label}`,
    body: layout(
      `Readiness report: ${data.projectName}`,
      paragraph(`Status: <strong>${safe(label)}</strong>. ${Math.round(data.readiness.completion)}% of tasks are done.`) +
        (data.readiness.reasons.length ? paragraph(`Why: ${safe(data.readiness.reasons.join(", "))}.`) : "") +
        paragraph(stages) +
        paragraph("<strong>Overdue tasks</strong>") +
        list(data.overdue.map((t) => `${safe(t.title)} (${person(t.assigneeName)}, due ${formatManilaDate(t.deadline)})`), "None.") +
        paragraph("<strong>Waiting for review</strong>") +
        list(data.inReview.map((t) => `${safe(t.title)} (${person(t.assigneeName)})`), "None.") +
        paragraph("<strong>Milestones in the next 14 days</strong>") +
        list(data.upcomingMilestones.map((m) => `${safe(m.title)} (${formatManilaDate(m.dueDate)})`), "None."),
      dashboardUrl(data),
      "Open the dashboard",
    ),
  };
}
