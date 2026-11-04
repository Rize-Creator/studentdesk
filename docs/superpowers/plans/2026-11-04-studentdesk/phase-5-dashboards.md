# Phase 5: Dashboards

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** the numbers match the board, and an adviser sees every project they advise.

**Branch:** `phase-5-dashboards`

---

### Task 1: Readiness and counts

**Files:**
- Create: `src/features/metrics/calculations.ts`
- Test: `src/features/metrics/calculations.test.ts`

**Interfaces:**
- Consumes: `TaskStatus`, `TASK_STATUSES`, `addDaysToKey`, `manilaDateKey`
- Produces:
  - `isOverdue(task, now)`, `isMilestoneComplete(milestone)`, `isMilestoneOverdue(milestone, now)`
  - `computeReadiness(input): Readiness`, where `Readiness = { status, completion, expected, overdueTasks, reasons: string[] }` and `status` is `"NO_TASKS" | "ON_TRACK" | "AT_RISK" | "BEHIND"`
  - `countByStatus(tasks)`, `countByCategory(tasks)`
  - `progressOverTime(events, startKey, endKey): { date: string; done: number }[]`
  - `timelinePercent(date, start, end): number`
  - `READINESS_LABELS`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  computeReadiness,
  countByCategory,
  countByStatus,
  isMilestoneComplete,
  isMilestoneOverdue,
  isOverdue,
  progressOverTime,
  timelinePercent,
  type MetricTask,
} from "./calculations";

const startDate = new Date("2026-01-01T00:00:00.000Z");
const targetDate = new Date("2026-01-11T00:00:00.000Z");
const now = new Date("2026-01-06T00:00:00.000Z"); // Halfway, so expected is 50.
const future = new Date("2026-02-01T00:00:00.000Z");
const past = new Date("2026-01-02T00:00:00.000Z");

const tasks = (done: number, other: number): MetricTask[] => [
  ...Array.from({ length: done }, () => ({ status: "DONE" as const, priority: "LOW" as const, deadline: past })),
  ...Array.from({ length: other }, () => ({ status: "TODO" as const, priority: "LOW" as const, deadline: future })),
];

const readiness = (taskList: MetricTask[], milestones = [] as Parameters<typeof computeReadiness>[0]["milestones"], at = now) =>
  computeReadiness({ tasks: taskList, milestones, startDate, targetDate, now: at });

describe("computeReadiness", () => {
  it("reports no tasks", () => {
    expect(readiness([]).status).toBe("NO_TASKS");
  });

  it("is on track when progress is close to schedule", () => {
    const result = readiness(tasks(9, 11)); // 45% done, 5 points behind.
    expect(result).toMatchObject({ status: "ON_TRACK", completion: 45, expected: 50, overdueTasks: 0 });
  });

  it("is at risk at exactly 10 points behind", () => {
    expect(readiness(tasks(2, 3)).status).toBe("AT_RISK"); // 40%.
  });

  it("is behind at exactly 25 points behind", () => {
    expect(readiness(tasks(1, 3)).status).toBe("BEHIND"); // 25%.
  });

  it("is at risk with any overdue task, even when ahead of schedule", () => {
    const list: MetricTask[] = [...tasks(9, 0), { status: "TODO", priority: "MEDIUM", deadline: past }];
    expect(readiness(list).status).toBe("AT_RISK");
  });

  it("is behind with an overdue high-priority task, even when ahead of schedule", () => {
    const list: MetricTask[] = [...tasks(9, 0), { status: "TODO", priority: "HIGH", deadline: past }];
    const result = readiness(list);
    expect(result.status).toBe("BEHIND");
    expect(result.reasons).toContain("1 overdue high-priority task");
  });

  it("is behind with an overdue milestone", () => {
    const milestones = [{ dueDate: past, completedAt: null, taskStatuses: ["TODO" as const] }];
    const result = readiness(tasks(9, 1), milestones);
    expect(result.status).toBe("BEHIND");
    expect(result.reasons).toContain("1 overdue milestone");
  });

  it("caps expected at 100 after the target date", () => {
    const late = new Date("2026-03-01T00:00:00.000Z");
    expect(readiness(tasks(5, 0), [], late)).toMatchObject({ status: "ON_TRACK", expected: 100, completion: 100 });
  });

  it("caps expected at 0 before the start date", () => {
    const early = new Date("2025-12-01T00:00:00.000Z");
    expect(readiness(tasks(0, 2), [], early)).toMatchObject({ status: "ON_TRACK", expected: 0 });
  });

  it("handles a project that starts and ends on the same moment", () => {
    const result = computeReadiness({ tasks: tasks(1, 0), milestones: [], startDate, targetDate: startDate, now });
    expect(result.expected).toBe(100);
  });
});

