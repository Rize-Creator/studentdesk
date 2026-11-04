# Phase 6: Email and cron

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** real emails arrive, a failed email doesn't block a move, and running the job twice sends no duplicates.

**Branch:** `phase-6-email-cron`

**Needs from the user:** the Gmail App Password, pasted into `.env` and Vercel by the user.

---

### Task 1: Who gets what

**Files:**
- Create: `src/features/notifications/keys.ts`
- Test: `src/features/notifications/keys.test.ts`

**Interfaces:**
- Consumes: `isSendBack`, `TaskStatus`
- Produces:
  - `type NotificationType`
  - `dedupeKey(type, ...parts: string[]): string`
  - `moveNotificationType(from, to): "TASK_IN_REVIEW" | "TASK_RETURNED" | "TASK_DONE" | null`
  - `withoutActor(recipientIds, actorId): string[]`, which also removes repeats

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { dedupeKey, moveNotificationType, withoutActor } from "./keys";

describe("dedupeKey", () => {
  it("never lets a reminder and an overdue notice clash", () => {
    const reminder = dedupeKey("DEADLINE_REMINDER", "task1", "2026-11-07", "user1");
    const overdue = dedupeKey("TASK_OVERDUE", "task1", "2026-11-07", "user1");
    expect(reminder).not.toBe(overdue);
  });

  it("gives the same key for the same event", () => {
    expect(dedupeKey("READINESS_SUMMARY", "p1", "2026-11-07", "u1")).toBe(
      dedupeKey("READINESS_SUMMARY", "p1", "2026-11-07", "u1"),
    );
  });
});

describe("moveNotificationType", () => {
  it("tells leads when a task enters Review", () => {
    expect(moveNotificationType("IN_PROGRESS", "REVIEW")).toBe("TASK_IN_REVIEW");
  });

  it("tells the assignee when a task is sent back", () => {
    expect(moveNotificationType("REVIEW", "IN_PROGRESS")).toBe("TASK_RETURNED");
  });

  it("tells the assignee when a task is Done", () => {
    expect(moveNotificationType("REVIEW", "DONE")).toBe("TASK_DONE");
  });

  it("sends nothing for other moves or reorders", () => {
    expect(moveNotificationType("TODO", "IN_PROGRESS")).toBeNull();
    expect(moveNotificationType("REVIEW", "REVIEW")).toBeNull();
    expect(moveNotificationType("DONE", "DONE")).toBeNull();
  });
});

