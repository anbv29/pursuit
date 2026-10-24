import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`whole toolkit is free at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "The whole toolkit. Free.", exact: true })).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(/Choose Founder|Choose Team|Single Report|\$4\.99|\$11\.99|\$34\.99/);
    await expect(page.getByRole("link", { name: "Start researching", exact: true })).toHaveAttribute("href", "/signup");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `../.local/free-access-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

  test(`report setup has no payment gate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    const ws = { id: "free-project", name: "Free research", role: "owner", is_demo: false };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder" }, csrf_token: "synthetic" }
        : path === "/api/workspaces" ? [ws] : path.endsWith("/approvals") ? [] : ws;
      await route.fulfill({ json: data });
    });
    await page.goto("/w/free-project/reports/new");
    await expect(page.getByRole("heading", { name: "Analyze your company", exact: true })).toBeVisible();
    await expect(page.getByText("Your research workspace", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate report", exact: true })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Plans & billing", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
