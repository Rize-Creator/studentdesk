// Each test here pins a bug found while testing the finished system with unusual input and timing.
import { expect, test, type Page } from "@playwright/test";
import { db } from "./db";

const POLL = { timeout: 30_000 };
const LONG_PROJECT = `E2E ${"M".repeat(90)}`;
const LONG_TASK = `E2E ${"W".repeat(100)}`;
const LONG_MILESTONE = `E2E ${"X".repeat(100)}`;
const LONG_LINK = "https://drive.google.com/file/d/1A2b3C4d5E6f7G8h9I0jK1L2M3N4O5P6Q7r8S9t0UvWxYz/view?usp=sharing";

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

async function newProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(name);
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("Target date").fill("2027-01-31");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/(?!new)[^/]+$/);
  return new URL(page.url()).pathname.split("/").at(-1)!;
}

async function newTask(page: Page, projectId: string, title: string, assignee: string) {
  await page.goto(`/projects/${projectId}/board`);
  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Category").selectOption({ label: "Logistics" });
  await page.getByLabel("Deadline").fill("2027-01-15");
  await page.getByLabel("Assignee").selectOption({ label: assignee });
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByText(title).first()).toBeVisible();
  return db.findTask(projectId, title);
}

async function moveWithDropdown(page: Page, projectId: string, taskId: string, stage: string, status: string) {
  await page.goto(`/projects/${projectId}/board?task=${taskId}`);
  await page.getByLabel("Status").selectOption({ label: stage });
  if (status === "REVIEW") {
    await page.getByLabel("Deliverable link").fill(LONG_LINK);
    await page.getByLabel("Note").fill("N".repeat(140));
    await page.getByRole("button", { name: "Submit for review" }).click();
  }
  await expect.poll(() => db.getTask(taskId).status, POLL).toBe(status);
}

test("after a member leaves, the lead can still edit that member's unfinished task", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, /Lead:/);
  const projectId = await newProject(page, `E2E orphan ${Date.now()}`);
  try {
    await page.goto(`/projects/${projectId}/members`);
    await page.getByLabel("Find a person").fill("Juan");
    await page.getByRole("button", { name: /Add Juan Dela Cruz/ }).click();
    await expect(page.getByRole("cell", { name: "Juan Dela Cruz" })).toBeVisible();
    const task = await newTask(page, projectId, "E2E task of someone who left", "Juan Dela Cruz");
    await moveWithDropdown(page, projectId, task.id, "In Progress", "IN_PROGRESS");

    await page.goto(`/projects/${projectId}/members`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("row", { name: /Juan Dela Cruz/ }).getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("cell", { name: "Juan Dela Cruz" })).toHaveCount(0);
    expect(db.getTask(task.id)).toMatchObject({ status: "IN_PROGRESS", assigneeId: null });

    // Changing only the deadline used to be refused with "Move this task back to To Do before removing its assignee."
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.getByRole("button", { name: "Edit task" }).click();
    await page.getByLabel("Deadline").fill("2027-01-25");
    await page.getByRole("button", { name: "Save task" }).click();
    await expect.poll(() => db.getTask(task.id).deadline.slice(0, 10), POLL).toBe("2027-01-25");
    expect(db.getTask(task.id)).toMatchObject({ status: "IN_PROGRESS", assigneeId: null });
  } finally {
    db.deleteProject(projectId);
  }
});

test("a sign-in for an account that no longer exists is treated as signed out", async ({ page, context }) => {
  // This happens to anyone who signed in with Google before the sample data was reset.
  const token = db.sessionFor("e2e-deleted-user", "Deleted User", "deleted@example.test");
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: "http://localhost:3000" }]);

  await page.goto("/home");
  await page.waitForURL("**/sign-in**");
  expect((await context.request.get("/api/me/work")).status()).toBe(401);

  // The landing page treats them as a guest too, so they aren't bounced back and forth.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Who should take this task?" })).toBeVisible();

  // Signing in again works.
  await signIn(page, /Member:/);
  await expect(page.getByRole("heading", { level: 1, name: /Juan Dela Cruz/ })).toBeVisible();
});

test("a mistyped year is refused instead of breaking the project and its members' Home", async ({ page }) => {
  await signIn(page, /Lead:/);
  const name = `E2E year ${Date.now()}`;
  try {
    await page.goto("/projects/new");
    await page.getByLabel("Project name").fill(name);
    await page.getByLabel("Start date").fill("0202-11-05");
    await page.getByLabel("Target date").fill("2027-01-31");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page.getByText("Use a year from 2000 to 2100.")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/projects/new");
    expect(db.countProjectsNamed(name)).toBe(0);
  } finally {
    db.deleteProjectsNamed(name);
  }
});