describe("withoutActor", () => {
  it("removes the person who made the change and any repeats", () => {
    expect(withoutActor(["a", "b", "a", "c"], "c")).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/notifications/keys.test.ts`
Expected: FAIL, because `./keys` doesn't exist.

- [ ] **Step 3: Create `src/features/notifications/keys.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/notifications/keys.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications
git commit -m "feat: add notification rules"
```

---

### Task 2: Email text

**Files:**
- Create: `src/features/notifications/templates.ts`
- Test: `src/features/notifications/templates.test.ts`

**Interfaces:**
- Consumes: `formatManilaDate`, `Readiness`, `READINESS_LABELS`, `STATUS_LABELS`, `TaskStatus`
- Produces, each returning `{ subject: string; body: string }`, where `body` is HTML:
  - `taskAssignedEmail(data)`, `taskInReviewEmail(data)`, `taskReturnedEmail(data)`, `taskDoneEmail(data)`
  - `milestoneCompletedEmail(data)`, `deadlineReminderEmail(data)`, `taskOverdueEmail(data)`
  - `readinessEmail(data)`
  - plus `escapeHtml(text)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { escapeHtml, readinessEmail, taskAssignedEmail, taskInReviewEmail, taskReturnedEmail } from "./templates";

const base = { appUrl: "https://studentdesk.test", projectId: "p1", projectName: "Foundation Day" };
const deadline = new Date("2026-11-07T15:59:59.999Z");

describe("escapeHtml", () => {
  it("escapes characters that could run as HTML", () => {
    expect(escapeHtml(`<script>alert("x")&'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;");
  });
});

// Review Focus 4: names and text in emails.
describe("task emails", () => {
  it("shows a script in a task title as text, not as code", () => {
    const { body } = taskAssignedEmail({ ...base, taskTitle: "<script>alert(1)</script>", deadline, assignerName: "Maria" });
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });

  it("keeps Filipino characters intact", () => {
    const { subject, body } = taskAssignedEmail({ ...base, taskTitle: "Ipadala kay Bañas", deadline, assignerName: "Peña" });
    expect(subject).toContain("Bañas");
    expect(body).toContain("Bañas");
    expect(body).toContain("Peña");
  });

  it("shows the deadline in Manila time and links to the board", () => {
    const { body } = taskAssignedEmail({ ...base, taskTitle: "Book the hall", deadline, assignerName: "Maria" });
    expect(body).toContain("Nov 7, 2026");
    expect(body).toContain("https://studentdesk.test/projects/p1/board");
  });

  it("includes the send-back note", () => {
    const { body } = taskReturnedEmail({ ...base, taskTitle: "Poster", leadName: "Maria", note: "Fix the date & time" });
    expect(body).toContain("Fix the date &amp; time");
  });

  it("includes the deliverable link when there is one", () => {
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: "https://drive.google.com/x" });
    expect(body).toContain('href="https://drive.google.com/x"');
  });

  it("leaves out the link when there isn't one", () => {
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: null });
    expect(body).not.toContain("drive.google.com");
  });
});

describe("readinessEmail", () => {
  const { subject, body } = readinessEmail({
    ...base,
    readiness: { status: "AT_RISK", completion: 50, expected: 60, overdueTasks: 1, reasons: ["1 other overdue task"] },
    byStatus: { BACKLOG: 1, TODO: 3, IN_PROGRESS: 3, REVIEW: 2, DONE: 9 },
    overdue: [{ title: "Book the sound system", assigneeName: "Carlo", deadline }],
    inReview: [{ title: "Design the poster", assigneeName: "Paolo" }],
    upcomingMilestones: [{ title: "Final run-through", dueDate: deadline }],
  });

  it("puts the status in the subject", () => {
    expect(subject).toBe("Readiness report: Foundation Day is At Risk");
  });

  it("has everything the spec lists", () => {
    for (const expected of ["At Risk", "50%", "To Do", "Book the sound system", "Design the poster", "Final run-through", "https://studentdesk.test/projects/p1"]) {
      expect(body).toContain(expected);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/notifications/templates.test.ts`
Expected: FAIL, because `./templates` doesn't exist.

- [ ] **Step 3: Create `src/features/notifications/templates.ts`**

```ts
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
<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(heading)}</h2>
${content}
<p style="margin:20px 0"><a href="${escapeHtml(linkUrl)}" style="background:#1f2933;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none">${escapeHtml(linkLabel)}</a></p>
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/notifications/templates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications
git commit -m "feat: add email templates with escaped text"
```

---

### Task 3: Saving and sending emails

**Files:**
- Create: `src/features/notifications/recipients.ts`, `src/features/notifications/queue.ts`, `src/features/notifications/mailer.ts`
- Test: `src/features/notifications/recipients.test.ts`

**Interfaces:**
- Consumes: `prisma`, `isDemoMode`, `NotificationType`
- Produces:
  - `isAllowedRecipient(email, demoMode, inbox): boolean`, `htmlToText(html): string`
  - `type NotificationDraft = { recipientId, projectId, taskId, type, subject, body, dedupeKey }`
  - `queueNotifications(client, drafts): Promise<string[]>`, returning the new rows' IDs
  - `sendPending({ ids?, limit? }): Promise<{ sent: number; failed: number }>`, which never throws for a failed email
  - `sendAfterResponse(ids)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { htmlToText, isAllowedRecipient } from "./recipients";

describe("isAllowedRecipient", () => {
  const inbox = "studentdesk@gmail.com";

  it("allows plus-addresses of the demo inbox in demo mode", () => {
    expect(isAllowedRecipient("studentdesk+mariasantos@gmail.com", true, inbox)).toBe(true);
    expect(isAllowedRecipient("studentdesk@gmail.com", true, inbox)).toBe(true);
  });

  it("refuses anyone else in demo mode", () => {
    expect(isAllowedRecipient("someone@gmail.com", true, inbox)).toBe(false);
    expect(isAllowedRecipient("studentdesk+a@yahoo.com", true, inbox)).toBe(false);
    expect(isAllowedRecipient("studentdesk+a@gmail.com", true, "")).toBe(false);
  });

  it("allows anyone outside demo mode", () => {
    expect(isAllowedRecipient("teacher@ccdi.edu.ph", false, "")).toBe(true);
  });
});

describe("htmlToText", () => {
  it("removes tags and restores escaped characters", () => {
    expect(htmlToText("<p>Hi &amp; <strong>welcome</strong></p><p>Line &lt;2&gt;</p>")).toBe("Hi & welcome\nLine <2>");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/notifications/recipients.test.ts`
Expected: FAIL, because `./recipients` doesn't exist.

- [ ] **Step 3: Create `src/features/notifications/recipients.ts`**

```ts
// A last safety net: in demo mode, email can only ever reach the demo inbox.
export function isAllowedRecipient(email: string, demoMode: boolean, inbox: string): boolean {
  if (!demoMode) return true;
  const [inboxLocal, inboxDomain] = inbox.toLowerCase().split("@");
  if (!inboxDomain) return false;
  const [local, domain] = email.toLowerCase().split("@");
  return domain === inboxDomain && local.split("+")[0] === inboxLocal;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|li|h2|div)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/notifications/recipients.test.ts`
Expected: PASS

- [ ] **Step 5: Create `src/features/notifications/queue.ts`**

```ts
import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "./keys";

export type NotificationDraft = {
  recipientId: string;
  projectId: string;
  taskId: string | null;
  type: NotificationType;
  subject: string;
  body: string;
  dedupeKey: string;
};

// skipDuplicates makes repeat runs harmless, because dedupeKey is unique.
export async function queueNotifications(client: Prisma.TransactionClient, drafts: NotificationDraft[]): Promise<string[]> {
  if (drafts.length === 0) return [];
  const rows = await client.notification.createManyAndReturn({
    data: drafts,
    skipDuplicates: true,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
```

- [ ] **Step 6: Create `src/features/notifications/mailer.ts`**

```ts
import { after } from "next/server";
import nodemailer from "nodemailer";
import { isDemoMode } from "@/features/lms";
import { prisma } from "@/lib/db";
import { htmlToText, isAllowedRecipient } from "./recipients";

const MAX_ATTEMPTS = 3;
const DEFAULT_LIMIT = 100;

export async function sendPending(options: { ids?: string[]; limit?: number } = {}) {
  const rows = await prisma.notification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
      ...(options.ids ? { id: { in: options.ids } } : {}),
    },
    include: { recipient: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? DEFAULT_LIMIT,
  });
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const useSmtp = process.env.EMAIL_MODE === "smtp";
  const transport = useSmtp
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null;
  const from = `"${process.env.EMAIL_FROM ?? "StudentDesk"}" <${process.env.GMAIL_USER}>`;

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      if (transport) {
        if (!isAllowedRecipient(row.recipient.email, isDemoMode(), process.env.DEMO_INBOX ?? "")) {
          throw new Error("Recipient isn't allowed in demo mode.");
        }
        await transport.sendMail({
          from,
          to: row.recipient.email,
          subject: row.subject,
          html: row.body,
          text: htmlToText(row.body),
        });
      } else {
        console.info(`[email:log] ${row.type}: ${row.subject}`);
      }
      await prisma.notification.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      await prisma.notification.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          lastError: (error instanceof Error ? error.message : "Unknown error").slice(0, 500),
        },
      });
    }
  }
  return { sent, failed };
}

// Sends after the response is finished, so email can't slow down or break the change itself.
export function sendAfterResponse(ids: string[]) {
  if (ids.length === 0) return;
  after(async () => {
    try {
      await sendPending({ ids });
    } catch (error) {
      console.error("Couldn't send queued emails", error);
    }
  });
}
```

- [ ] **Step 7: Run the type check and commit**

```bash
npx tsc --noEmit
git add src/features/notifications
git commit -m "feat: add email queue and sending"
```

---

### Task 4: Emails for task changes

**Files:**
- Create: `src/features/notifications/events.ts`
- Modify: `src/features/tasks/actions.ts`, `src/features/projects/actions.ts`

**Interfaces:**
- Consumes: `dedupeKey`, `moveNotificationType`, `withoutActor`, the templates, `queueNotifications`, `sendAfterResponse`
- Produces: `appUrl()`, `draftAssignment(input)`, `draftMove(client, input)`, `draftMilestoneComplete(client, input)`

- [ ] **Step 1: Create `src/features/notifications/events.ts`**

```ts
import type { Prisma } from "@/generated/prisma/client";
import type { TaskStatus } from "@/features/tasks/transitions";
import { dedupeKey, moveNotificationType, withoutActor } from "./keys";
import type { NotificationDraft } from "./queue";
import { milestoneCompletedEmail, taskAssignedEmail, taskDoneEmail, taskInReviewEmail, taskReturnedEmail } from "./templates";

type Actor = { id: string; name: string };
type ProjectRef = { id: string; name: string };
type Client = Prisma.TransactionClient;

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

const base = (project: ProjectRef) => ({ appUrl: appUrl(), projectId: project.id, projectName: project.name });

export function draftAssignment(input: {
  assignmentId: string;
  assigneeId: string;
  actor: Actor;
  project: ProjectRef;
  task: { id: string; title: string; deadline: Date };
}): NotificationDraft[] {
  const { assignmentId, assigneeId, actor, project, task } = input;
  if (assigneeId === actor.id) return [];
  return [
    {
      recipientId: assigneeId,
      projectId: project.id,
      taskId: task.id,
      type: "TASK_ASSIGNED",
      dedupeKey: dedupeKey("TASK_ASSIGNED", assignmentId, assigneeId),
      ...taskAssignedEmail({ ...base(project), taskTitle: task.title, deadline: task.deadline, assignerName: actor.name }),
    },
  ];
}

async function draftMilestoneForRoles(client: Client, milestone: { id: string; title: string }, actor: Actor, project: ProjectRef) {
  const people = await client.projectMember.findMany({
    where: { projectId: project.id, role: { in: ["LEAD", "ADVISER"] } },
    select: { userId: true },
  });
  const email = milestoneCompletedEmail({ ...base(project), milestoneTitle: milestone.title });
  return withoutActor(people.map((person) => person.userId), actor.id).map((recipientId): NotificationDraft => ({
    recipientId,
    projectId: project.id,
    taskId: null,
    type: "MILESTONE_COMPLETED",
    dedupeKey: dedupeKey("MILESTONE_COMPLETED", milestone.id, recipientId),
    ...email,
  }));
}

export function draftMilestoneComplete(client: Client, input: { milestone: { id: string; title: string }; actor: Actor; project: ProjectRef }) {
  return draftMilestoneForRoles(client, input.milestone, input.actor, input.project);
}

export async function draftMove(
  client: Client,
  input: {
    historyId: string;
    from: TaskStatus;
    to: TaskStatus;
    note: string | null;
    actor: Actor;
    project: ProjectRef;
    task: { id: string; title: string; assigneeId: string | null; deliverableUrl: string | null; milestoneId: string | null };
  },
): Promise<NotificationDraft[]> {
  const { historyId, from, to, note, actor, project, task } = input;
  const drafts: NotificationDraft[] = [];
  const type = moveNotificationType(from, to);

  if (type === "TASK_IN_REVIEW") {
    const leads = await client.projectMember.findMany({ where: { projectId: project.id, role: "LEAD" }, select: { userId: true } });
    const email = taskInReviewEmail({ ...base(project), taskTitle: task.title, memberName: actor.name, deliverableUrl: task.deliverableUrl });
    for (const recipientId of withoutActor(leads.map((lead) => lead.userId), actor.id)) {
      drafts.push({ recipientId, projectId: project.id, taskId: task.id, type, dedupeKey: dedupeKey(type, historyId, recipientId), ...email });
    }
  }

  if ((type === "TASK_RETURNED" || type === "TASK_DONE") && task.assigneeId && task.assigneeId !== actor.id) {
    const email =
      type === "TASK_RETURNED"
        ? taskReturnedEmail({ ...base(project), taskTitle: task.title, leadName: actor.name, note })
        : taskDoneEmail({ ...base(project), taskTitle: task.title });
    drafts.push({ recipientId: task.assigneeId, projectId: project.id, taskId: task.id, type, dedupeKey: dedupeKey(type, historyId, task.assigneeId), ...email });
  }

  if (to === "DONE" && from !== "DONE" && task.milestoneId) {
    const unfinished = await client.task.count({ where: { milestoneId: task.milestoneId, status: { not: "DONE" } } });
    const milestone = await client.milestone.findUnique({ where: { id: task.milestoneId } });
    if (unfinished === 0 && milestone && !milestone.completedAt) {
      drafts.push(...(await draftMilestoneForRoles(client, milestone, actor, project)));
    }
  }
  return drafts;
}
```

- [ ] **Step 2: Send the assignment email from `createTask` in `src/features/tasks/actions.ts`**

Add these imports:

```ts
import { draftAssignment, draftMove } from "@/features/notifications/events";
import { sendAfterResponse } from "@/features/notifications/mailer";
import { queueNotifications } from "@/features/notifications/queue";
```

In the transaction, replace the `if (data.assigneeId)` block and the `return created;` line, and return the IDs:

```ts
    let emailIds: string[] = [];
    if (data.assigneeId) {
      const assignment = await tx.taskAssignment.create({
        data: {
          taskId: created.id,
          assigneeId: data.assigneeId,
          assignedById: auth.user.id,
          recommendedRank: recommendedRank ?? null,
        },
      });
      emailIds = await queueNotifications(
        tx,
        draftAssignment({ assignmentId: assignment.id, assigneeId: data.assigneeId, actor: auth.user, project: auth.project, task: created }),
      );
    }
    return { created, emailIds };
```

Then change the code after the transaction:

```ts
  sendAfterResponse(result.emailIds);
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok({ id: result.created.id });
```

with `const result = await prisma.$transaction(...)` in place of `const task = ...`.

- [ ] **Step 3: Send the assignment email from `updateTask`**

Replace its transaction and the lines after it:

```ts
  const emailIds = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id: taskId }, data: { ...data, deadline: endOfManilaDay(deadline) } });
    if (!data.assigneeId || data.assigneeId === current.assigneeId) return [];
    const assignment = await tx.taskAssignment.create({
      data: { taskId, assigneeId: data.assigneeId, assignedById: auth.user.id, recommendedRank: recommendedRank ?? null },
    });
    return queueNotifications(
      tx,
      draftAssignment({ assignmentId: assignment.id, assigneeId: data.assigneeId, actor: auth.user, project: auth.project, task: updated }),
    );
  });
  sendAfterResponse(emailIds);
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
```

- [ ] **Step 4: Send move emails from `moveTask`**

Replace its transaction and the lines after it:

```ts
  const emailIds = await prisma.$transaction(async (tx) => {
    let position = positionBetween(before, after);
    if (before === null && after === null) {
      const last = await tx.task.aggregate({ where: { projectId, status: to }, _max: { position: true } });
      position = positionAtEnd(last._max.position);
    }
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: to,
        position,
        completedAt: to === "DONE" ? (task.completedAt ?? new Date()) : null,
        // Leaving the dialog blank keeps whatever was submitted earlier.
        ...(to === "REVIEW" && changedStage
          ? {
              deliverableUrl: deliverable.data.deliverableUrl ?? task.deliverableUrl,
              deliverableNote: deliverable.data.deliverableNote ?? task.deliverableNote,
            }
          : {}),
      },
    });
    if (!changedStage) return [];
    const history = await tx.taskStatusHistory.create({
      data: { taskId, fromStatus: task.status, toStatus: to, changedById: user.id, note },
    });
    const drafts = await draftMove(tx, {
      historyId: history.id,
      from: task.status,
      to,
      note,
      actor: user,
      project: member.project,
      task: updated,
    });
    return queueNotifications(tx, drafts);
  });
  sendAfterResponse(emailIds);
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
```

- [ ] **Step 5: Send the milestone email from `setMilestoneComplete` in `src/features/projects/actions.ts`**

Replace the function:

```ts
export async function setMilestoneComplete(projectId: string, milestoneId: string, complete: boolean): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  const milestone = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId } });
  if (!milestone) return fail("That milestone no longer exists.");
  const emailIds = await prisma.$transaction(async (tx) => {
    await tx.milestone.update({ where: { id: milestoneId }, data: { completedAt: complete ? new Date() : null } });
    if (!complete || milestone.completedAt) return [];
    return queueNotifications(tx, await draftMilestoneComplete(tx, { milestone, actor: auth.user, project: auth.project }));
  });
  sendAfterResponse(emailIds);
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
```

with these imports added:

```ts
import { draftMilestoneComplete } from "@/features/notifications/events";
import { sendAfterResponse } from "@/features/notifications/mailer";
import { queueNotifications } from "@/features/notifications/queue";
```

- [ ] **Step 6: Check it locally in log mode**

With `EMAIL_MODE=log` on `npm run dev`, as Maria, assign a task to Juan and move one to Done. The server log shows `[email:log]` lines.

To prove a failed email can't block a move, set `EMAIL_MODE=smtp` with an empty `GMAIL_APP_PASSWORD`, then move a task. The move saves, and the database shows that notification as `FAILED` with `attempts` at 1. Set `EMAIL_MODE=log` again afterward.

- [ ] **Step 7: Run the checks and commit**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat: send emails for assignments, moves and milestones"
```

---

### Task 5: Readiness Report and daily job

**Files:**
- Create: `src/features/notifications/reports.ts`, `src/features/notifications/daily-job.ts`, `src/features/notifications/actions.ts`, `src/features/notifications/send-report-button.tsx`, `src/app/api/cron/daily/route.ts`
- Modify: `vercel.json`, `src/features/metrics/project-dashboard.tsx`

**Interfaces:**
- Consumes: `getProjectDashboard`, the templates, `queueNotifications`, `sendPending`, `authorize`, `dedupeKey`, `withoutActor`, the date helpers
- Produces: `draftReadinessReports(projectId, keyPart, now)`, `runDailyJob(now?)`, `sendReadinessNow(projectId)`, `GET /api/cron/daily`

- [ ] **Step 1: Create `src/features/notifications/reports.ts`**

```ts
import { getProjectDashboard } from "@/features/metrics/queries";
import { prisma } from "@/lib/db";
import { appUrl } from "./events";
import { dedupeKey } from "./keys";
import type { NotificationDraft } from "./queue";
import { readinessEmail } from "./templates";

const UPCOMING_MS = 14 * 24 * 60 * 60 * 1000;

export async function draftReadinessReports(projectId: string, keyPart: string, now: Date): Promise<NotificationDraft[]> {
  const [dashboard, people, inReview] = await Promise.all([
    getProjectDashboard(projectId, now),
    prisma.projectMember.findMany({ where: { projectId, role: { in: ["ADVISER", "LEAD"] } }, select: { userId: true } }),
    prisma.task.findMany({ where: { projectId, status: "REVIEW" }, include: { assignee: { select: { name: true } } } }),
  ]);
  const email = readinessEmail({
    appUrl: appUrl(),
    projectId,
    projectName: dashboard.project.name,
    readiness: dashboard.readiness,
    byStatus: dashboard.byStatus,
    overdue: dashboard.overdue.map((task) => ({ title: task.title, assigneeName: task.assigneeName, deadline: new Date(task.deadline) })),
    inReview: inReview.map((task) => ({ title: task.title, assigneeName: task.assignee?.name ?? null })),
    upcomingMilestones: dashboard.milestones
      .filter((m) => !m.complete && new Date(m.dueDate).getTime() - now.getTime() <= UPCOMING_MS)
      .map((m) => ({ title: m.title, dueDate: new Date(m.dueDate) })),
  });
  return people.map(({ userId }) => ({
    recipientId: userId,
    projectId,
    taskId: null,
    type: "READINESS_SUMMARY",
    dedupeKey: dedupeKey("READINESS_SUMMARY", projectId, keyPart, userId),
    ...email,
  }));
}
```

- [ ] **Step 2: Create `src/features/notifications/daily-job.ts`**

```ts
import { addDaysToKey, endOfManilaDay, manilaDateKey } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { appUrl } from "./events";
import { dedupeKey, withoutActor } from "./keys";
import { sendPending } from "./mailer";
import { queueNotifications, type NotificationDraft } from "./queue";
import { draftReadinessReports } from "./reports";
import { deadlineReminderEmail, taskOverdueEmail } from "./templates";

const NO_ACTOR = "";

export async function runDailyJob(now = new Date()) {
  const todayKey = manilaDateKey(now);
  const reminderEnd = endOfManilaDay(addDaysToKey(todayKey, 1));

  const tasks = await prisma.task.findMany({
    where: { status: { not: "DONE" }, deadline: { lte: reminderEnd }, project: { status: "ACTIVE" } },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, members: { where: { role: "LEAD" }, select: { userId: true } } } },
    },
  });

  const drafts: NotificationDraft[] = [];
  for (const task of tasks) {
    const base = { appUrl: appUrl(), projectId: task.project.id, projectName: task.project.name, taskTitle: task.title, deadline: task.deadline };
    const deadlineKey = manilaDateKey(task.deadline);
    if (task.deadline.getTime() < now.getTime()) {
      const email = taskOverdueEmail({ ...base, assigneeName: task.assignee?.name ?? "nobody yet" });
      const people = [...task.project.members.map((m) => m.userId), ...(task.assignee ? [task.assignee.id] : [])];
      for (const recipientId of withoutActor(people, NO_ACTOR)) {
        drafts.push({ recipientId, projectId: task.project.id, taskId: task.id, type: "TASK_OVERDUE", dedupeKey: dedupeKey("TASK_OVERDUE", task.id, deadlineKey, recipientId), ...email });
      }
    } else if (task.assignee) {
      drafts.push({
        recipientId: task.assignee.id,
        projectId: task.project.id,
        taskId: task.id,
        type: "DEADLINE_REMINDER",
        dedupeKey: dedupeKey("DEADLINE_REMINDER", task.id, deadlineKey, task.assignee.id),
        ...deadlineReminderEmail(base),
      });
    }
  }

  const projects = await prisma.project.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const project of projects) {
    drafts.push(...(await draftReadinessReports(project.id, todayKey, now)));
  }

  const queued = await queueNotifications(prisma, drafts);
  const result = await sendPending();
  return { queued: queued.length, ...result };
}
```

- [ ] **Step 3: Create `src/app/api/cron/daily/route.ts`**

```ts
import { runDailyJob } from "@/features/notifications/daily-job";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runDailyJob());
}
```

- [ ] **Step 4: Create `src/features/notifications/actions.ts`**

```ts
"use server";

import { authorize } from "@/features/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/db";
import { sendPending } from "./mailer";
import { queueNotifications } from "./queue";
import { draftReadinessReports } from "./reports";

const THROTTLE_MS = 5 * 60 * 1000;

export async function sendReadinessNow(projectId: string): Promise<ActionResult<{ sent: number }>> {
  const auth = await authorize(projectId, "report:send");
  if (!auth.ok) return fail(auth.message);

  const now = new Date();
  const recent = await prisma.notification.findFirst({
    where: { projectId, type: "READINESS_SUMMARY", createdAt: { gte: new Date(now.getTime() - THROTTLE_MS) } },
    select: { id: true },
  });
  if (recent) return fail("A report was sent in the last 5 minutes. Please wait a bit and try again.");

  await queueNotifications(prisma, await draftReadinessReports(projectId, `now-${now.getTime()}`, now));
  // Also sends anything still waiting.
  const result = await sendPending();
  return result.failed > 0 ? fail("Some emails couldn't be sent. They'll be retried tomorrow morning.") : ok({ sent: result.sent });
}
```

- [ ] **Step 5: Add the button**

Create `src/features/notifications/send-report-button.tsx`, a client component that calls `sendReadinessNow` through `safeCall` and shows the result as a toast. Show it on `project-dashboard.tsx` to leads and advisers on active projects, using `can(role, "report:send")`.

- [ ] **Step 6: Add the schedule to `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"],
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 23 * * *" }]
}
```

`0 23 * * *` in UTC is 7 AM in Manila. On the free plan it can run up to 59 minutes late.

- [ ] **Step 7: Check the daily job twice, in log mode**

With `npm run dev` running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/daily
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2)" http://localhost:3000/api/cron/daily
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2)" http://localhost:3000/api/cron/daily
```

Expected:
- The first prints `401`.
- The second prints a positive `queued` count.
- The third prints `"queued":0`, which proves there are no duplicates.

- [ ] **Step 8: User step: turn on real email**

Paste into the local `.env` and into Vercel's Environment Variables, for both Production and Preview:

| Variable | Value |
|---|---|
| `EMAIL_MODE` | `smtp` |
| `GMAIL_USER` | the project's Gmail address |
| `GMAIL_APP_PASSWORD` | the 16-character App Password |
| `EMAIL_FROM` | `StudentDesk` |
| `DEMO_INBOX` | the same Gmail address |

`DEMO_INBOX` must be set on Vercel too. Otherwise signing in with a demo account would replace that account's email with a non-working address.

Then re-run the sample data locally, so sample accounts use the inbox:

```bash
npm run db:seed
```

- [ ] **Step 9: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: everything passes.

- [ ] **Step 10: Commit and push for preview**

```bash
git add -A
git commit -m "feat: add Readiness Report and daily job"
git push -u origin phase-6-email-cron
```

## Phase 6 checklist for the user

Use the preview URL, with the project's Gmail inbox open.

1. As **Lead**, assign a task to Juan. An email for Juan should arrive in the inbox within about a minute.
2. As **Member** (Juan), move that task to Review. An email should arrive for the lead.
3. As **Lead**, send it back with a note. The email should include your note.
4. As **Lead**, mark it Done. Juan should get an email.
5. Open the Foundation Day 2026 dashboard and click **Send Readiness Report**. Each adviser and lead gets a report. Read one, and tell me if you'd change anything.
6. Click it again right away. It should ask you to wait.
7. Check that emails show `Bañas`-style names properly, and that the links open the right page.