describe("overdue rules", () => {
  it("doesn't count a Done task as overdue", () => {
    expect(isOverdue({ status: "DONE", priority: "LOW", deadline: past }, now)).toBe(false);
  });

  it("counts a late unfinished task as overdue", () => {
    expect(isOverdue({ status: "REVIEW", priority: "LOW", deadline: past }, now)).toBe(true);
  });

  it("treats a milestone as complete when marked, or when all its tasks are Done", () => {
    expect(isMilestoneComplete({ dueDate: past, completedAt: now, taskStatuses: ["TODO"] })).toBe(true);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: ["DONE", "DONE"] })).toBe(true);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: ["DONE", "TODO"] })).toBe(false);
    expect(isMilestoneComplete({ dueDate: past, completedAt: null, taskStatuses: [] })).toBe(false);
  });

  it("doesn't count a complete milestone as overdue", () => {
    expect(isMilestoneOverdue({ dueDate: past, completedAt: now, taskStatuses: [] }, now)).toBe(false);
  });
});

describe("counts", () => {
  it("counts every stage, including empty ones", () => {
    expect(countByStatus(tasks(2, 1))).toEqual({ BACKLOG: 0, TODO: 1, IN_PROGRESS: 0, REVIEW: 0, DONE: 2 });
  });

  it("counts total and done per category", () => {
    const list = [
      { categoryName: "Finance", status: "DONE" as const },
      { categoryName: "Finance", status: "TODO" as const },
      { categoryName: "Creatives", status: "TODO" as const },
    ];
    expect(countByCategory(list)).toEqual([
      { name: "Creatives", total: 1, done: 0 },
      { name: "Finance", total: 2, done: 1 },
    ]);
  });
});

describe("progressOverTime", () => {
  it("adds up moves into Done per Manila day, and subtracts moves out", () => {
    const series = progressOverTime(
      [
        { at: new Date("2026-01-01T02:00:00.000Z"), delta: 1 },
        { at: new Date("2026-01-01T15:59:00.000Z"), delta: 1 },
        // 16:00 UTC is already the next day in Manila.
        { at: new Date("2026-01-01T16:00:00.000Z"), delta: 1 },
        { at: new Date("2026-01-03T02:00:00.000Z"), delta: -1 },
      ],
      "2026-01-01",
      "2026-01-03",
    );
    expect(series).toEqual([
      { date: "2026-01-01", done: 2 },
      { date: "2026-01-02", done: 3 },
      { date: "2026-01-03", done: 2 },
    ]);
  });

  it("keeps events from before the range in the running total", () => {
    const series = progressOverTime([{ at: new Date("2025-12-30T02:00:00.000Z"), delta: 1 }], "2026-01-01", "2026-01-01");
    expect(series).toEqual([{ date: "2026-01-01", done: 1 }]);
  });
});

