# Phase 7: Demo prep

**Read first:** [the overview](../2026-11-04-studentdesk.md), which holds the Global Constraints.

**Done when:** the full demo runs clean twice on the live site, and the recording is saved.

**Branch:** `phase-7-demo-prep`

**Timing:** features stop Friday 6 PM, and after that only bugs get fixed. Code freezes Friday night.

---

### Task 1: Full browser test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/chapter-3-workflow.spec.ts`

**Interfaces:**
- Consumes: the finished screens, `prisma`, the sample data on the `dev` database
- Produces: `npm run test:e2e`

- [ ] **Step 1: Install the test browser**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Create `tests/e2e/chapter-3-workflow.spec.ts`**

If a screen's final wording differs, change the names here to match. Don't weaken what the test checks.

```ts
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/lib/db";

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
}

test("sign in, create a project, assign with a suggestion, move the task, queue the email", async ({ page }) => {
  const projectName = `E2E project ${Date.now()}`;
  const taskTitle = `E2E task ${Date.now()}`;

  // Lead creates a project.
  await signIn(page, /Lead:/);
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(projectName);
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("Target date").fill("2027-01-31");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/(?!new)[^/]+$/);
  const projectId = new URL(page.url()).pathname.split("/").at(-1)!;

  // Lead adds a member.
  await page.goto(`/projects/${projectId}/members`);
  await page.getByLabel("Find a person").fill("Juan");
  await page.getByRole("button", { name: /Add Juan Dela Cruz/ }).click();
  await expect(page.getByRole("cell", { name: "Juan Dela Cruz" })).toBeVisible();

  // Lead creates a task and takes the first suggestion.
  await page.goto(`/projects/${projectId}/board`);
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title").fill(taskTitle);
  await page.getByLabel("Category").selectOption({ label: "Logistics" });
  await page.getByLabel("Deadline").fill("2027-01-15");
  await expect(page.getByText(/% match/).first()).toBeVisible();
  await page.getByRole("button", { name: /Assign Juan Dela Cruz/ }).click();
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();

  // The suggestion's rank and the assignment email are saved.
  const task = await prisma.task.findFirstOrThrow({ where: { projectId, title: taskTitle }, include: { assignments: true } });
  expect(task.status).toBe("TODO");
  expect(task.assignments[0].recommendedRank).not.toBeNull();
  await expect
    .poll(() => prisma.notification.count({ where: { taskId: task.id, type: "TASK_ASSIGNED" } }))
    .toBe(1);

  // Member moves their own task to Review, but can't mark it Done.
  await signOut(page);
  await signIn(page, /Member:/);
  await page.goto(`/projects/${projectId}/board`);
  await page.getByText(taskTitle).click();
  await expect(page.getByRole("option", { name: "Done" })).toHaveCount(0);
  await page.getByLabel("Status").selectOption({ label: "In Progress" });
  await page.getByLabel("Status").selectOption({ label: "Review" });
  await page.getByLabel("Deliverable link").fill("drive.google.com/x");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect
    .poll(async () => (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status)
    .toBe("REVIEW");
  const reviewed = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
  expect(reviewed.deliverableUrl).toBe("https://drive.google.com/x");

  // Lead marks it Done, and the history shows every move.
  await signOut(page);
  await signIn(page, /Lead:/);
  await page.goto(`/projects/${projectId}/board`);
  await page.getByText(taskTitle).click();
  await page.getByLabel("Status").selectOption({ label: "Done" });
  await expect
    .poll(async () => (await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).status)
    .toBe("DONE");
  const history = await prisma.taskStatusHistory.findMany({ where: { taskId: task.id }, orderBy: { changedAt: "asc" } });
  expect(history.map((row) => row.toStatus)).toEqual(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
  await expect.poll(() => prisma.notification.count({ where: { taskId: task.id, type: "TASK_DONE" } })).toBe(1);

  // Clean up, so repeat runs don't affect recommendation counts on the dev database.
  await prisma.project.delete({ where: { id: projectId } });
});

test("signed-out visitors can't open app pages or data", async ({ page, request }) => {
  await page.goto("/home");
  await page.waitForURL("**/sign-in**");
  const response = await request.get("/api/me/work");
  expect(response.status()).toBe(401);
});
```

- [ ] **Step 4: Run it**

```bash
npm run test:e2e
```

