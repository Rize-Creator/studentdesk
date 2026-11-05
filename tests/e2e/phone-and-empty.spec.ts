import { expect, test, type Page } from "@playwright/test";
import { db } from "./db";

test.use({ viewport: { width: 375, height: 812 } });

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

// Only the board and timeline may scroll sideways, and only inside their own area.
async function expectNoSidewaysScroll(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, `${route} is wider than the phone`).toBeLessThanOrEqual(375);
}

test("guest pages fit on a phone", async ({ page }) => {
  await expectNoSidewaysScroll(page, "/");
  await expectNoSidewaysScroll(page, "/sign-in");
});

test("the home page is honest about what's demo and explains suggestions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Demo version: sample data only/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "How suggestions work" })).toBeVisible();
  for (const [factor, weight] of [["Experience in the category", "30%"], ["Current workload", "30%"], ["On-time record", "25%"], ["Committee role", "15%"]]) {
    await expect(page.getByRole("listitem").filter({ hasText: factor }).filter({ hasText: weight })).toBeVisible();
  }
  await expect(page.getByRole("term").filter({ hasText: /^Members$/ })).toBeVisible();
  await expect(page.getByText("Committee members")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Where the project stands" })).toHaveCount(0);
});

for (const role of ["Lead", "Member", "Adviser"]) {
  test(`every screen fits on a phone as the ${role}`, async ({ page }) => {
    test.setTimeout(240_000);
    await signIn(page, new RegExp(`${role}:`));
    for (const route of ["/home", "/overview", "/projects", "/projects/new"]) {
      await expectNoSidewaysScroll(page, route);
    }

    await page.goto("/projects");
    const href = await page.getByRole("link", { name: /Foundation Day 2026/ }).first().getAttribute("href");
    expect(href).toBeTruthy();
    for (const tab of ["", "/board", "/tasks", "/timeline", "/members", "/milestones", "/settings"]) {
      await expectNoSidewaysScroll(page, `${href}${tab}`);
    }
  });
}

test("a brand-new project shows helpful messages on a phone", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, /Lead:/);
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill(`E2E empty ${Date.now()}`);
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("Target date").fill("2027-01-31");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/(?!new)[^/]+$/);
  const projectId = new URL(page.url()).pathname.split("/").at(-1)!;

  try {
    await expect(page.getByText("No milestones yet.")).toBeVisible();
    await expect(page.getByText("Nothing is overdue.")).toBeVisible();

    await page.goto(`/projects/${projectId}/board`);
    await expect(page.getByText(/No tasks yet\. Create the first one/)).toBeVisible();

    await page.goto(`/projects/${projectId}/tasks`);
    await expect(page.getByText(/No tasks yet\. Create the first one/)).toBeVisible();

    await page.goto(`/projects/${projectId}/timeline`);
    await expect(page.getByText(/Nothing to show yet/)).toBeVisible();

    await page.goto(`/projects/${projectId}/milestones`);
    await expect(page.getByText(/No milestones yet\. Add the checkpoints/)).toBeVisible();

    // With only the lead on the team, suggestions still work, with one person.
    await page.goto(`/projects/${projectId}/board`);
    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Category").selectOption({ label: "Logistics" });
    await expect(page.getByText(/% match/)).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Assign/ })).toHaveCount(1);
  } finally {
    db.deleteProject(projectId);
  }
});
