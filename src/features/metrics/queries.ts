import { prisma } from "@/lib/db";
import { addDaysToKey, manilaDateKey } from "@/lib/dates";
import {
  computeReadiness,
  countByCategory,
  countByStatus,
  isMilestoneComplete,
  isMilestoneOverdue,
  isOverdue,
  progressEndKey,
  progressOverTime,
  sortByReadiness,
} from "./calculations";

const ACTIVE = ["TODO", "IN_PROGRESS", "REVIEW"];

export async function getProjectDashboard(projectId: string, now = new Date()) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      milestones: { include: { tasks: { select: { status: true } } }, orderBy: { dueDate: "asc" } },
      tasks: {
        include: {
          category: true,
          assignee: { select: { id: true, name: true } },
          history: {
            where: { OR: [{ toStatus: "DONE" }, { fromStatus: "DONE" }] },
            select: { toStatus: true, changedAt: true },
          },
        },
        orderBy: { deadline: "asc" },
      },
    },
  });

  const milestones = project.milestones.map((milestone) => ({
    ...milestone,
    taskStatuses: milestone.tasks.map((task) => task.status),
  }));
  const readiness = computeReadiness({
    tasks: project.tasks,
    milestones,
    startDate: project.startDate,
    targetDate: project.targetDate,
    now,
  });

  const events = project.tasks.flatMap((task) =>
    task.history.map((row) => ({ at: row.changedAt, delta: row.toStatus === "DONE" ? (1 as const) : (-1 as const) })),
  );
  const startKey = manilaDateKey(project.startDate);
  const todayKey = manilaDateKey(now);
  const targetKey = manilaDateKey(project.targetDate);
  const endKey = progressEndKey(todayKey, targetKey, events.map((event) => manilaDateKey(event.at)));

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      startDate: project.startDate.toISOString(),
      targetDate: project.targetDate.toISOString(),
    },
    readiness,
    total: project.tasks.length,
    byStatus: countByStatus(project.tasks),
    byCategory: countByCategory(project.tasks.map((task) => ({ categoryName: task.category.name, status: task.status }))),
    progress: endKey >= startKey ? progressOverTime(events, startKey, endKey) : [],
    overdue: project.tasks
      .filter((task) => isOverdue(task, now))
      .map((task) => ({ id: task.id, title: task.title, deadline: task.deadline.toISOString(), assigneeName: task.assignee?.name ?? null })),
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      dueDate: milestone.dueDate.toISOString(),
      complete: isMilestoneComplete(milestone),
      overdue: isMilestoneOverdue(milestone, now),
      done: milestone.taskStatuses.filter((status) => status === "DONE").length,
      total: milestone.taskStatuses.length,
    })),
    workload: project.members
      .filter((member) => member.role !== "ADVISER")
      .map((member) => {
        const own = project.tasks.filter((task) => task.assigneeId === member.userId);
        return {
          userId: member.userId,
          name: member.user.name,
          active: own.filter((task) => ACTIVE.includes(task.status)).length,
          overdue: own.filter((task) => isOverdue(task, now)).length,
          done: own.filter((task) => task.status === "DONE").length,
        };
      }),
    timelineTasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      deadline: task.deadline.toISOString(),
      createdAt: task.createdAt.toISOString(),
      milestoneId: task.milestoneId,
      overdue: isOverdue(task, now),
    })),
  };
}

export type ProjectDashboard = Awaited<ReturnType<typeof getProjectDashboard>>;

export async function loadReadiness(projectId: string, now = new Date()) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      tasks: { select: { status: true, priority: true, deadline: true } },
      milestones: { include: { tasks: { select: { status: true } } } },
    },
  });
  return computeReadiness({
    tasks: project.tasks,
    milestones: project.milestones.map((m) => ({ ...m, taskStatuses: m.tasks.map((t) => t.status) })),
    startDate: project.startDate,
    targetDate: project.targetDate,
    now,
  });
}

export async function getMyWork(userId: string, now = new Date()) {
  const [tasks, memberships, finishedCount] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, status: { not: "DONE" }, project: { status: "ACTIVE" } },
      include: { project: { select: { id: true, name: true } }, category: true },
      orderBy: { deadline: "asc" },
    }),
    prisma.projectMember.findMany({
      where: { userId, project: { status: "ACTIVE" } },
      include: { project: { select: { id: true, name: true, targetDate: true } } },
      orderBy: { project: { targetDate: "asc" } },
    }),
    prisma.task.count({ where: { assigneeId: userId, status: "DONE" } }),
  ]);
  const ledProjectIds = memberships.filter((member) => member.role === "LEAD").map((member) => member.project.id);
  const [dashboards, waiting] = await Promise.all([
    Promise.all(memberships.map((member) => getProjectDashboard(member.project.id, now))),
    prisma.task.findMany({
      where: { projectId: { in: ledProjectIds }, status: "REVIEW" },
      include: { project: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { deadline: "asc" },
    }),
  ]);
  const soonKey = addDaysToKey(manilaDateKey(now), 7);
  return {
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      categoryName: task.category.name,
      projectId: task.project.id,
      projectName: task.project.name,
      deadline: task.deadline.toISOString(),
      overdue: isOverdue(task, now),
      dueSoon: manilaDateKey(task.deadline) <= soonKey,
    })),
    overdueCount: tasks.filter((task) => isOverdue(task, now)).length,
    finishedCount,
    waitingForReview: waiting.map((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: task.project.name,
      assigneeName: task.assignee?.name ?? null,
      deadline: task.deadline.toISOString(),
      overdue: isOverdue(task, now),
    })),
    projects: memberships.map((member, index) => {
      const dashboard = dashboards[index];
      const next = dashboard.milestones.find((milestone) => !milestone.complete);
      return {
        id: member.project.id,
        name: member.project.name,
        role: member.role,
        targetDate: member.project.targetDate.toISOString(),
        completion: Math.round(dashboard.readiness.completion),
        readinessStatus: dashboard.readiness.status,
        nextMilestone: next ? { title: next.title, dueDate: next.dueDate, overdue: next.overdue } : null,
      };
    }),
  };
}

export type MyWork = Awaited<ReturnType<typeof getMyWork>>;

// Covers projects the person advises or leads, since the manuscript gives both a multi-project view.
export async function getOverview(userId: string, now = new Date()) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, role: { in: ["ADVISER", "LEAD"] }, project: { status: "ACTIVE" } },
    select: { role: true, projectId: true },
  });
  const rows = await Promise.all(
    memberships.map(async ({ projectId, role }) => {
      const dashboard = await getProjectDashboard(projectId, now);
      const next = dashboard.milestones.find((milestone) => !milestone.complete);
      return {
        id: projectId,
        role,
        name: dashboard.project.name,
        targetDate: dashboard.project.targetDate,
        readiness: dashboard.readiness,
        overdueCount: dashboard.overdue.length,
        nextMilestone: next ? { title: next.title, dueDate: next.dueDate, overdue: next.overdue } : null,
      };
    }),
  );
  return { projects: sortByReadiness(rows) };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;
