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
