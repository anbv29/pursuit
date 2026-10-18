import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`billing clearly shows unavailable payments and fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const ws = { id: "workspace", name: "Billing browser test", is_demo: false, role: "owner" };
      const data = path.endsWith("/auth/me")
        ? { user: { id: "user", email: "billing@example.com", name: "Founder" }, csrf_token: "synthetic" }
        : path === "/api/workspaces" ? [ws]
          : path.endsWith("/plans") ? [
            { id: "free", name: "Explore", price_cents: 0, interval: "free", reports: 0, questions: 0, seats: 1 },
            { id: "single", name: "Single Report", price_cents: 1500, interval: "once", reports: 1, questions: 10, seats: 1 },
            { id: "founder", name: "Founder", price_cents: 2900, interval: "month", reports: 3, questions: 50, seats: 1 },
            { id: "team", name: "Team", price_cents: 7900, interval: "month", reports: 10, questions: 200, seats: 5 },
          ] : path.endsWith("/billing") ? {
            plan: "free", seats: 1, seats_used: 1, research_remaining: 0, questions_remaining: 0,
            configured: false, environment: "test_mode", status: "inactive", period_end: null,
            cancel_at_period_end: false, suspended: false, portal_available: false, orders: [],
            purchasable: { single: false, founder: false, team: false },
          } : ws;
      await route.fulfill({ json: data });
    });
    await page.goto("/w/workspace/billing?payment=success");
    await expect(page.getByRole("heading", { name: "Plans & billing" })).toBeVisible();
    await expect(page.getByText("Test payments", { exact: true })).toBeVisible();
    await expect(page.getByText(/Payments are not configured yet/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy one report" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Choose Founder" })).toBeDisabled();
    await expect(page).toHaveURL(/\/billing$/);
    await page.getByRole("button", { name: "Refresh payment status" }).click();
    await expect(page.getByRole("heading", { name: "Your workspace allowance" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
