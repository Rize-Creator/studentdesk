import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

async function foundationDay(page: Page) {
  await page.goto("/projects");
  return page.getByRole("link", { name: /Foundation Day 2026/ }).first().getAttribute("href");
}

test("a lead sees team workload, milestone progress and a project summary", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, /Lead:/);
  const href = await foundationDay(page);

  await page.goto(`${href}/members`);
  await expect(page.getByText(/\d+ leads?, \d+ members?, \d+ advisers?/)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Active tasks" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Finished" })).toBeVisible();
  await expect(page.getByLabel("Find a person")).toBeVisible();

  await page.goto(`${href}/milestones`);
  await expect(page.getByText(/\d+ of \d+ milestones complete/)).toBeVisible();
  await expect(page.getByText(/Due (today|tomorrow|in \d+ days?)|\d+ days? overdue/).first()).toBeVisible();
  const finished = page.getByRole("listitem").filter({ hasText: "Budget approved" });
  await expect(finished.getByText("Complete", { exact: true })).toBeVisible();
  await expect(finished.getByRole("button", { name: /Mark/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Add a milestone" })).toBeVisible();

  await page.goto(`${href}/settings`);
  const summary = page.getByRole("region", { name: "Project summary" });
  await expect(summary).toContainText("% complete");
  await expect(summary).toContainText("Tasks");
  await expect(summary).toContainText("Members");
  await expect(summary).toContainText("Milestones");
  await expect(summary).toContainText("Days left");
  await expect(page.getByRole("button", { name: "Archive project" })).toBeVisible();
  await expect(page.getByLabel("Project name")).toBeVisible();
});

test("a member doesn't see other people's workload numbers", async ({ page }) => {
  await signIn(page, /Member:/);
  const href = await foundationDay(page);
  await page.goto(`${href}/members`);
  await expect(page.getByText(/\d+ leads?, \d+ members?, \d+ advisers?/)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Active tasks" })).toHaveCount(0);
});

test("an adviser sees workload numbers but can't change the team", async ({ page }) => {
  await signIn(page, /Adviser:/);
  const href = await foundationDay(page);
  await page.goto(`${href}/members`);
  await expect(page.getByRole("columnheader", { name: "Active tasks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await expect(page.getByLabel("Find a person")).toHaveCount(0);
});
