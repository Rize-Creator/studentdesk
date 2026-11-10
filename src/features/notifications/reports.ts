import { getProjectDashboard } from "@/features/metrics/queries";
import { prisma } from "@/lib/db";
import { appUrl } from "./events";
import { dedupeKey } from "./keys";
import type { NotificationDraft } from "./queue";
import { reportMilestones } from "./report-milestones";
import { readinessEmail } from "./templates";

export async function draftReadinessReports(projectId: string, keyPart: string, now: Date): Promise<NotificationDraft[]> {
  const [dashboard, people, inReview] = await Promise.all([
    getProjectDashboard(projectId, now),
    prisma.projectMember.findMany({ where: { projectId, role: { in: ["ADVISER", "LEAD"] } }, select: { userId: true } }),
    prisma.task.findMany({ where: { projectId, status: "REVIEW" }, include: { assignee: { select: { name: true } } } }),
  ]);
  const milestones = reportMilestones(dashboard.milestones, now);
  const email = readinessEmail({
    appUrl: appUrl(),
    projectId,
    projectName: dashboard.project.name,
    readiness: dashboard.readiness,
    byStatus: dashboard.byStatus,
    overdue: dashboard.overdue.map((task) => ({ title: task.title, assigneeName: task.assigneeName, deadline: new Date(task.deadline) })),
    inReview: inReview.map((task) => ({ title: task.title, assigneeName: task.assignee?.name ?? null })),
    overdueMilestones: milestones.overdue,
    upcomingMilestones: milestones.upcoming,
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