test("very long words wrap instead of stretching the page sideways", async ({ page }) => {
  test.setTimeout(420_000);
  await signIn(page, /Lead:/);
  const projectId = await newProject(page, LONG_PROJECT);
  try {
    await page.goto(`/projects/${projectId}/milestones`);
    await page.getByLabel("Milestone").fill(LONG_MILESTONE);
    await page.getByLabel("Due date").fill("2026-12-01");
    await page.getByRole("button", { name: "Add milestone" }).click();
    await expect(page.getByText(LONG_MILESTONE).first()).toBeVisible();

    await page.goto(`/projects/${projectId}/board`);
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(LONG_TASK);
    await page.getByLabel("Description").fill("D".repeat(150));
    await page.getByLabel("Category").selectOption({ label: "Logistics" });
    await page.getByLabel("Deadline").fill("2027-01-15");
    await page.getByLabel("Milestone").selectOption({ index: 1 });
    await page.getByLabel("Assignee").selectOption({ label: "Maria Santos" });
    await page.getByRole("button", { name: "Save task" }).click();
    await expect(page.getByText(LONG_TASK).first()).toBeVisible();
    const task = db.findTask(projectId, LONG_TASK);
    await moveWithDropdown(page, projectId, task.id, "In Progress", "IN_PROGRESS");
    await moveWithDropdown(page, projectId, task.id, "Review", "REVIEW");

    const routes = ["/home", "/projects", "/overview", "", "/board", "/tasks", "/timeline", "/milestones", "/settings", "/members", "/members/demo-001"].map((route) =>
      route.startsWith("/") && !["/home", "/projects", "/overview"].includes(route) ? `/projects/${projectId}${route}` : route === "" ? `/projects/${projectId}` : route,
    );
    for (const [device, width, height] of [["phone", 375, 812], ["laptop", 1280, 800]] as const) {
      await page.setViewportSize({ width, height });
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(300);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect.soft(pageWidth, `${route.replace(projectId, "ID")} on a ${device}`).toBeLessThanOrEqual(width);
      }

      // The task window shows the title, description, link and note without scrolling sideways.
      await page.goto(`/projects/${projectId}/board?task=${task.id}`);
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("link", { name: /drive\.google\.com/ })).toBeVisible();
      const [content, visible] = await dialog.evaluate((el) => [el.scrollWidth, el.clientWidth]);
      expect.soft(content, `task window on a ${device}`).toBeLessThanOrEqual(visible);

      // Inside the board and the task table, the long title stays within its card or a readable column.
      await page.goto(`/projects/${projectId}/board`);
      const card = await page.getByText(LONG_TASK).first().evaluate((el) => el.getBoundingClientRect().width);
      expect.soft(card, `board card on a ${device}`).toBeLessThanOrEqual(400);
      await page.goto(`/projects/${projectId}/tasks`);
      const cell = await page.getByRole("cell", { name: LONG_TASK }).evaluate((el) => el.getBoundingClientRect().width);
      expect.soft(cell, `task table title on a ${device}`).toBeLessThanOrEqual(700);
    }
  } finally {
    db.deleteProject(projectId);
  }
});

test("the board doesn't refresh from the server while a move is still saving", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, /Lead:/);
  const projectId = await newProject(page, `E2E saving ${Date.now()}`);
  try {
    const task = await newTask(page, projectId, "E2E move that saves slowly", "Maria Santos");
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.waitForLoadState("networkidle");

    // Hold the save for longer than the board's 10-second refresh. A refresh in that gap brings back
    // the old stage, so the card would jump back until the save finishes.
    let saving = false;
    let refreshesWhileSaving = 0;
    page.on("request", (request) => {
      if (saving && request.method() === "GET" && request.url().includes(`/api/projects/${projectId}/board`)) refreshesWhileSaving += 1;
    });
    await page.route(`**/projects/${projectId}/board**`, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      saving = true;
      await new Promise((resolve) => setTimeout(resolve, 12_500));
      saving = false;
      await route.continue();
    });
    await page.getByLabel("Status").selectOption({ label: "In Progress" });
    await expect.poll(() => db.getTask(task.id).status, { timeout: 40_000 }).toBe("IN_PROGRESS");
    expect(refreshesWhileSaving).toBe(0);
  } finally {
    db.deleteProject(projectId);
  }
});

test("two daily jobs at the same moment send each waiting email once", async () => {
  test.setTimeout(120_000);
  const result = db.overlappingDailyJobs();
  expect(result.responses).toEqual([200, 200]);
  expect(result.statuses).toEqual(Array(6).fill("SENT"));
  expect(result.attempts).toEqual(Array(6).fill(1));
});

test("one project with broken dates doesn't stop the daily emails for every other project", async () => {
  test.setTimeout(120_000);
  // The forms refuse such dates now, so the helper adds the project straight to the database.
  expect(db.dailyJobWithBrokenProject()).toBe(200);
});

test("finding a person to add doesn't send email addresses to the browser", async ({ page }) => {
  await signIn(page, /Lead:/);
  await page.goto("/projects");
  const href = await page.getByRole("link", { name: /Foundation Day 2026/ }).first().getAttribute("href");
  await page.goto(`${href}/members`);
  let answer = "";
  await page.route("**/members", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const response = await route.fetch();
    answer = await response.text();
    await route.fulfill({ response, body: answer });
  });
  await page.getByLabel("Find a person").fill("Mark");
  await expect(page.getByRole("button", { name: "Add Prof. Mark Villanueva" })).toBeVisible();
  expect(answer).toContain("Prof. Mark Villanueva");
  expect(answer).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
});
