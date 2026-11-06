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
