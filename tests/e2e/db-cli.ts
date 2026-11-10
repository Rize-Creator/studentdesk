// Run by tsx from db.ts. Playwright can't load the generated Prisma client directly,
// because it compiles test files in a way that doesn't allow import.meta.
import "dotenv/config";
import { encode } from "next-auth/jwt";
import { prisma } from "../../src/lib/db";

const DAILY_JOB_URL = new URL("/api/cron/daily", "http://localhost:3000");
const runDailyJob = async () => (await fetch(DAILY_JOB_URL, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).status;

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<unknown>> = {
  async findTask() {
    const [projectId, title] = args;
    const task = await prisma.task.findFirstOrThrow({ where: { projectId, title }, include: { assignments: true } });
    return { id: task.id, status: task.status, recommendedRank: task.assignments[0]?.recommendedRank ?? null };
  },
  async getTask() {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: args[0] } });
    return { status: task.status, deliverableUrl: task.deliverableUrl, assigneeId: task.assigneeId, deadline: task.deadline.toISOString() };
  },
  async countNotifications() {
    return prisma.notification.count({ where: { taskId: args[0], type: args[1] as "TASK_ASSIGNED" | "TASK_DONE" } });
  },
  async historyOf() {
    const rows = await prisma.taskStatusHistory.findMany({ where: { taskId: args[0] }, orderBy: { changedAt: "asc" } });
    return rows.map((row) => row.toStatus);
  },
  async setCommittee() {
    const [projectId, name, committeeCategoryId, committeeTitle] = args;
    const user = await prisma.user.findFirstOrThrow({ where: { name } });
    await prisma.projectMember.update({ where: { projectId_userId: { projectId, userId: user.id } }, data: { committeeCategoryId, committeeTitle } });
    return true;
  },
  async getMember() {
    const [projectId, name] = args;
    const user = await prisma.user.findFirstOrThrow({ where: { name } });
    const member = await prisma.projectMember.findUniqueOrThrow({ where: { projectId_userId: { projectId, userId: user.id } } });
    return { role: member.role, committeeCategoryId: member.committeeCategoryId, committeeTitle: member.committeeTitle };
  },
  // A signed-in session for any user ID, including one with no account, to test what a deleted account sees.
  async sessionFor() {
    const [sub, name, email] = args;
    return encode({ token: { sub, name, email }, secret: process.env.NEXTAUTH_SECRET!, maxAge: 3600 });
  },
  async countProjectsNamed() {
    return prisma.project.count({ where: { name: args[0] } });
  },
  async deleteProjectsNamed() {
    return (await prisma.project.deleteMany({ where: { name: args[0] } })).count;
  },
  // Queues a few emails, runs the daily job twice at the same moment, and reports how many times each email was handled.
  async overlappingDailyJobs() {
    const prefix = `e2e-overlap:${Date.now()}:`;
    await prisma.notification.createMany({
      data: Array.from({ length: 6 }, (_, index) => ({
        recipientId: "demo-001",
        type: "TASK_ASSIGNED" as const,
        subject: `E2E overlap ${index}`,
        body: "<p>E2E overlap</p>",
        dedupeKey: `${prefix}${index}`,
      })),
    });
    try {
      const responses = await Promise.all([runDailyJob(), runDailyJob()]);
      const rows = await prisma.notification.findMany({
        where: { dedupeKey: { startsWith: prefix } },
        select: { attempts: true, status: true },
        orderBy: { dedupeKey: "asc" },
      });
      return { responses, attempts: rows.map((row) => row.attempts), statuses: rows.map((row) => row.status) };
    } finally {
      await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: prefix } } });
    }
  },
  // Adds a project whose start date has a three-digit year, which the forms now refuse, then runs the daily job.
  // The project has no members, so it can't affect anyone's pages while it exists.
  async dailyJobWithBrokenProject() {
    const project = await prisma.project.create({
      data: {
        name: `E2E broken dates ${Date.now()}`,
        type: "EVENT",
        startDate: new Date("0202-11-05T00:00:00.000+08:00"),
        targetDate: new Date("2027-01-31T15:59:59.999Z"),
        createdById: "demo-001",
      },
    });
    try {
      return await runDailyJob();
    } finally {
      await prisma.project.delete({ where: { id: project.id } });
    }
  },
  async deleteProject() {
    await prisma.project.delete({ where: { id: args[0] } });
    return true;
  },
};

commands[command]()
  .then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
