import "dotenv/config";
import { randomUUID } from "node:crypto";
import { DEMO_ACCOUNTS, demoEmail } from "../src/features/lms/mock-client";
import { addDaysToKey, endOfManilaDay, manilaDateKey, startOfManilaDay } from "../src/lib/dates";
import { prisma } from "../src/lib/db";
import { assertSeedAllowed } from "../src/lib/seed-guard";

type Role = "LEAD" | "MEMBER" | "ADVISER";
type Status = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type Seat = [username: string, role: Role, committeeCategory?: string, committeeTitle?: string];
type Row = [title: string, category: string, priority: Priority, status: Status, assignee: string | null, deadlineOffset: number, milestone: number | null];

const CATEGORIES = ["Logistics", "Documentation", "Creatives", "Finance"];

const TITLES: Record<string, string[]> = {
  Logistics: ["Reserve the venue", "Arrange chairs and tables", "Coordinate the sound system", "Prepare the registration area", "Arrange transportation", "Set up the stage"],
  Documentation: ["Write the activity proposal", "Prepare attendance sheets", "Take event photos", "Write the narrative report", "Draft the program flow", "Compile the post-activity report"],
  Creatives: ["Design the event poster", "Create social media banners", "Design certificates", "Prepare the stage backdrop", "Edit the highlight video", "Design ID lanyards"],
  Finance: ["Prepare the budget plan", "Collect participation fees", "Canvass supplier prices", "Liquidate expenses", "Prepare the financial report", "Track sponsorship funds"],
};

