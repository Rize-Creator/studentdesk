# Phase 3: Kanban board

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** moves are saved, appear in a second browser within about 10 seconds, and a member can't mark a task Done.

**Branch:** `phase-3-board`

---

### Task 1: Move rules

**Files:**
- Create: `src/features/tasks/transitions.ts`
- Test: `src/features/tasks/transitions.test.ts`

**Interfaces:**
- Consumes: `ProjectRole`
- Produces:
  - `type TaskStatus`, `TASK_STATUSES`, `STATUS_LABELS`
  - `checkMove(input: MoveInput): { ok: true } | { ok: false; reason: MoveDenied; message: string }`
  - `isSendBack(from, to): boolean`, `MEMBER_STAGES`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { checkMove, isSendBack, type MoveInput } from "./transitions";

const base: MoveInput = {
  role: "MEMBER",
  archived: false,
  isAssignee: true,
  hasAssignee: true,
  from: "TODO",
  to: "IN_PROGRESS",
};

const denied = (input: Partial<MoveInput>) => {
  const result = checkMove({ ...base, ...input });
  return result.ok ? null : result.reason;
};

describe("leads", () => {
  const lead = { role: "LEAD" as const, isAssignee: false };

  it("can move any assigned task to any stage", () => {
    expect(denied({ ...lead, from: "BACKLOG", to: "DONE" })).toBeNull();
    expect(denied({ ...lead, from: "DONE", to: "TODO" })).toBeNull();
  });

  it("must add a note to send a task back from Review", () => {
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS" })).toBe("note-required");
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS", note: "Fix the date" })).toBeNull();
    expect(denied({ ...lead, from: "REVIEW", to: "IN_PROGRESS", note: "   " })).toBe("note-required");
  });

  it("can mark Done from Review with no note", () => {
    expect(denied({ ...lead, from: "REVIEW", to: "DONE" })).toBeNull();
  });
});

describe("members", () => {
  it("can move their own task between To Do, In Progress and Review", () => {
    expect(denied({ from: "TODO", to: "IN_PROGRESS" })).toBeNull();
    expect(denied({ from: "IN_PROGRESS", to: "REVIEW" })).toBeNull();
    expect(denied({ from: "REVIEW", to: "IN_PROGRESS" })).toBeNull();
  });

  it("can't mark a task Done", () => {
    expect(denied({ from: "REVIEW", to: "DONE" })).toBe("lead-only");
  });

  it("can't move a task into or out of Backlog or out of Done", () => {
    expect(denied({ from: "BACKLOG", to: "TODO" })).toBe("lead-only");
    expect(denied({ from: "TODO", to: "BACKLOG" })).toBe("lead-only");
    expect(denied({ from: "DONE", to: "IN_PROGRESS" })).toBe("lead-only");
  });

  // Review Focus 2: a stale board, where the card was reassigned a few seconds ago.
  it("can't move a card that was reassigned to someone else", () => {
    expect(denied({ isAssignee: false, from: "TODO", to: "IN_PROGRESS" })).toBe("not-assignee");
  });

  it("can reorder their own card within a column", () => {
    expect(denied({ from: "TODO", to: "TODO" })).toBeNull();
  });
});

describe("advisers", () => {
  it("can't move anything", () => {
    expect(denied({ role: "ADVISER", isAssignee: false })).toBe("adviser");
  });
});

describe("any role", () => {
  it("can't move a task in an archived project", () => {
    expect(denied({ role: "LEAD", archived: true })).toBe("archived");
  });

  it.each(["IN_PROGRESS", "REVIEW", "DONE"] as const)("needs an assignee to enter %s", (to) => {
    expect(denied({ role: "LEAD", hasAssignee: false, isAssignee: false, from: "TODO", to })).toBe("needs-assignee");
  });

  it("allows an unassigned task in Backlog and To Do", () => {
    expect(denied({ role: "LEAD", hasAssignee: false, isAssignee: false, from: "BACKLOG", to: "TODO" })).toBeNull();
  });
});

