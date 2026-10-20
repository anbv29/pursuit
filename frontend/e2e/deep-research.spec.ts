import { expect, test } from "@playwright/test";
import content from "./fixtures/deep-report.json";

for (const width of [390, 1280]) {
  test(`deep report explains evidence, counterarguments and decisions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const ws = { id: "deep-project", name: "Synthetic research review", role: "owner", is_demo: true };
    const report = { id: "deep-report", company_name: "Acme", company_url: "https://example.com", inputs: {},
      status: "SUCCEEDED", progress: "Complete", content,
      sources: [{ id: "S1", url: "https://example.com/pricing", title: "Public pricing page", via: "pursuit_fetch", retrieved_at: "2026-10-20T00:00:00Z" }],
      created_at: "2026-10-20T00:00:00Z", finished_at: "2026-10-20T00:00:00Z" };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder" }, csrf_token: "synthetic" }
        : path.endsWith("/reports/deep-report") ? report
          : path.endsWith("/allowance") ? { plan: "founder", research_remaining: 3, questions_remaining: 50 }
            : path === "/api/workspaces" ? [ws] : path.endsWith("/workspaces/deep-project") ? ws : [];
      await route.fulfill({ json: data });
    });
    await page.goto("/w/deep-project/reports/deep-report");
    await expect(page.getByRole("heading", { name: "What you might be missing", exact: true })).toBeVisible();
    await expect(page.getByText("Budget owner differs from user", { exact: true })).toBeVisible();
    await expect(page.getByText("Why it could be wrong", { exact: true })).toBeVisible();
    await expect(page.getByText("If supported:", { exact: true })).toBeVisible();
    await expect(page.getByText("If rejected:", { exact: true })).toBeVisible();
    await page.getByText("Inspect evidence and limitations", { exact: true }).click();
    await expect(page.getByText(/Approvals take three days/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator("body").innerText()).not.toMatch(/haiku|deepseek|minimax|opencode/i);
    await page.screenshot({ path: `test-results/deep-research-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: "What you might be missing", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
