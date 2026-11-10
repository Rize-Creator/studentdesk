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
    try {
      drafts.push(...(await draftReadinessReports(project.id, todayKey, now)));
    } catch (error) {
      // One project failing should not stop the reminders and reports for every other project.
      console.error(`Could not prepare the Readiness Report for project ${project.id}`, error);
    }
  }

  const queued = await queueNotifications(prisma, drafts);
  const result = await sendPending();
  return { queued: queued.length, ...result };
}
