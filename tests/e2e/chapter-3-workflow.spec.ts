import { expect, test, type Page } from "@playwright/test";
import { db } from "./db";

const POLL = { timeout: 30_000 };

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
  test.setTimeout(240_000);
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

  try {
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
    const task = db.findTask(projectId, taskTitle);
    expect(task.status).toBe("TODO");
    expect(task.recommendedRank).not.toBeNull();
    await expect.poll(() => db.countNotifications(task.id, "TASK_ASSIGNED"), POLL).toBe(1);

    // Member moves their own task to Review, but can't mark it Done.
    await signOut(page);
    await signIn(page, /Member:/);
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await expect(page.getByRole("option", { name: "Done" })).toHaveCount(0);
    await page.getByLabel("Status").selectOption({ label: "In Progress" });
    await expect.poll(() => db.getTask(task.id).status, POLL).toBe("IN_PROGRESS");
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.getByLabel("Status").selectOption({ label: "Review" });
    await page.getByLabel("Deliverable link").fill("drive.google.com/x");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect.poll(() => db.getTask(task.id).status, POLL).toBe("REVIEW");
    expect(db.getTask(task.id).deliverableUrl).toBe("https://drive.google.com/x");

    // Lead marks it Done, and the history shows every move.
    await signOut(page);
    await signIn(page, /Lead:/);
    await page.goto(`/projects/${projectId}/board?task=${task.id}`);
    await page.getByLabel("Status").selectOption({ label: "Done" });
    await expect.poll(() => db.getTask(task.id).status, POLL).toBe("DONE");
    expect(db.historyOf(task.id)).toEqual(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
    await expect.poll(() => db.countNotifications(task.id, "TASK_DONE"), POLL).toBe(1);
  } finally {
    // Clean up even after a failure, so repeat runs don't affect recommendation counts on the dev database.
    db.deleteProject(projectId);
  }
});

test("signed-out visitors can't open app pages or data", async ({ page, request }) => {
  await page.goto("/home");
  await page.waitForURL("**/sign-in**");
  const response = await request.get("/api/me/work");
  expect(response.status()).toBe(401);
});