describe("timelinePercent", () => {
  it("places a date along the project's span", () => {
    expect(timelinePercent(now, startDate, targetDate)).toBe(50);
  });

  it("stays within 0 to 100", () => {
    expect(timelinePercent(future, startDate, targetDate)).toBe(100);
    expect(timelinePercent(new Date("2025-01-01T00:00:00.000Z"), startDate, targetDate)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/metrics/calculations.test.ts`
Expected: FAIL, because `./calculations` doesn't exist.

- [ ] **Step 3: Create `src/features/metrics/calculations.ts`**

```ts
import { TASK_STATUSES, type TaskStatus } from "@/features/tasks/transitions";
import { addDaysToKey, manilaDateKey } from "@/lib/dates";

export type MetricTask = { status: TaskStatus; priority: "LOW" | "MEDIUM" | "HIGH"; deadline: Date };
export type MetricMilestone = { dueDate: Date; completedAt: Date | null; taskStatuses: TaskStatus[] };
export type ReadinessStatus = "NO_TASKS" | "ON_TRACK" | "AT_RISK" | "BEHIND";
export type Readiness = {
  status: ReadinessStatus;
  completion: number;
  expected: number;
  overdueTasks: number;
  reasons: string[];
};

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  NO_TASKS: "No tasks yet",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  BEHIND: "Behind",
};

// Draft thresholds, to confirm with advisers in Phase 8.
const AT_RISK_POINTS = 10;
const BEHIND_POINTS = 25;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function isOverdue(task: Pick<MetricTask, "status" | "deadline">, now: Date): boolean {
  return task.status !== "DONE" && task.deadline.getTime() < now.getTime();
}

export function isMilestoneComplete(milestone: MetricMilestone): boolean {
  if (milestone.completedAt) return true;
  return milestone.taskStatuses.length > 0 && milestone.taskStatuses.every((status) => status === "DONE");
}

export function isMilestoneOverdue(milestone: MetricMilestone, now: Date): boolean {
  return !isMilestoneComplete(milestone) && milestone.dueDate.getTime() < now.getTime();
}

export function timelinePercent(date: Date, start: Date, end: Date): number {
  const span = end.getTime() - start.getTime();
  if (span <= 0) return date.getTime() >= end.getTime() ? 100 : 0;
  return Math.min(100, Math.max(0, ((date.getTime() - start.getTime()) / span) * 100));
}

export function computeReadiness(input: {
  tasks: MetricTask[];
  milestones: MetricMilestone[];
  startDate: Date;
  targetDate: Date;
  now: Date;
}): Readiness {
  const { tasks, milestones, startDate, targetDate, now } = input;
  const expected = timelinePercent(now, startDate, targetDate);
  if (tasks.length === 0) {
    return { status: "NO_TASKS", completion: 0, expected, overdueTasks: 0, reasons: [] };
  }

  const done = tasks.filter((task) => task.status === "DONE").length;
  const completion = (done * 100) / tasks.length;
  // Rounded so that float maths can't move a project across a threshold.
  const pointsBehind = Number((expected - completion).toFixed(6));
  const overdue = tasks.filter((task) => isOverdue(task, now));
  const overdueHigh = overdue.filter((task) => task.priority === "HIGH").length;
  const overdueMilestones = milestones.filter((milestone) => isMilestoneOverdue(milestone, now)).length;

  const reasons: string[] = [];
  if (overdueHigh > 0) reasons.push(`${plural(overdueHigh, "overdue high-priority task")}`);
  if (overdueMilestones > 0) reasons.push(`${plural(overdueMilestones, "overdue milestone")}`);
  if (overdue.length > overdueHigh) reasons.push(`${plural(overdue.length - overdueHigh, "other overdue task")}`);
  if (pointsBehind >= AT_RISK_POINTS) reasons.push(`${Math.round(pointsBehind)} points behind schedule`);

  let status: ReadinessStatus = "ON_TRACK";
  if (overdueHigh > 0 || overdueMilestones > 0 || pointsBehind >= BEHIND_POINTS) status = "BEHIND";
  else if (overdue.length > 0 || pointsBehind >= AT_RISK_POINTS) status = "AT_RISK";

  return { status, completion, expected, overdueTasks: overdue.length, reasons };
}

export function countByStatus(tasks: { status: TaskStatus }[]): Record<TaskStatus, number> {
  const counts = Object.fromEntries(TASK_STATUSES.map((status) => [status, 0])) as Record<TaskStatus, number>;
  for (const task of tasks) counts[task.status] += 1;
  return counts;
}

export function countByCategory(tasks: { categoryName: string; status: TaskStatus }[]) {
  const rows = new Map<string, { name: string; total: number; done: number }>();
  for (const task of tasks) {
    const row = rows.get(task.categoryName) ?? { name: task.categoryName, total: 0, done: 0 };
    row.total += 1;
    if (task.status === "DONE") row.done += 1;
    rows.set(task.categoryName, row);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function progressOverTime(events: { at: Date; delta: 1 | -1 }[], startKey: string, endKey: string) {
  const perDay = new Map<string, number>();
  for (const event of events) {
    const key = manilaDateKey(event.at);
    perDay.set(key, (perDay.get(key) ?? 0) + event.delta);
  }
  let running = [...perDay.entries()]
    .filter(([key]) => key < startKey)
    .reduce((sum, [, delta]) => sum + delta, 0);

  const series: { date: string; done: number }[] = [];
  for (let key = startKey; key <= endKey; key = addDaysToKey(key, 1)) {
    running += perDay.get(key) ?? 0;
    series.push({ date: key, done: running });
  }
  return series;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/metrics/calculations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/metrics
git commit -m "feat: add readiness and dashboard calculations"
```

---

### Task 2: Dashboard data

**Files:**
- Create: `src/features/metrics/queries.ts`, `src/app/api/projects/[projectId]/dashboard/route.ts`, `src/app/api/me/work/route.ts`, `src/app/api/me/overview/route.ts`

**Interfaces:**
- Consumes: the calculations from Task 1, `prisma`, `getSessionUser`, `getMembership`
- Produces:
  - `getProjectDashboard(projectId, now?)`, `getMyWork(userId, now?)`, `getOverview(userId, now?)`. Every date is an ISO string, so the server's first render and the polled JSON have the same shape.
  - `loadReadiness(projectId, now?)`, used by the Readiness Report in Phase 6
  - The three GET routes, each 401 if signed out. The dashboard route is also 404 for non-members.

- [ ] **Step 1: Create `src/features/metrics/queries.ts`**

```ts
import { prisma } from "@/lib/db";
import { addDaysToKey, manilaDateKey } from "@/lib/dates";
import {
  computeReadiness,
  countByCategory,
  countByStatus,
  isMilestoneComplete,
  isMilestoneOverdue,
  isOverdue,
  progressOverTime,
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
  const endKey = todayKey < targetKey ? todayKey : targetKey;

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
  const [tasks, memberships] = await Promise.all([
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
    projects: memberships.map((member) => ({
      id: member.project.id,
      name: member.project.name,
      role: member.role,
      targetDate: member.project.targetDate.toISOString(),
    })),
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
  return { projects: rows };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;
```

- [ ] **Step 2: Create the three route handlers**

`src/app/api/projects/[projectId]/dashboard/route.ts`:

```ts
import { getMembership, getSessionUser } from "@/features/auth/session";
import { getProjectDashboard } from "@/features/metrics/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const member = await getMembership(projectId, user.id);
  if (!member) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json(await getProjectDashboard(projectId));
}
```

`src/app/api/me/work/route.ts`:

```ts
import { getSessionUser } from "@/features/auth/session";
import { getMyWork } from "@/features/metrics/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  return Response.json(await getMyWork(user.id));
}
```

`src/app/api/me/overview/route.ts`:

```ts
import { getSessionUser } from "@/features/auth/session";
import { getOverview } from "@/features/metrics/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  return Response.json(await getOverview(user.id));
}
```

- [ ] **Step 3: Check the sample data's readiness**

With `npm run dev` running and signed in as Prof. Elena Ramos in the browser, open `/api/me/overview`.

Expected: Foundation Day 2026 is `AT_RISK`, Capstone Group 3 Proposal is `ON_TRACK`, Intramurals 2026 is `BEHIND`.

- [ ] **Step 4: Run the type check and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add dashboard data and routes"
```

---

### Task 3: Dashboard screens

Invoke the `dataviz` skill before writing any chart code.

**Files:**
- Modify: `src/app/(app)/home/page.tsx`, `src/app/(app)/projects/[projectId]/page.tsx`, `src/app/(app)/layout.tsx` (add the Overview link)
- Create: `src/app/(app)/overview/page.tsx`, `src/app/(app)/projects/[projectId]/timeline/page.tsx`, `src/features/metrics/my-work.tsx`, `src/features/metrics/project-dashboard.tsx`, `src/features/metrics/overview.tsx`, `src/features/metrics/timeline.tsx`, `src/features/metrics/readiness-badge.tsx`

**Interfaces:**
- Consumes: the queries and routes from Task 2, `READINESS_LABELS`, `timelinePercent`, `STATUS_LABELS`, `formatManilaDate`
- Produces: the finished Home, Overview, project Overview and Timeline screens. Phase 6 adds the "Send Readiness Report" button to `project-dashboard.tsx`.

**Behavior:** every screen is a server page that loads the first data and passes it to a client component, which keeps it fresh with `useQuery` and `refetchInterval: 15_000`.

- **`/home`, My Work:** overdue count, my tasks by due date with overdue and due-soon marks, each linking to its project's board, and my projects. Empty state for people with no tasks.
- **`/overview`:** one card per project with readiness badge, completion percentage, overdue count, next milestone and role. Sorted with Behind first, then At Risk. Shown in the nav only if the person advises or leads a project. Empty state otherwise.
- **Project dashboard:**
  - Readiness badge with its reasons, completion bar with expected progress marked
  - Bar chart of tasks per stage, in board order
  - Bar chart of done and total per category
  - Line chart of progress over time
  - Overdue tasks, milestones with progress, and member workload as a table
  - Archived projects show the same data with an "Archived" notice
- **Timeline:** a date scale from `startDate` to `targetDate`, positioned with `timelinePercent`. Milestones appear as markers and task deadlines as dots, colored by state, with a "today" line. It scrolls sideways on phones, and the same items appear as a dated list below it, for screen readers and small screens. Build this last within the phase, because it's in the cut order.
- **Color:** readiness never relies on color alone, because the label is always shown.
- **Wording:** near the refresh indicator, say "Updates automatically every 15 seconds".

- [ ] **Step 1: Build the screens as described above**

- [ ] **Step 2: Check it in a browser, on `npm run dev`**

- Compare Foundation Day 2026's dashboard counts with its board. They must match exactly.
- Move a task on the board in a second tab. The dashboard updates within about 15 seconds.
- As Prof. Elena Ramos, `/overview` shows all three active projects, with Behind first.
- As Juan, a member of Foundation Day 2026, the dashboard shows but has no lead-only actions.
- Check every screen at phone width, in both light and dark mode. Charts must not overflow the page.

- [ ] **Step 3: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: everything passes.

- [ ] **Step 4: Commit and push for preview**

```bash
git add -A
git commit -m "feat: add My Work, project dashboard, overview and timeline"
git push -u origin phase-5-dashboards
```

## Phase 5 checklist for the user

Use the preview URL.

1. Sign in as **Member**. Your home page should list your tasks by due date, with overdue ones marked.
2. Sign in as **Adviser** and open **Overview**. You should see three projects: one Behind, one At Risk and one On Track.
3. Open **Foundation Day 2026**. Count the cards in each board column, and check that the dashboard's numbers match.
4. Open the same dashboard in a second window, move a task on the board, and wait about 15 seconds. The numbers should change by themselves.
5. Open the **Timeline**. The milestones and "today" line should look right.
6. Try the dashboard on your phone. Tell me if any chart is hard to read.