Expected: both tests pass. If drag and drop needs checking too, do that by hand in the checklist, because scripted drags can be unreliable.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add full browser test of the Chapter III workflow"
```

---

### Task 2: Phone check, empty states and errors

**Files:**
- Create: `src/app/(app)/error.tsx`, `src/app/(app)/loading.tsx`, `src/app/(app)/projects/[projectId]/loading.tsx`
- Modify: any screen the checks below find a problem with

**Interfaces:**
- Consumes: all screens
- Produces: nothing that later tasks rely on

- [ ] **Step 1: Create `src/app/(app)/error.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p>The page couldn&apos;t load. This can happen if the database is waking up. Please try again.</p>
      <Button onClick={reset} className="self-start">Try again</Button>
    </main>
  );
}
```

- [ ] **Step 2: Add loading skeletons**

Create the two `loading.tsx` files using the `Skeleton` component, shaped like the page content, so the first load after Neon wakes up doesn't look broken.

- [ ] **Step 3: Walk through every screen at phone width**

Using the built-in browser's mobile preset, as each of the three roles: guest home, sign-in, My Work, Overview, Projects, new project, dashboard, board, task detail, task form with suggestions, tasks, members, member history, milestones, settings, timeline. Fix:
- Anything that scrolls the whole page sideways. Only the board and timeline may scroll sideways, inside their own area.
- Text or buttons that overlap or get cut off.
- Touch targets that are too small to tap.

- [ ] **Step 4: Check every empty state**

With a brand-new project and a new user: no projects, no tasks, no members besides the lead, no milestones, a dashboard with no tasks showing "No tasks yet", and a suggestion panel with one candidate. Each shows a short helpful message, not a blank area or an error.

- [ ] **Step 5: Run all checks and commit**

```bash
npm test
npx tsc --noEmit
npm run build
git add -A
git commit -m "feat: add loading and error states, and fix phone layout"
```

---

### Task 3: Defense materials

**Files:**
- Create: `docs/defense/demo-script.md`, `docs/defense/panel-qa.md`, `docs/defense/code-walkthrough.md`

**Interfaces:**
- Consumes: spec Section 17, and the finished system
- Produces: the documents the team rehearses from

Write these from the finished system, not from this plan, so every step and name matches what's on screen.

- [ ] **Step 1: Write `docs/defense/demo-script.md`**

A 5 to 7 minute script, with the exact clicks and what to say at each step, in this order:
1. Guest home page: the problem and the purpose.
2. Sign-in: state plainly that this is demo mode and the LMS isn't connected yet.
3. As the lead, on Foundation Day 2026: dashboard, showing At Risk and why.
4. New Creatives task: suggestions with reasons, and Paolo being held back for workload. This is the main moment.
5. Assign it, and show the email arriving in the inbox.
6. As the member: move the task to Review with a link.
7. As the lead: send it back with a note or mark it Done, and show the live update in a second window.
8. As the adviser: Overview with all three projects, then "Send Readiness Report", and open the email.
9. Close with what's next: interviews, the real LMS, and the ISO/IEC 25010 evaluation.

Also list who presents each part, and what to do if something fails. For example, if email is slow, move on and show the earlier email.

- [ ] **Step 2: Write `docs/defense/panel-qa.md`**

Start from spec Section 17, and add the formula with a worked example, the readiness rules, and why each manuscript fix was made. Answers must stay honest about what's sample data and what's pending.

- [ ] **Step 3: Write `docs/defense/code-walkthrough.md`**

Four parts, so each member can own one and explain it in their own words, with the file to open and the 3 or 4 things to point out:
1. Sign-in and the LMS adapter: `src/features/lms/`, `src/features/auth/`
2. Board and move rules: `src/features/tasks/transitions.ts`, `src/features/tasks/actions.ts`
3. Recommendations: `src/features/recommendations/engine.ts`
4. Dashboards and email: `src/features/metrics/calculations.ts`, `src/features/notifications/`

The team decides who takes which part.

- [ ] **Step 4: Commit and push for preview**

```bash
git add -A
git commit -m "docs: add demo script, panel Q&A and code walkthrough"
git push -u origin phase-7-demo-prep
```

---

### Task 4: Get the live site ready

**Files:** none, unless the run-through finds a bug

**Interfaces:**
- Consumes: everything
- Produces: the final live site, and the `defense-2026-11-07` Git tag

- [ ] **Step 1: User step: check Production settings on Vercel**

Under Environment Variables for **Production**: `APP_URL` is the live URL, `EMAIL_MODE` is `smtp`, and `LMS_MODE` is `mock`. Under **Settings → Cron Jobs**, `/api/cron/daily` is listed.

- [ ] **Step 2: Merge and update the `main` database**

Merge the branch into `main`, then have the user run these in their own terminal, so the strings stay out of the logs. They paste Neon `main`'s direct and pooled strings:

```bash
DIRECT_URL="<NEON_MAIN_DIRECT_URL>" npx prisma migrate deploy
DATABASE_URL="<NEON_MAIN_POOLED_URL>" DIRECT_URL="<NEON_MAIN_DIRECT_URL>" npm run db:seed
```

The seed prints the database hostname, which should be the `main` branch's.

- [ ] **Step 3: Run the full demo twice on the live site**

Follow `docs/defense/demo-script.md` exactly, on a phone and a laptop. Fix only real bugs, each on a small branch through a preview. After a fix, run the demo again.

- [ ] **Step 4: User step: record the backup**

Record the full demo on the live site, including an email arriving. Save it on two devices.

- [ ] **Step 5: Tag the frozen version**

```bash
git tag defense-2026-11-07
git push origin defense-2026-11-07
```

## Saturday morning

1. Reset the sample data with the seed command from Step 2, so its dates are fresh. Check the printed hostname first.
2. Open the live site a few minutes early, and sign in once to wake the database.
3. Sign out of every demo account, and open the demo inbox in its own tab.
4. Have a phone hotspot ready, and the backup recording on a device.
5. Rehearse once, then reset the sample data again if the rehearsal changed anything.

## Phase 7 checklist for the user

1. Run the demo script from start to finish on the live site, without help from me. Time it.
2. Open the live site on your phone and do steps 4 to 7 of the script.
3. Ask a teammate who hasn't seen it to try signing in and moving a task. Note where they get stuck.
4. Have each teammate explain their part of the code walkthrough out loud.
5. Check the four "fix before the defense" items in the manuscript are done.