// [username, category, on-time count, late count]
const PAST: { name: string; start: number; target: number; team: Seat[]; work: [string, string, number, number][] }[] = [
  {
    name: "Foundation Day 2025 (sample)", start: -400, target: -340,
    team: [["maria.santos", "LEAD"], ["juan.delacruz", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["liza.mendoza", "MEMBER", "Finance", "Finance Officer"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Member"], ["elena.ramos", "ADVISER"]],
    work: [["juan.delacruz", "Logistics", 5, 1], ["ana.reyes", "Documentation", 4, 0], ["paolo.garcia", "Creatives", 4, 1], ["liza.mendoza", "Finance", 3, 0], ["carlo.bautista", "Logistics", 2, 1], ["maria.santos", "Documentation", 2, 0]],
  },
  {
    name: "Intramurals 2025 (sample)", start: -300, target: -260,
    team: [["juan.delacruz", "LEAD"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Finance", "Treasurer"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["maria.santos", "MEMBER", "Documentation", "Secretary"], ["mark.villanueva", "ADVISER"]],
    work: [["carlo.bautista", "Logistics", 3, 1], ["ana.reyes", "Finance", 2, 1], ["paolo.garcia", "Creatives", 3, 0], ["maria.santos", "Documentation", 3, 1], ["juan.delacruz", "Logistics", 2, 0]],
  },
  {
    name: "Acquaintance Party 2026 (sample)", start: -150, target: -120,
    team: [["liza.mendoza", "LEAD"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["elena.ramos", "ADVISER"]],
    work: [["paolo.garcia", "Creatives", 2, 2], ["carlo.bautista", "Logistics", 3, 0], ["ana.reyes", "Documentation", 2, 0], ["liza.mendoza", "Finance", 3, 1]],
  },
];

const ACTIVE: { name: string; type: "EVENT" | "ACADEMIC"; start: number; target: number; team: Seat[]; milestones: [string, number][]; rows: Row[] }[] = [
  {
    name: "Foundation Day 2026 (sample)", type: "EVENT", start: -21, target: 14,
    team: [["maria.santos", "LEAD"], ["juan.delacruz", "MEMBER", "Logistics", "Logistics Head"], ["ana.reyes", "MEMBER", "Documentation", "Documentation Head"], ["paolo.garcia", "MEMBER", "Creatives", "Creatives Head"], ["liza.mendoza", "MEMBER", "Finance", "Finance Officer"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Member"], ["elena.ramos", "ADVISER"]],
    milestones: [["Budget approved", -7], ["Venue and permits confirmed", 2], ["Publicity launched", 6], ["Final run-through", 12]],
    rows: [
      ["Prepare the budget plan", "Finance", "HIGH", "DONE", "liza.mendoza", -18, 0],
      ["Canvass supplier prices", "Finance", "MEDIUM", "DONE", "liza.mendoza", -14, 0],
      ["Write the activity proposal", "Documentation", "HIGH", "DONE", "ana.reyes", -16, 0],
      ["Request venue availability", "Logistics", "MEDIUM", "DONE", "juan.delacruz", -12, 1],
      ["Draft the program flow", "Documentation", "MEDIUM", "DONE", "ana.reyes", -10, 3],
      ["Design the event logo", "Creatives", "MEDIUM", "DONE", "paolo.garcia", -9, 2],
      ["Secure the school permit", "Documentation", "HIGH", "DONE", "ana.reyes", -6, 1],
      ["Collect committee contributions", "Finance", "LOW", "DONE", "liza.mendoza", -4, null],
      ["Arrange the stage layout", "Logistics", "LOW", "DONE", "carlo.bautista", -2, 3],
      ["Design the event poster", "Creatives", "HIGH", "REVIEW", "paolo.garcia", 1, 2],
      ["Confirm the venue reservation", "Logistics", "HIGH", "REVIEW", "juan.delacruz", 2, 1],
      ["Book the sound system", "Logistics", "MEDIUM", "IN_PROGRESS", "carlo.bautista", -1, 3],
      ["Create social media banners", "Creatives", "MEDIUM", "IN_PROGRESS", "paolo.garcia", 3, 2],
      ["Prepare attendance sheets", "Documentation", "LOW", "IN_PROGRESS", "ana.reyes", 5, null],
      ["Design certificates", "Creatives", "LOW", "TODO", "paolo.garcia", 7, null],
      ["Arrange transportation", "Logistics", "MEDIUM", "TODO", "juan.delacruz", 8, 3],
      ["Prepare the financial report", "Finance", "LOW", "TODO", "liza.mendoza", 9, null],
      ["Recruit event volunteers", "Logistics", "MEDIUM", "BACKLOG", null, 10, null],
    ],
  },
  {
    name: "Capstone Group 3 Proposal (sample)", type: "ACADEMIC", start: -30, target: 30,
    team: [["juan.delacruz", "LEAD"], ["ana.reyes", "MEMBER"], ["carlo.bautista", "MEMBER"], ["elena.ramos", "ADVISER"], ["mark.villanueva", "ADVISER"]],
    milestones: [["Proposal outline approved", -14], ["Proposal defense", 30]],
    rows: [
      ["Write the Chapter I draft", "Documentation", "HIGH", "DONE", "ana.reyes", -20, 0],
      ["Write the Chapter II draft", "Documentation", "HIGH", "DONE", "ana.reyes", -12, 1],
      ["Build the ERD", "Documentation", "MEDIUM", "DONE", "carlo.bautista", -10, 1],
      ["Design the prototype screens", "Creatives", "MEDIUM", "DONE", "carlo.bautista", -7, 1],
      ["Review related studies", "Documentation", "MEDIUM", "DONE", "juan.delacruz", -5, 1],
      ["Write the Chapter III draft", "Documentation", "HIGH", "IN_PROGRESS", "ana.reyes", 5, 1],
      ["Prepare the evaluation form", "Documentation", "MEDIUM", "TODO", "juan.delacruz", 12, 1],
      ["Prepare the defense slides", "Creatives", "MEDIUM", "TODO", "carlo.bautista", 20, 1],
    ],
  },
  {
    name: "Intramurals 2026 (sample)", type: "EVENT", start: -10, target: 5,
    team: [["paolo.garcia", "LEAD"], ["carlo.bautista", "MEMBER", "Logistics", "Logistics Head"], ["liza.mendoza", "MEMBER", "Finance", "Treasurer"], ["elena.ramos", "ADVISER"], ["mark.villanueva", "ADVISER"]],
    milestones: [["Team registration closed", -2], ["Opening ceremony", 5]],
    rows: [
      ["Open team registration", "Logistics", "MEDIUM", "DONE", "carlo.bautista", -8, 0],
      ["Schedule the games", "Logistics", "HIGH", "IN_PROGRESS", "carlo.bautista", -1, 1],
      ["Design the team banners", "Creatives", "MEDIUM", "IN_PROGRESS", "paolo.garcia", 2, 1],
      ["Collect registration fees", "Finance", "MEDIUM", "TODO", "liza.mendoza", 1, 0],
      ["Prepare the medals", "Logistics", "LOW", "TODO", "paolo.garcia", 3, 1],
      ["Book the referees", "Logistics", "MEDIUM", "BACKLOG", null, 4, 1],
    ],
  },
  // Gives the Lead, Member and Adviser demo accounts more to show. Nobody here is near the workload
  // limit, and it adds no Logistics or Creatives history, so the demo's suggestions stay the same.
  {
    name: "Recognition Day 2026 (sample)", type: "EVENT", start: -14, target: 21,
    team: [["maria.santos", "LEAD"], ["juan.delacruz", "MEMBER"], ["ana.reyes", "MEMBER"], ["liza.mendoza", "MEMBER"], ["elena.ramos", "ADVISER"]],
    milestones: [["Awardee list approved", -3], ["Invitations sent", 5], ["Program rehearsal", 18]],
    rows: [
      ["Write the recognition criteria", "Documentation", "HIGH", "DONE", "juan.delacruz", -10, 0],
      ["Compile the nominations", "Documentation", "MEDIUM", "DONE", "ana.reyes", -8, 0],
      ["List the awardees", "Documentation", "HIGH", "DONE", "juan.delacruz", -5, 0],
      ["Draft the invitation letter", "Documentation", "MEDIUM", "DONE", "maria.santos", -4, 1],
      ["Canvass medal prices", "Finance", "LOW", "DONE", "liza.mendoza", -3, null],
      ["Write the awardee citations", "Documentation", "HIGH", "REVIEW", "ana.reyes", 5, 1],
      ["Prepare the awards budget", "Finance", "MEDIUM", "REVIEW", "liza.mendoza", 7, null],
      ["Prepare the opening remarks", "Documentation", "MEDIUM", "IN_PROGRESS", "maria.santos", 4, 2],
      ["Confirm the guest speaker", "Documentation", "HIGH", "IN_PROGRESS", "maria.santos", 6, 1],
      ["Approve the program flow", "Documentation", "MEDIUM", "TODO", "maria.santos", 10, 2],
      ["Prepare the awards list", "Documentation", "MEDIUM", "TODO", "juan.delacruz", 12, 2],
      ["Arrange the photo booth", "Creatives", "LOW", "BACKLOG", null, 15, 2],
    ],
  },
];

const today = manilaDateKey(new Date());
const day = (offset: number) => addDaysToKey(today, offset);
const midMorning = (offset: number) => new Date(`${day(offset)}T10:00:00.000+08:00`);
const userId = (username: string) => DEMO_ACCOUNTS.find((a) => a.username === username)!.lmsId.toLowerCase();
const categoryId = (name: string) => `category-${name.toLowerCase()}`;

const members: object[] = [];
const milestones: object[] = [];
const tasks: object[] = [];
const history: object[] = [];
const assignments: object[] = [];
let position = 0;

function addTask(input: { projectId: string; leadId: string; title: string; category: string; priority: Priority; status: Status; assigneeId: string | null; deadlineOffset: number; milestoneId: string | null; doneOffset?: number }) {
  const id = randomUUID();
  // A week before the deadline, but never in the future, even for tasks due soon.
  const createdAt = midMorning(Math.min(input.deadlineOffset - 7, -2));
  const completedAt = input.status === "DONE" ? midMorning(input.doneOffset ?? input.deadlineOffset - 1) : null;
  position += 1000;
  tasks.push({
    id, projectId: input.projectId, title: input.title, categoryId: categoryId(input.category), priority: input.priority, status: input.status,
    position, assigneeId: input.assigneeId, milestoneId: input.milestoneId, deadline: endOfManilaDay(day(input.deadlineOffset)),
    completedAt, createdById: input.leadId, createdAt,
  });
  history.push({ id: randomUUID(), taskId: id, fromStatus: null, toStatus: "TODO", changedById: input.leadId, changedAt: createdAt });
  if (input.status !== "TODO" && input.status !== "BACKLOG") {
    history.push({ id: randomUUID(), taskId: id, fromStatus: "TODO", toStatus: input.status, changedById: input.assigneeId ?? input.leadId, changedAt: completedAt ?? midMorning(-1) });
  }
  if (input.assigneeId) {
    assignments.push({ id: randomUUID(), taskId: id, assigneeId: input.assigneeId, assignedById: input.leadId, assignedAt: createdAt });
  }
}

function addTeam(projectId: string, team: Seat[]) {
  for (const [username, role, category, title] of team) {
    members.push({ id: randomUUID(), projectId, userId: userId(username), role, committeeCategoryId: category ? categoryId(category) : null, committeeTitle: title ?? null });
  }
}

async function main() {
  assertSeedAllowed(process.env);
  console.log(`Resetting sample data on ${new URL(process.env.DATABASE_URL!).hostname}`);

  await prisma.notification.deleteMany();
  await prisma.project.deleteMany(); // Cascades to members, milestones, tasks, history and assignments.
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  await prisma.category.createMany({ data: CATEGORIES.map((name) => ({ id: categoryId(name), name })) });
  await prisma.user.createMany({
    data: DEMO_ACCOUNTS.map((a) => ({ id: a.lmsId.toLowerCase(), lmsId: a.lmsId, name: a.name, email: demoEmail(a.username) })),
  });

  const projects: object[] = [];

  for (const past of PAST) {
    const projectId = randomUUID();
    const leadId = userId(past.team[0][0]);
    projects.push({ id: projectId, name: past.name, type: "EVENT", status: "ARCHIVED", startDate: startOfManilaDay(day(past.start)), targetDate: endOfManilaDay(day(past.target)), createdById: leadId });
    addTeam(projectId, past.team);
    let titleIndex = 0;
    for (const [username, category, onTime, late] of past.work) {
      for (let i = 0; i < onTime + late; i++) {
        const deadlineOffset = past.target - (i + 1) * 2;
        addTask({
          projectId, leadId, title: TITLES[category][titleIndex++ % TITLES[category].length], category, priority: "MEDIUM", status: "DONE",
          assigneeId: userId(username), deadlineOffset, milestoneId: null,
          doneOffset: i < onTime ? deadlineOffset - 1 : deadlineOffset + 2,
        });
      }
    }
  }

  for (const active of ACTIVE) {
    const projectId = randomUUID();
    const leadId = userId(active.team[0][0]);
    projects.push({ id: projectId, name: active.name, type: active.type, status: "ACTIVE", startDate: startOfManilaDay(day(active.start)), targetDate: endOfManilaDay(day(active.target)), createdById: leadId });
    addTeam(projectId, active.team);
    const milestoneIds = active.milestones.map(([title, offset]) => {
      const id = randomUUID();
      milestones.push({ id, projectId, title, dueDate: endOfManilaDay(day(offset)) });
      return id;
    });
    for (const [title, category, priority, status, assignee, deadlineOffset, milestone] of active.rows) {
      addTask({ projectId, leadId, title, category, priority, status, assigneeId: assignee ? userId(assignee) : null, deadlineOffset, milestoneId: milestone === null ? null : milestoneIds[milestone] });
    }
  }

  await prisma.project.createMany({ data: projects as never });
  await prisma.projectMember.createMany({ data: members as never });
  await prisma.milestone.createMany({ data: milestones as never });
  await prisma.task.createMany({ data: tasks as never });
  await prisma.taskStatusHistory.createMany({ data: history as never });
  await prisma.taskAssignment.createMany({ data: assignments as never });

  console.log(`Created ${projects.length} projects and ${tasks.length} tasks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