describe("isSendBack", () => {
  it("is true when leaving Review for an earlier stage", () => {
    expect(isSendBack("REVIEW", "IN_PROGRESS")).toBe(true);
    expect(isSendBack("REVIEW", "TODO")).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isSendBack("REVIEW", "DONE")).toBe(false);
    expect(isSendBack("REVIEW", "REVIEW")).toBe(false);
    expect(isSendBack("TODO", "IN_PROGRESS")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/tasks/transitions.test.ts`
Expected: FAIL, because `./transitions` doesn't exist.

- [ ] **Step 3: Create `src/features/tasks/transitions.ts`**

```ts
import type { ProjectRole } from "@/lib/permissions";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

export const TASK_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

export const MEMBER_STAGES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW"];
const NEEDS_ASSIGNEE: TaskStatus[] = ["IN_PROGRESS", "REVIEW", "DONE"];

export type MoveInput = {
  role: ProjectRole;
  archived: boolean;
  isAssignee: boolean;
  hasAssignee: boolean;
  from: TaskStatus;
  to: TaskStatus;
  note?: string | null;
};

export type MoveDenied = "archived" | "adviser" | "lead-only" | "not-assignee" | "needs-assignee" | "note-required";

const MESSAGES: Record<MoveDenied, string> = {
  archived: "This project is archived.",
  adviser: "Advisers can view tasks but can't move them.",
  "lead-only": "Only a lead can make that move.",
  "not-assignee": "This task isn't assigned to you anymore.",
  "needs-assignee": "Assign someone before moving this task there.",
  "note-required": "Add a note so the assignee knows what to change.",
};

const deny = (reason: MoveDenied) => ({ ok: false as const, reason, message: MESSAGES[reason] });

export function isSendBack(from: TaskStatus, to: TaskStatus): boolean {
  return from === "REVIEW" && to !== "REVIEW" && to !== "DONE";
}

export function checkMove(input: MoveInput): { ok: true } | ReturnType<typeof deny> {
  const { role, archived, isAssignee, hasAssignee, from, to, note } = input;
  if (archived) return deny("archived");
  if (role === "ADVISER") return deny("adviser");
  if (role === "MEMBER") {
    if (!isAssignee) return deny("not-assignee");
    if (!MEMBER_STAGES.includes(from) || !MEMBER_STAGES.includes(to)) return deny("lead-only");
  }
  if (from !== to && !hasAssignee && NEEDS_ASSIGNEE.includes(to)) return deny("needs-assignee");
  // A member pulling their own task back from Review needs no note. Only a lead's send-back does.
  if (role === "LEAD" && isSendBack(from, to) && !note?.trim()) return deny("note-required");
  return { ok: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/tasks/transitions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/transitions.ts src/features/tasks/transitions.test.ts
git commit -m "feat: add task move rules"
```

---

### Task 2: Saving a move

**Files:**
- Modify: `src/features/tasks/positions.ts`, `src/features/tasks/positions.test.ts`, `src/features/tasks/actions.ts`, `src/lib/validators/schemas.ts`

**Interfaces:**
- Consumes: `checkMove`, `isSendBack`, `positionBetween`, `positionAtEnd`, `getSessionUser`, `getMembership`, `deliverableSchema`
- Produces:
  - `dropTarget(cards, activeId, overId): { to: TaskStatus; beforeId: string | null; afterId: string | null } | null`
  - `moveTask(projectId, taskId, input): Promise<ActionResult>`, where input is `{ to, beforeId?, afterId?, note?, deliverableUrl?, deliverableNote? }`

- [ ] **Step 1: Add the failing test to `positions.test.ts`**

```ts
import { dropTarget } from "./positions";

describe("dropTarget", () => {
  const cards = [
    { id: "a", status: "TODO" as const, position: 1000 },
    { id: "b", status: "TODO" as const, position: 2000 },
    { id: "c", status: "TODO" as const, position: 3000 },
    { id: "d", status: "REVIEW" as const, position: 1000 },
  ];

  it("drops at the end of a column when dropped on the column", () => {
    expect(dropTarget(cards, "a", "REVIEW")).toEqual({ to: "REVIEW", beforeId: "d", afterId: null });
  });

  it("drops into an empty column", () => {
    expect(dropTarget(cards, "a", "DONE")).toEqual({ to: "DONE", beforeId: null, afterId: null });
  });

  it("drops above a card from another column", () => {
    expect(dropTarget(cards, "d", "b")).toEqual({ to: "TODO", beforeId: "a", afterId: "b" });
  });

  it("drops below a card when dragging down within a column", () => {
    expect(dropTarget(cards, "a", "b")).toEqual({ to: "TODO", beforeId: "b", afterId: "c" });
  });

  it("drops above a card when dragging up within a column", () => {
    expect(dropTarget(cards, "c", "b")).toEqual({ to: "TODO", beforeId: "a", afterId: "b" });
  });

  it("does nothing when dropped on itself", () => {
    expect(dropTarget(cards, "b", "b")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/tasks/positions.test.ts`
Expected: FAIL, because `dropTarget` isn't exported.

- [ ] **Step 3: Add `dropTarget` to `positions.ts`**

```ts
import { TASK_STATUSES, type TaskStatus } from "./transitions";

type Card = { id: string; status: TaskStatus; position: number };

// overId is either a column's status or another card's ID.
export function dropTarget(cards: Card[], activeId: string, overId: string) {
  if (activeId === overId) return null;
  const inColumn = (status: TaskStatus) =>
    cards.filter((c) => c.status === status && c.id !== activeId).sort((a, b) => a.position - b.position);

  if (TASK_STATUSES.includes(overId as TaskStatus)) {
    const column = inColumn(overId as TaskStatus);
    return { to: overId as TaskStatus, beforeId: column.at(-1)?.id ?? null, afterId: null };
  }

  const active = cards.find((c) => c.id === activeId);
  const over = cards.find((c) => c.id === overId);
  if (!active || !over) return null;

  const column = inColumn(over.status);
  const overIndex = column.findIndex((c) => c.id === overId);
  const draggingDown = active.status === over.status && active.position < over.position;
  const insertAt = draggingDown ? overIndex + 1 : overIndex;
  return {
    to: over.status,
    beforeId: column[insertAt - 1]?.id ?? null,
    afterId: column[insertAt]?.id ?? null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/tasks/positions.test.ts`
Expected: PASS

- [ ] **Step 5: Add `moveSchema` to `schemas.ts`**

```ts
export const moveSchema = z.object({
  to: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  beforeId: optionalId,
  afterId: optionalId,
  note: optionalText(1000),
});
```

- [ ] **Step 6: Add `moveTask` to `src/features/tasks/actions.ts`**

```ts
import { getMembership, getSessionUser } from "@/features/auth/session";
import { positionBetween } from "@/features/tasks/positions";
import { checkMove } from "@/features/tasks/transitions";
import { deliverableSchema, moveSchema } from "@/lib/validators/schemas";

export async function moveTask(projectId: string, taskId: string, input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Please sign in again.");
  const member = await getMembership(projectId, user.id);
  if (!member) return fail("You don't have permission to do that.");
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", fieldErrors(parsed.error));
  const { to, beforeId, afterId, note } = parsed.data;

  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) return fail("That task no longer exists.");

  // The server re-checks every move, because the board on screen may be out of date.
  const check = checkMove({
    role: member.role,
    archived: member.project.status === "ARCHIVED",
    isAssignee: task.assigneeId === user.id,
    hasAssignee: task.assigneeId !== null,
    from: task.status,
    to,
    note,
  });
  if (!check.ok) return fail(check.message);

  const deliverable = deliverableSchema.safeParse(input);
  if (!deliverable.success) return fail("Please check the form.", fieldErrors(deliverable.error));

  const neighbours = await prisma.task.findMany({
    where: { projectId, status: to, id: { in: [beforeId, afterId].filter((id): id is string => Boolean(id)) } },
    select: { id: true, position: true },
  });
  const before = neighbours.find((n) => n.id === beforeId)?.position ?? null;
  const after = neighbours.find((n) => n.id === afterId)?.position ?? null;
  const changedStage = task.status !== to;

  await prisma.$transaction(async (tx) => {
    let position = positionBetween(before, after);
    if (before === null && after === null) {
      const last = await tx.task.aggregate({ where: { projectId, status: to }, _max: { position: true } });
      position = positionAtEnd(last._max.position);
    }
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: to,
        position,
        completedAt: to === "DONE" ? (task.completedAt ?? new Date()) : null,
        // Leaving the dialog blank keeps whatever was submitted earlier.
        ...(to === "REVIEW" && changedStage
          ? {
              deliverableUrl: deliverable.data.deliverableUrl ?? task.deliverableUrl,
              deliverableNote: deliverable.data.deliverableNote ?? task.deliverableNote,
            }
          : {}),
      },
    });
    if (changedStage) {
      await tx.taskStatusHistory.create({
        data: { taskId, fromStatus: task.status, toStatus: to, changedById: user.id, note },
      });
    }
  });
  revalidatePath(`/projects/${projectId}`, "layout");
  return ok();
}
```

- [ ] **Step 7: Run the checks**

```bash
npx vitest run src/features/tasks
npx tsc --noEmit
```

Expected: both pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/tasks src/lib/validators/schemas.ts
git commit -m "feat: save task moves with history and ordering"
```

---

### Task 3: Live board data

**Files:**
- Create: `src/components/query-provider.tsx`, `src/app/api/projects/[projectId]/board/route.ts`, `src/app/api/projects/[projectId]/tasks/[taskId]/route.ts`
- Modify: `src/features/tasks/queries.ts`, `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `getSessionUser`, `getMembership`, `getTaskDetail`, `prisma`
- Produces:
  - `getBoard(projectId): Promise<BoardTask[]>`
  - `type BoardTask = { id, title, status, position, priority, categoryName, assigneeId, assigneeName, deadline: string, hasDeliverable: boolean }`
  - `GET /api/projects/:id/board`, returning `{ tasks: BoardTask[] }`, 401 if signed out and 404 if not a member
  - `GET /api/projects/:id/tasks/:taskId`, returning the task detail, with the same checks

- [ ] **Step 1: Add `getBoard` to `src/features/tasks/queries.ts`**

```ts
import type { TaskStatus } from "./transitions";

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  position: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  categoryName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  deadline: string;
  hasDeliverable: boolean;
};

export async function getBoard(projectId: string): Promise<BoardTask[]> {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { id: true, name: true } }, category: true },
    orderBy: { position: "asc" },
  });
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    position: task.position,
    priority: task.priority,
    categoryName: task.category.name,
    assigneeId: task.assignee?.id ?? null,
    assigneeName: task.assignee?.name ?? null,
    deadline: task.deadline.toISOString(),
    hasDeliverable: Boolean(task.deliverableUrl),
  }));
}
```

- [ ] **Step 2: Create `src/app/api/projects/[projectId]/board/route.ts`**

```ts
import { getMembership, getSessionUser } from "@/features/auth/session";
import { getBoard } from "@/features/tasks/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const member = await getMembership(projectId, user.id);
  if (!member) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json({ tasks: await getBoard(projectId) });
}
```

- [ ] **Step 3: Create `src/app/api/projects/[projectId]/tasks/[taskId]/route.ts`**

```ts
import { getMembership, getSessionUser } from "@/features/auth/session";
import { getTaskDetail } from "@/features/tasks/queries";

