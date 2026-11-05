import { expect, test, type Page } from "@playwright/test";
import { db } from "./db";

const POLL = { timeout: 30_000 };

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

test("editing a Backlog task to assign it shows the new details and lets the assignee move it", async ({ page }) => {
  test.setTimeout(240_000);
  const taskTitle = `E2E backlog ${Date.now()}`;

  await signIn(page, /Lead:/);
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(`E2E edit ${Date.now()}`);
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("Target date").fill("2027-01-31");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/(?!new)[^/]+$/);
  const projectId = new URL(page.url()).pathname.split("/").at(-1)!;

  try {
    await page.goto(`/projects/${projectId}/members`);
    await page.getByLabel("Find a person").fill("Juan");
    await page.getByRole("button", { name: /Add Juan Dela Cruz/ }).click();
    await expect(page.getByRole("cell", { name: "Juan Dela Cruz" })).toBeVisible();

    // No assignee, so it starts in Backlog.
    await page.goto(`/projects/${projectId}/board`);
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(taskTitle);
    await page.getByLabel("Category").selectOption({ label: "Logistics" });
    await page.getByLabel("Deadline").fill("2027-01-15");
    await page.getByRole("button", { name: "Save task" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
    const task = db.findTask(projectId, taskTitle);
    expect(task.status).toBe("BACKLOG");

    // The lead edits it from the task's dialog.
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.getByRole("button", { name: "Edit task" }).click();
    await page.getByLabel("Deadline").fill("2027-01-20");
    await page.getByLabel("Assignee").selectOption({ label: "Juan Dela Cruz" });
    await page.getByRole("button", { name: "Save task" }).click();

    // The dialog shows what was just saved, without closing and reopening it.
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Juan Dela Cruz").first()).toBeVisible();
    await expect(dialog.getByText("Jan 20, 2027")).toBeVisible();

    // An assigned task belongs in To Do, the same as when it's created with an assignee.
    expect(db.getTask(task.id).status).toBe("TODO");
    expect(db.historyOf(task.id)).toEqual(["BACKLOG", "TODO"]);
    await expect.poll(() => db.countNotifications(task.id, "TASK_ASSIGNED"), POLL).toBe(1);

    // Editing again starts from the saved values, so it can't undo the first edit.
    await dialog.getByRole("button", { name: "Edit task" }).click();
    await expect(page.getByLabel("Deadline")).toHaveValue("2027-01-20");
    await expect(page.getByLabel("Assignee").locator("option:checked")).toHaveText("Juan Dela Cruz");

    // The assignee can move it.
    await page.goto(`/projects/${projectId}/board`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("**/");
    await signIn(page, /Member:/);
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.getByLabel("Status").selectOption({ label: "In Progress" });
    await expect.poll(() => db.getTask(task.id).status, POLL).toBe("IN_PROGRESS");
  } finally {
    db.deleteProject(projectId);
  }
});

test("the Members tab has no committee fields, and changing a role keeps any saved committee", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, /Lead:/);
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(`E2E members ${Date.now()}`);
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("Target date").fill("2027-01-31");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/(?!new)[^/]+$/);
  const projectId = new URL(page.url()).pathname.split("/").at(-1)!;

  try {
    await page.goto(`/projects/${projectId}/members`);
    await page.getByLabel("Find a person").fill("Juan");
    await page.getByRole("button", { name: /Add Juan Dela Cruz/ }).click();
    await expect(page.getByRole("cell", { name: "Juan Dela Cruz" })).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "Committee" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Title" })).toHaveCount(0);

    // Sample projects already have committee roles, and suggestions use them.
    db.setCommittee(projectId, "Juan Dela Cruz", "category-logistics", "Logistics Head");
    await page.reload();
    await page.getByLabel("Role of Juan Dela Cruz").selectOption({ label: "Adviser" });
    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(() => db.getMember(projectId, "Juan Dela Cruz").role, POLL).toBe("ADVISER");
    expect(db.getMember(projectId, "Juan Dela Cruz")).toMatchObject({ committeeCategoryId: "category-logistics", committeeTitle: "Logistics Head" });
  } finally {
    db.deleteProject(projectId);
  }
});

test("Edit, Delete and Remove buttons stand out", async ({ page }) => {
  test.setTimeout(120_000);
  const style = (name: string) =>
    page.getByRole("button", { name, exact: true }).first().evaluate((el) => {
      const css = getComputedStyle(el);
      return { background: css.backgroundColor };
    });
  const clear = "rgba(0, 0, 0, 0)";

  await signIn(page, /Lead:/);
  await page.goto("/projects");
  const href = await page.getByRole("link", { name: /Foundation Day 2026/ }).first().getAttribute("href");

  for (const [tab, buttons] of [["/tasks", ["Edit", "Delete"]], ["/members", ["Remove"]], ["/milestones", ["Edit", "Delete"]]] as const) {
    await page.goto(`${href}${tab}`);
    for (const name of buttons) {
      const found = await style(name);
      expect(found.background, `${name} on ${tab}`).not.toBe(clear);
    }
  }
});
