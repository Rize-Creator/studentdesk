import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, quickPick: RegExp) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: quickPick }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/home");
}

test("a lead's Home shows a greeting, numbers, the review list and project details", async ({ page }) => {
  await signIn(page, /Lead:/);

  await expect(page.getByRole("heading", { level: 1, name: /Good (morning|afternoon|evening), Maria Santos/ })).toBeVisible();
  const numbers = page.getByRole("list", { name: "Your tasks at a glance" });
  for (const label of ["Overdue", "Due in 7 days", "In Review", "Finished"]) {
    await expect(numbers.getByText(label, { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("heading", { name: /Waiting for your review/ })).toBeVisible();

  const card = page.getByRole("region", { name: "My projects" }).getByRole("link", { name: /Foundation Day 2026/ });
  await expect(card).toContainText("% complete");
  await expect(card).toContainText(/On Track|At Risk|Behind/);
  await expect(card).toContainText(/Next: |Overdue: |No upcoming milestones/);
});

test("an adviser's Home has project details but no review list", async ({ page }) => {
  await signIn(page, /Adviser:/);

  await expect(page.getByRole("heading", { level: 1, name: /Prof\. Elena Ramos/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Waiting for your review/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "My projects" }).getByRole("link", { name: /Intramurals 2026/ })).toContainText(/Behind|At Risk|On Track/);
});

test("the landing page header links to each section and to sign-in", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Page sections" });
  for (const [label, heading] of [
    ["Problem", /Running a student event/],
    ["How it works", "How suggestions work"],
    ["Features", "What's inside"],
    ["Roles", /depends on your role/],
  ] as const) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeInViewport();
  }
  await page.locator("header").getByRole("link", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/sign-in");
});

test("on a phone, the header keeps only the name and Sign in", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Page sections" })).toBeHidden();
  await expect(page.locator("header").getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
});

test("the landing page shows real screenshots and the task steps, in larger text, with no FAQ", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "See it in action" })).toBeVisible();
  for (const name of [/task board/i, /dashboard/i, /timeline/i, /suggested people/i]) {
    const image = page.getByRole("img", { name });
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.getByRole("list", { name: "How a task moves" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toHaveCount(0);
  const size = await page.getByText(/Tasks and decisions end up scattered/).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
  const nav = page.getByRole("navigation", { name: "Page sections" });
  await nav.getByRole("link", { name: "See it", exact: true }).click();
  await expect(page.getByRole("heading", { name: "See it in action" })).toBeInViewport();
  await expect(nav.getByRole("link", { name: "FAQ", exact: true })).toHaveCount(0);
});

test("the landing page's screenshots fit on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("the demo accounts have sample work to show", async ({ page }) => {
  await signIn(page, /Lead:/);
  await expect(page.getByText("Prepare the opening remarks")).toBeVisible();
  const projects = page.getByRole("region", { name: "My projects" });
  await expect(projects.getByRole("link", { name: /Foundation Day 2026/ })).toBeVisible();
  await expect(projects.getByRole("link", { name: /Recognition Day 2026/ })).toContainText("On Track");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");
  await signIn(page, /Adviser:/);
  await page.goto("/overview");
  for (const name of [/Intramurals 2026/, /Foundation Day 2026/, /Recognition Day 2026/, /Capstone Group 3/]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
});