type Params = { params: Promise<{ projectId: string; taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId, taskId } = await params;
  const user = await getSessionUser();
  if (!user) return Response.json({ message: "Please sign in again." }, { status: 401 });
  const member = await getMembership(projectId, user.id);
  if (!member) return Response.json({ message: "Not found." }, { status: 404 });
  const task = await getTaskDetail(projectId, taskId);
  if (!task) return Response.json({ message: "Not found." }, { status: 404 });
  return Response.json({ task });
}
```

- [ ] **Step 4: Create `src/components/query-provider.tsx` and wrap the `(app)` layout's children in it**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: Run the type check and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add live board and task data routes"
```

---

### Task 4: Board screen

**Files:**
- Create: `src/app/(app)/projects/[projectId]/board/page.tsx`, `src/features/tasks/board.tsx`, `src/features/tasks/board-card.tsx`, `src/features/tasks/task-detail.tsx`, `src/features/tasks/submit-review-dialog.tsx`, `src/features/tasks/send-back-dialog.tsx`

**Interfaces:**
- Consumes: `requireMember`, `getBoard`, `moveTask`, `dropTarget`, `checkMove`, `isSendBack`, `STATUS_LABELS`, `TaskForm`, `safeCall`
- Produces: the Board tab. Phase 4 adds the suggestion panel through `TaskForm`, so nothing else changes here.

