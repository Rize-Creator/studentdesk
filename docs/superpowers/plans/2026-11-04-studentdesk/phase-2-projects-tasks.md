# Phase 2: Projects and tasks

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** a lead can set up a project from nothing, and members and advisers can't change what they shouldn't.

**Branch:** `phase-2-projects-tasks`

---

### Task 1: Form validation

**Files:**
- Create: `src/lib/validators/schemas.ts`
- Test: `src/lib/validators/schemas.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `projectSchema`, `memberSchema`, `milestoneSchema`, `taskSchema`, `deliverableSchema`, `sendBackSchema`, `normalizeLink(raw: string): string | null`, `fieldErrors(error)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { deliverableSchema, normalizeLink, projectSchema, sendBackSchema, taskSchema } from "./schemas";

describe("normalizeLink", () => {
  it("keeps a full link", () => {
    expect(normalizeLink("https://drive.google.com/file/abc")).toBe("https://drive.google.com/file/abc");
  });

  it("adds https to a pasted link with no protocol", () => {
    expect(normalizeLink("  drive.google.com/x ")).toBe("https://drive.google.com/x");
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://files.example.com/a", "not a link", "localhost"])(
    "refuses %s",
    (raw) => {
      expect(normalizeLink(raw)).toBeNull();
    },
  );
});

describe("deliverableSchema", () => {
  it("allows an empty link and note", () => {
    expect(deliverableSchema.parse({ deliverableUrl: "", deliverableNote: "" })).toEqual({
      deliverableUrl: null,
      deliverableNote: null,
    });
  });

  it("reports a bad link on its field", () => {
    const result = deliverableSchema.safeParse({ deliverableUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["deliverableUrl"]);
  });
});

describe("projectSchema", () => {
  const valid = { name: "Foundation Day", type: "EVENT", startDate: "2026-11-01", targetDate: "2026-12-01" };

  it("accepts a valid project", () => {
    expect(projectSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses a target date before the start date", () => {
    const result = projectSchema.safeParse({ ...valid, targetDate: "2026-10-01" });
    expect(result.error?.issues[0].path).toEqual(["targetDate"]);
  });
});

describe("taskSchema", () => {
  const valid = { title: "Book the sound system", categoryId: "c1", priority: "HIGH", deadline: "2026-11-07" };

  it("treats an empty assignee as no assignee", () => {
    expect(taskSchema.parse({ ...valid, assigneeId: "" }).assigneeId).toBeNull();
  });

  it("requires a deadline", () => {
    expect(taskSchema.safeParse({ ...valid, deadline: "" }).success).toBe(false);
  });

  it("keeps a title with Filipino characters intact", () => {
    expect(taskSchema.parse({ ...valid, title: "Ipadala kay Bañas" }).title).toBe("Ipadala kay Bañas");
  });
});

describe("sendBackSchema", () => {
  it("requires a note", () => {
    expect(sendBackSchema.safeParse({ note: "  " }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/schemas.test.ts`
Expected: FAIL, because `./schemas` doesn't exist.

- [ ] **Step 3: Create `src/lib/validators/schemas.ts`**

```ts
import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const title = z.string().trim().min(3, "Use at least 3 characters.").max(120, "Use 120 characters or fewer.");
const description = z.string().trim().max(2000, "Use 2,000 characters or fewer.").default("");
const optionalId = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullish()
    .transform((value) => value || null);

export function normalizeLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  try {
    const url = new URL(hasScheme ? value : `https://${value}`);
    const isWeb = url.protocol === "http:" || url.protocol === "https:";
    return isWeb && url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export const projectSchema = z
  .object({
    name: title,
    description,
    type: z.enum(["EVENT", "ACADEMIC"]),
    startDate: dateKey,
    targetDate: dateKey,
  })
  .refine((value) => value.targetDate >= value.startDate, {
    path: ["targetDate"],
    message: "The target date can't be before the start date.",
  });

export const memberSchema = z.object({
  userId: z.string().min(1, "Choose a person."),
  role: z.enum(["LEAD", "MEMBER", "ADVISER"]),
  committeeCategoryId: optionalId,
  committeeTitle: optionalText(80),
});

export const milestoneSchema = z.object({ title, dueDate: dateKey });

export const taskSchema = z.object({
  title,
  description,
  categoryId: z.string().min(1, "Choose a category."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  deadline: dateKey,
  assigneeId: optionalId,
  milestoneId: optionalId,
  recommendedRank: z.coerce.number().int().min(1).max(3).nullish(),
});

export const deliverableSchema = z.object({
  deliverableUrl: z
    .string()
    .nullish()
    .transform((value, ctx) => {
      if (!value?.trim()) return null;
      const link = normalizeLink(value);
      if (!link) {
        ctx.addIssue({ code: "custom", message: "Enter a valid web link." });
        return z.NEVER;
      }
      return link;
    }),
  deliverableNote: optionalText(1000),
});

export const sendBackSchema = z.object({
  note: z.string().trim().min(3, "Tell the assignee what to change.").max(1000, "Use 1,000 characters or fewer."),
});

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/schemas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators
git commit -m "feat: add form validation schemas"
```

---

### Task 2: Project, member and milestone changes

**Files:**
- Create: `src/features/projects/member-rules.ts`, `src/features/projects/actions.ts`, `src/features/projects/members.ts`, `src/features/projects/queries.ts`
- Modify: `src/features/auth/session.ts`
- Test: `src/features/projects/member-rules.test.ts`

**Interfaces:**
- Consumes: `prisma`, `can`, `getSessionUser`, `getMembership`, the schemas from Task 1, `ok`, `fail`, `endOfManilaDay`, `startOfManilaDay`
- Produces:
  - `authorize(projectId, action)` from `session.ts`, returning `{ ok: true, user, member, project }` or `{ ok: false, message }`
  - `wouldRemoveLastLead(members, change)`
  - Actions, all returning `ActionResult`: `createProject(input)`, `updateProject(projectId, input)`, `setProjectArchived(projectId, archived)`, `createMilestone(projectId, input)`, `updateMilestone(projectId, milestoneId, input)`, `setMilestoneComplete(projectId, milestoneId, complete)`, `deleteMilestone(projectId, milestoneId)`, `addMember(projectId, input)`, `updateMember(projectId, input)`, `removeMember(projectId, userId)`
  - Queries: `listMyProjects(userId)`, `listMembers(projectId)`, `searchPeople(projectId, query)`, `listCategories()`, `listMilestones(projectId)`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { wouldRemoveLastLead } from "./member-rules";

const team = [
  { userId: "a", role: "LEAD" as const },
  { userId: "b", role: "MEMBER" as const },
];

describe("wouldRemoveLastLead", () => {
  it("blocks removing the only lead", () => {
    expect(wouldRemoveLastLead(team, { userId: "a" })).toBe(true);
  });

  it("blocks changing the only lead to another role", () => {
    expect(wouldRemoveLastLead(team, { userId: "a", newRole: "MEMBER" })).toBe(true);
  });

  it("allows a lead to stay a lead", () => {
    expect(wouldRemoveLastLead(team, { userId: "a", newRole: "LEAD" })).toBe(false);
  });

  it("allows removing a member", () => {
    expect(wouldRemoveLastLead(team, { userId: "b" })).toBe(false);
  });

  it("allows removing one of two leads", () => {
    const twoLeads = [...team, { userId: "c", role: "LEAD" as const }];
    expect(wouldRemoveLastLead(twoLeads, { userId: "a" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/projects/member-rules.test.ts`
Expected: FAIL, because `./member-rules` doesn't exist.

- [ ] **Step 3: Create `src/features/projects/member-rules.ts`**

```ts
import type { ProjectRole } from "@/lib/permissions";

export function wouldRemoveLastLead(
  members: { userId: string; role: ProjectRole }[],
  change: { userId: string; newRole?: ProjectRole },
): boolean {
  if (change.newRole === "LEAD") return false;
  const remainingLeads = members.filter((m) => m.role === "LEAD" && m.userId !== change.userId);
  const target = members.find((m) => m.userId === change.userId);
  return target?.role === "LEAD" && remainingLeads.length === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/projects/member-rules.test.ts`
Expected: PASS

- [ ] **Step 5: Add `authorize` to `src/features/auth/session.ts`**

Add this import and function. Every Server Action in later tasks starts with it.

```ts
import { can, type ProjectAction } from "@/lib/permissions";

export async function authorize(projectId: string, action: ProjectAction) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, message: "Please sign in again." };
  const member = await getMembership(projectId, user.id);
  if (!member || !can(member.role, action)) {
    return { ok: false as const, message: "You don't have permission to do that." };
  }
  // Archived projects are read-only, except that a lead can restore one.
  if (member.project.status === "ARCHIVED" && action !== "project:edit") {
    return { ok: false as const, message: "This project is archived." };
  }
  return { ok: true as const, user, member, project: member.project };
}
```

- [ ] **Step 6: Create `src/features/projects/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { authorize, getSessionUser } from "@/features/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { endOfManilaDay, startOfManilaDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, milestoneSchema, projectSchema } from "@/lib/validators/schemas";

const CHECK_FORM = "Please check the form.";

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  const { startDate, targetDate, ...rest } = parsed.data;
  const project = await prisma.project.create({
    data: {
      ...rest,
      startDate: startOfManilaDay(startDate),
      targetDate: endOfManilaDay(targetDate),
      createdById: user.id,
      members: { create: { userId: user.id, role: "LEAD" } },
    },
  });
  revalidatePath("/projects");
  return ok({ id: project.id });
}

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "project:edit");
  if (!auth.ok) return fail(auth.message);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  const { startDate, targetDate, ...rest } = parsed.data;
  await prisma.project.update({
    where: { id: projectId },
    data: { ...rest, startDate: startOfManilaDay(startDate), targetDate: endOfManilaDay(targetDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function setProjectArchived(projectId: string, archived: boolean): Promise<ActionResult> {
  const auth = await authorize(projectId, "project:edit");
  if (!auth.ok) return fail(auth.message);
  await prisma.project.update({ where: { id: projectId }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function createMilestone(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  await prisma.milestone.create({
    data: { projectId, title: parsed.data.title, dueDate: endOfManilaDay(parsed.data.dueDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function updateMilestone(projectId: string, milestoneId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) return fail(CHECK_FORM, fieldErrors(parsed.error));
  // updateMany with projectId stops a lead of one project editing another project's milestone.
  await prisma.milestone.updateMany({
    where: { id: milestoneId, projectId },
    data: { title: parsed.data.title, dueDate: endOfManilaDay(parsed.data.dueDate) },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function setMilestoneComplete(projectId: string, milestoneId: string, complete: boolean): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  await prisma.milestone.updateMany({
    where: { id: milestoneId, projectId },
    data: { completedAt: complete ? new Date() : null },
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function deleteMilestone(projectId: string, milestoneId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "milestones:manage");
  if (!auth.ok) return fail(auth.message);
  await prisma.milestone.deleteMany({ where: { id: milestoneId, projectId } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
```

- [ ] **Step 7: Create `src/features/projects/members.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/features/auth/session";
import { wouldRemoveLastLead } from "@/features/projects/member-rules";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/db";
import { fieldErrors, memberSchema } from "@/lib/validators/schemas";

const LAST_LEAD = "A project must always have at least one lead.";

export async function addMember(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: parsed.data.userId } },
  });
  if (existing) return fail("That person is already in this project.");
  await prisma.projectMember.create({ data: { projectId, ...parsed.data } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function updateMember(projectId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { userId, ...data } = parsed.data;
  const team = await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true, role: true } });
  if (wouldRemoveLastLead(team, { userId, newRole: data.role })) return fail(LAST_LEAD);
  await prisma.$transaction(async (tx) => {
    await tx.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data });
    // Advisers can't hold tasks, so unfinished work goes back to the lead to reassign.
    if (data.role === "ADVISER") {
      await tx.task.updateMany({
        where: { projectId, assigneeId: userId, status: { not: "DONE" } },
        data: { assigneeId: null },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  const team = await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true, role: true } });
  if (wouldRemoveLastLead(team, { userId })) return fail(LAST_LEAD);
  await prisma.$transaction(async (tx) => {
    // Unfinished tasks are unassigned. Finished tasks keep their record for recommendations.
    await tx.task.updateMany({
      where: { projectId, assigneeId: userId, status: { not: "DONE" } },
      data: { assigneeId: null },
    });
    await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
```

An unassigned task can't stay in In Progress, Review or Done (spec Section 7). The move rules only check when a task moves, so a task left in In Progress after this keeps its place until the lead reassigns it. The board marks it "Unassigned" (Phase 3).

- [ ] **Step 8: Create `src/features/projects/queries.ts`**

```ts
import { prisma } from "@/lib/db";

export function listMyProjects(userId: string) {
  return prisma.projectMember.findMany({
    where: { userId },
    include: { project: { include: { _count: { select: { tasks: true, members: true } } } } },
    orderBy: { project: { targetDate: "asc" } },
  });
}

export function listMembers(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true, committeeCategory: true },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });
}

// Only people who have signed in at least once exist as users (spec Section 6).
export function searchPeople(projectId: string, query: string) {
  const text = query.trim();
  if (text.length < 2) return Promise.resolve([]);
  return prisma.user.findMany({
    where: {
      memberships: { none: { projectId } },
      OR: [
        { name: { contains: text, mode: "insensitive" } },
        { email: { contains: text, mode: "insensitive" } },
        { lmsId: { contains: text, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 10,
    orderBy: { name: "asc" },
  });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export function listMilestones(projectId: string) {
  return prisma.milestone.findMany({
    where: { projectId },
    include: { tasks: { select: { status: true } } },
    orderBy: { dueDate: "asc" },
  });
}
```

- [ ] **Step 9: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/features/projects src/features/auth/session.ts
git commit -m "feat: add project, member and milestone changes"
```

---

### Task 3: Task changes

**Files:**
- Create: `src/features/tasks/positions.ts`, `src/features/tasks/actions.ts`, `src/features/tasks/queries.ts`
- Modify: `src/lib/action-result.ts`
- Test: `src/features/tasks/positions.test.ts`

**Interfaces:**
- Consumes: `authorize`, `prisma`, `taskSchema`, `fieldErrors`, `ok`, `fail`, `endOfManilaDay`
- Produces:
  - `positionAtEnd(max: number | null): number`
  - `positionBetween(before: number | null, after: number | null): number`
  - `createTask(projectId, input): Promise<ActionResult<{ id: string }>>`, `updateTask(projectId, taskId, input)`, `deleteTask(projectId, taskId)`
  - `getTaskDetail(projectId, taskId)`, `listTasks(projectId)`
  - `safeCall(fn)`, which turns a thrown error into a failed `ActionResult` for client components

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { positionAtEnd, positionBetween } from "./positions";

describe("card positions", () => {
  it("starts an empty column at 1000", () => {
    expect(positionAtEnd(null)).toBe(1000);
  });

  it("adds to the end of a column", () => {
    expect(positionAtEnd(3000)).toBe(4000);
  });

  it("places a card between two others", () => {
    expect(positionBetween(1000, 2000)).toBe(1500);
  });

  it("places a card at the top", () => {
    expect(positionBetween(null, 1000)).toBe(0);
  });

  it("places a card at the bottom", () => {
    expect(positionBetween(2000, null)).toBe(3000);
  });

  it("handles an empty column", () => {
    expect(positionBetween(null, null)).toBe(1000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/tasks/positions.test.ts`
Expected: FAIL, because `./positions` doesn't exist.

- [ ] **Step 3: Create `src/features/tasks/positions.ts`**

```ts
const STEP = 1000;

export function positionAtEnd(max: number | null): number {
  return (max ?? 0) + STEP;
}

export function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return STEP;
  if (before === null) return after! - STEP;
  if (after === null) return before + STEP;
  return (before + after) / 2;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/tasks/positions.test.ts`
Expected: PASS

- [ ] **Step 5: Add `safeCall` to `src/lib/action-result.ts`**

```ts
export async function safeCall<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch {
    return fail("Something went wrong. Please try again.");
  }
}
```

- [ ] **Step 6: Create `src/features/tasks/actions.ts`**

Phase 3 adds `moveTask` here, and Phase 6 adds the emails.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/features/auth/session";
import { positionAtEnd } from "@/features/tasks/positions";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { endOfManilaDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { fieldErrors, taskSchema } from "@/lib/validators/schemas";

const NEEDS_ASSIGNEE = ["IN_PROGRESS", "REVIEW", "DONE"];

async function checkReferences(
  projectId: string,
  data: { assigneeId: string | null; milestoneId: string | null; categoryId: string },
): Promise<string | null> {
  if (data.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: data.assigneeId } },
    });
    if (!member || member.role === "ADVISER") return "That person can't be assigned tasks in this project.";
  }
  if (data.milestoneId) {
    const count = await prisma.milestone.count({ where: { id: data.milestoneId, projectId } });
    if (count === 0) return "That milestone isn't in this project.";
  }
  const category = await prisma.category.count({ where: { id: data.categoryId } });
  return category === 0 ? "Choose a category." : null;
}

export async function createTask(projectId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { deadline, recommendedRank, ...data } = parsed.data;
  const problem = await checkReferences(projectId, data);
  if (problem) return fail(problem);

  const status = data.assigneeId ? "TODO" : "BACKLOG";
  const task = await prisma.$transaction(async (tx) => {
    const last = await tx.task.aggregate({ where: { projectId, status }, _max: { position: true } });
    const created = await tx.task.create({
      data: {
        ...data,
        projectId,
        status,
        position: positionAtEnd(last._max.position),
        deadline: endOfManilaDay(deadline),
        createdById: auth.user.id,
      },
    });
    await tx.taskStatusHistory.create({
      data: { taskId: created.id, fromStatus: null, toStatus: status, changedById: auth.user.id },
    });
    if (data.assigneeId) {
      await tx.taskAssignment.create({
        data: {
          taskId: created.id,
          assigneeId: data.assigneeId,
          assignedById: auth.user.id,
          recommendedRank: recommendedRank ?? null,
        },
      });
    }
    return created;
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok({ id: task.id });
}

export async function updateTask(projectId: string, taskId: string, input: unknown): Promise<ActionResult> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { deadline, recommendedRank, ...data } = parsed.data;
  const problem = await checkReferences(projectId, data);
  if (problem) return fail(problem);

  const current = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!current) return fail("That task no longer exists.");
  if (!data.assigneeId && NEEDS_ASSIGNEE.includes(current.status)) {
    return fail("Move this task back to To Do before removing its assignee.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { ...data, deadline: endOfManilaDay(deadline) } });
    if (data.assigneeId && data.assigneeId !== current.assigneeId) {
      await tx.taskAssignment.create({
        data: {
          taskId,
          assigneeId: data.assigneeId,
          assignedById: auth.user.id,
          recommendedRank: recommendedRank ?? null,
        },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}

export async function deleteTask(projectId: string, taskId: string): Promise<ActionResult> {
  const auth = await authorize(projectId, "tasks:manage");
  if (!auth.ok) return fail(auth.message);
  const current = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!current) return fail("That task no longer exists.");
  // Recommendations depend on the records of finished tasks.
  if (current.status === "DONE") return fail("Finished tasks can't be deleted.");
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
```

- [ ] **Step 7: Create `src/features/tasks/queries.ts`**

```ts
import { prisma } from "@/lib/db";

export function getTaskDetail(projectId: string, taskId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignee: { select: { id: true, name: true } },
      category: true,
      milestone: { select: { id: true, title: true } },
      history: { include: { changedBy: { select: { name: true } } }, orderBy: { changedAt: "desc" } },
      assignments: {
        include: {
          assignee: { select: { name: true } },
          assignedBy: { select: { name: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });
}

export function listTasks(projectId: string) {
  return prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { id: true, name: true } }, category: true },
    orderBy: { deadline: "asc" },
  });
}
```

- [ ] **Step 8: Run the checks**

```bash
npx vitest run src/features/tasks/positions.test.ts
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add src/features/tasks src/lib/action-result.ts
git commit -m "feat: add task changes with assignment history"
```

---

### Task 4: Project and task screens

**Files:**
- Modify: `src/features/projects/members.ts` (add `findPeople`)
- Create:
  - `src/app/(app)/projects/page.tsx`, `src/app/(app)/projects/new/page.tsx`
  - `src/app/(app)/projects/[projectId]/layout.tsx`, `page.tsx`
  - `src/app/(app)/projects/[projectId]/tasks/page.tsx`
  - `src/app/(app)/projects/[projectId]/members/page.tsx`
  - `src/app/(app)/projects/[projectId]/milestones/page.tsx`
  - `src/app/(app)/projects/[projectId]/settings/page.tsx`
  - `src/features/projects/project-form.tsx`, `src/features/tasks/task-form.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3, `requireUser`, `requireMember`, `can`, `safeCall`
- Produces: `TaskForm` with props `{ projectId, task?, categories, members, milestones, onDone }`. Phase 3 opens it from the board, and Phase 4 adds the suggestion panel to it.

**Screens:**
- **`/projects`:** the user's projects as cards, showing name, type, role, target date and a "sample" look for sample data. Active projects first, then archived ones. A "New project" button. An empty state explains how to start.
- **`/projects/new`:** `ProjectForm`. On success, goes to the new project.
- **`[projectId]/layout.tsx`:** calls `requireMember(projectId)`. Shows the project name and an "Archived" badge if archived. Tabs: Overview, Board, Tasks, Timeline, Members, Milestones, and Settings for leads only. Board and Timeline can be disabled until their phases are done.
- **`[projectId]/page.tsx`:** a project summary for now. Phase 5 replaces it with the dashboard.
- **`tasks`:** a table of tasks with title, category, priority, status, assignee and deadline. It also works well on phones. Leads get "New task", edit and delete.
- **`members`:** everyone with role and committee. Leads can search people with `findPeople`, add them, change a role or committee, and remove them. Show `fail` messages such as the last-lead one.
- **`milestones`:** the list with due dates. Leads can add, edit, delete and mark complete.
- **`settings`:** leads only, others get the not-found page. Edit the project, archive or restore it.
- Forms show `fieldErrors` beside each field. Every action call goes through `safeCall`, and failures show as a toast.
- Category, priority, assignee, milestone and status fields are native `<select>` elements with visible labels, which work best on phones. The browser test in Phase 7 relies on this.
- Buttons a role can't use are hidden, but the server still refuses those actions.

- [ ] **Step 1: Add `findPeople` to `src/features/projects/members.ts`**

```ts
import { searchPeople } from "@/features/projects/queries";

export async function findPeople(projectId: string, query: string): Promise<ActionResult<{ id: string; name: string; email: string }[]>> {
  const auth = await authorize(projectId, "members:manage");
  if (!auth.ok) return fail(auth.message);
  return ok(await searchPeople(projectId, query));
}
```

- [ ] **Step 2: Build the screens as described above**

Use the look set in Phase 1. Dates in forms use `<input type="date">`, and values go to the server as `YYYY-MM-DD`.

- [ ] **Step 3: Check permissions in a browser, on `npm run dev`**

Using the built-in browser with the `dev` sample data:
- As Maria (lead of Foundation Day 2026): create a project, add a member, create a task, and try to remove yourself as the only lead of the new project. That should show the last-lead message.
- As Juan (member of Foundation Day 2026): the project's task, member and milestone buttons shouldn't appear, and `/projects/<id>/settings` shows the not-found page.
- As a user who isn't in a project: opening its URL shows the not-found page.

- [ ] **Step 4: Run all checks**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: everything passes.

- [ ] **Step 5: Commit and push for preview**

```bash
git add -A
git commit -m "feat: add project, member, milestone and task screens"
git push -u origin phase-2-projects-tasks
```

## Phase 2 checklist for the user

Use the preview URL.

1. Sign in as **Lead**. Create a new project. Try a target date before the start date, which should show an error beside the field.
2. In your new project, add **Juan Dela Cruz** as a member and **Prof. Elena Ramos** as an adviser. Give Juan a committee title and category.
3. Add a milestone, then create two tasks: one with an assignee and one without.
4. Try to remove yourself. It should refuse because you're the only lead.
5. Sign in as **Member**. You should see the project but no buttons for adding or editing tasks, members or milestones.
6. Sign in as **Adviser**. You should be able to view everything and change nothing.
7. As **Lead**, archive the project and check that its buttons are gone. Then restore it.
8. Try all of this once on your phone, and tell me what feels awkward.
