import { expect, test } from "@playwright/test";

// Runs in both the desktop and mobile projects: key screens render, carry demo
// labels, and never scroll sideways. Screenshots land in test-results/screens.
test("demo workspace screens are labelled and responsive", async ({ page }, info) => {
  const email = `screens-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill("Demo Viewer");
  await page.getByLabel("Work email").filter({ visible: true }).fill(email);
  await page.getByLabel("Password").filter({ visible: true }).fill("demo-viewer-pass");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByText("Explore with demo data").click();
  await page.getByRole("button", { name: "Create demo workspace" }).click();
  await expect(page.getByText("Demo workspace").first()).toBeVisible();
  await page.getByLabel("Reading style").selectOption("advanced");

  const shot = async (name: string) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${name} overflows horizontally`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/${info.project.name}-${name}.png`, fullPage: true });
  };

  await expect(page.getByRole("heading", { name: "Active experiments" })).toBeVisible();
  await shot("dashboard");

  await page.getByRole("link", { name: /Clinic claims reconciliation/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Clinic claims reconciliation" })).toBeVisible();
  await expect(page.getByText(/confidence ·/)).toBeVisible();
  await shot("experiment-overview");

  await page.getByRole("tab", { name: "Prospects & interviews" }).click();
  await expect(page.getByText("Interviews completed", { exact: true })).toBeVisible();
  await shot("discovery");

  await page.goto(page.url().split("/experiments/")[0]);
  await page.getByRole("link", { name: /Cost vs. speed/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Cost vs. speed/ })).toBeVisible();
  await page.getByRole("tab", { name: "Variants" }).click();
  await expect(page.getByText(/Not enough data/)).toBeVisible();
  await shot("messaging");

  await page.goto(page.url().split("/experiments/")[0]);
  await page.getByRole("link", { name: /Self-serve trial leak/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Self-serve trial leak/ })).toBeVisible();
  await page.getByRole("tab", { name: "Funnel" }).click();
  await expect(page.getByRole("figure", { name: "Funnel chart" })).toBeVisible();
  await shot("funnel");

  await page.goto(page.url().split("/experiments/")[0] + "/settings");
  await expect(page.getByText("Demo mode").first()).toBeVisible();
  await shot("settings");
});