**Behavior:**
- **Page:** the server loads `requireMember` and `getBoard`, then passes the tasks, `viewerId`, `role` and `archived` to `Board`.
- **Refresh:** `useQuery` with key `["board", projectId]`, `initialData`, and `refetchInterval: dragging ? false : 10_000`. Background refetching stays off, so it only runs while the tab is visible.
- **Drag and drop:** one `DndContext` with `id="board"`, which stops hydration warnings. Sensors: `PointerSensor` (6px distance), `TouchSensor` (200ms delay), `KeyboardSensor`. Each column is a droppable with the status as its ID, using `SortableContext`.
- **On drop:** `dropTarget` gives the destination, then `checkMove` runs on the client with no note.
  - Denied with `note-required`: open `SendBackDialog`.
  - Denied otherwise: show the message as a toast and leave the card in place.
  - Moving to Review from another stage: open `SubmitReviewDialog` for the optional link and note.
  - Otherwise: call `moveTask` straight away.
- **Optimistic update:** `useMutation` updates the cache in `onMutate`. In `onError` or on a failed `ActionResult`, it restores the old cache and shows the server's message. It always refetches afterward, which corrects a stale board.
- **Cards:** title, category, priority, assignee, deadline. Overdue deadlines are highlighted. A link icon shows when a deliverable exists. "Unassigned" is highlighted for tasks in In Progress or later. Cards a viewer can't move have no drag handle.
- **Columns:** show a count and scroll sideways with snap on phones.
- **Task detail:** clicking a card opens a dialog that loads from the task route. It shows all fields, the deliverable link with `target="_blank" rel="noopener noreferrer"`, the move and assignment history, and any send-back notes. A status dropdown lists the stages the viewer may move to, and works without dragging. Leads get edit and delete, using `TaskForm`.
- **Leads** get a "New task" button above the board.
- **Archived projects** show the board with no dragging.

