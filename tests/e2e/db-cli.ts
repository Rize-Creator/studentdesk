// Run by tsx from db.ts. Playwright can't load the generated Prisma client directly,
// because it compiles test files in a way that doesn't allow import.meta.
import "dotenv/config";
import { prisma } from "../../src/lib/db";

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<unknown>> = {
  async findTask() {
    const [projectId, title] = args;
    const task = await prisma.task.findFirstOrThrow({ where: { projectId, title }, include: { assignments: true } });
    return { id: task.id, status: task.status, recommendedRank: task.assignments[0]?.recommendedRank ?? null };
  },
  async getTask() {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: args[0] } });
    return { status: task.status, deliverableUrl: task.deliverableUrl };
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
