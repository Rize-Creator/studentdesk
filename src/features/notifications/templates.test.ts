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
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: "https://drive.google.com/x", deliverableNote: null });
    expect(body).toContain('href="https://drive.google.com/x"');
  });

  it("leaves out the link when there isn't one", () => {
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: null, deliverableNote: null });
    expect(body).not.toContain("drive.google.com");
  });

  it("includes the member's note, safely, when they wrote one", () => {
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: null, deliverableNote: "Page 2 & 3 <changed>" });
    expect(body).toContain("Note: Page 2 &amp; 3 &lt;changed&gt;");
  });

  it("leaves out the note label when there's no note", () => {
    const { body } = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: null, deliverableNote: null });
    expect(body).not.toContain("Note:");
  });

  it("keeps the line breaks people type in notes", () => {
    const review = taskInReviewEmail({ ...base, taskTitle: "Poster", memberName: "Paolo", deliverableUrl: null, deliverableNote: "One\nTwo" });
    const returned = taskReturnedEmail({ ...base, taskTitle: "Poster", leadName: "Maria", note: "One\nTwo" });
    expect(review.body).toContain("white-space:pre-wrap");
    expect(returned.body).toContain("white-space:pre-wrap");
  });
});

describe("readinessEmail", () => {
  const { subject, body } = readinessEmail({
    ...base,
    readiness: { status: "AT_RISK", completion: 50, expected: 60, overdueTasks: 1, reasons: ["1 other overdue task"] },
    byStatus: { BACKLOG: 1, TODO: 3, IN_PROGRESS: 3, REVIEW: 2, DONE: 9 },
    overdue: [{ title: "Book the sound system", assigneeName: "Carlo", deadline }],
    inReview: [{ title: "Design the poster", assigneeName: "Paolo" }],
    overdueMilestones: [],
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

describe("readinessEmail wording", () => {
  const report = {
    ...base,
    readiness: { status: "BEHIND" as const, completion: 17, expected: 65, overdueTasks: 1, reasons: ["1 overdue milestone"] },
    byStatus: { BACKLOG: 1, TODO: 2, IN_PROGRESS: 2, REVIEW: 0, DONE: 1 },
    overdue: [],
    inReview: [],
    overdueMilestones: [{ title: "Team registration closed", dueDate: new Date("2026-11-05T15:59:59.999Z") }],
    upcomingMilestones: [{ title: "Opening ceremony", dueDate: deadline }],
  };

  it("lists an overdue milestone under its own heading, not under the next 14 days", () => {
    const { body } = readinessEmail(report);
    const overdueAt = body.indexOf("Overdue milestones");
    const upcomingAt = body.indexOf("Milestones in the next 14 days");
    const milestoneAt = body.indexOf("Team registration closed");
    expect(overdueAt).toBeGreaterThan(-1);
    expect(milestoneAt).toBeGreaterThan(overdueAt);
    expect(milestoneAt).toBeLessThan(upcomingAt);
    expect(body.indexOf("Opening ceremony")).toBeGreaterThan(upcomingAt);
  });

  it("leaves out the overdue milestones heading when there are none", () => {
    expect(readinessEmail({ ...report, overdueMilestones: [] }).body).not.toContain("Overdue milestones");
  });

  it("says in plain words that a project has no tasks yet", () => {
    const { subject } = readinessEmail({ ...report, readiness: { status: "NO_TASKS", completion: 0, expected: 0, overdueTasks: 0, reasons: [] } });
    expect(subject).toBe("Readiness report: Foundation Day has no tasks yet");
  });
});