- [ ] **Step 1: Build the screens as described above**

- [ ] **Step 2: Check it in two browsers, on `npm run dev`**

Using the built-in browser and a second tab or profile, signed in as Maria and as Juan on Foundation Day 2026:
- Drag as Maria, and see it appear for Juan within about 10 seconds.
- As Juan, move his own task to Review and submit `drive.google.com/x` as the link. Open the task and confirm it's saved as `https://drive.google.com/x`.
- As Juan, a card that isn't his can't be dragged, and dragging his own card to Done shows "Only a lead can make that move."
- As Maria, drag from Review to In Progress. The send-back dialog appears and requires a note.
- Reassign a task away from Juan as Maria, then move it as Juan before his board refreshes. The card returns and shows the "isn't assigned to you anymore" message.
- Use the status dropdown at phone width.
- Check the browser console has no hydration warnings.

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
git commit -m "feat: add Kanban board with drag and drop"
git push -u origin phase-3-board
```

## Phase 3 checklist for the user

Use the preview URL. Open it in two browsers, or use one normal window and one private window.

1. Sign in as **Lead** in one window and **Member** in the other. Open the Foundation Day 2026 board in both.
2. As Lead, drag a card to another column. It should appear in the other window within about 10 seconds.
3. As Member, move your own task to **Review**, and paste a link when asked.
4. As Member, try dragging your task to **Done**. It should refuse.
5. As Lead, drag that task back to In Progress. It should ask for a note. Open the task and check the history shows the move and the note.
6. As Lead, move a task to **Done**. Refresh the page, and it should still be there.
7. On your phone, open a task and change its status with the dropdown.
8. Sign in as **Adviser**. You should see the board but be unable to move anything.
