import { expect, test, type Page } from "@playwright/test";
import content from "./fixtures/deep-report.json";

async function setup(page: Page, owner = true) {
  const workspace = { id: "watch-ws", name: "Source watches", role: owner ? "owner" : "member", is_demo: false, has_finished_report: true };
  const claim_ids: string[] = [];
  const watch = {
    enabled: false, checking: false, last_checked_at: null, next_check_at: null,
    claim_ids, alerts: [],
    claims: [{ id: "pricing.market_benchmarks.0", text: "Competitor plan is $29 per month.", source_ids: ["S1"], section: "pricing" }],
  };
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (path.endsWith("/watch/check")) {
      watch.checking = true;
      return route.fulfill({ status: 202, json: { queued: true } });
    }
    if (path.endsWith("/watch")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        watch.enabled = body.enabled; watch.claim_ids = body.claim_ids;
        if (!body.enabled) watch.checking = false;
      }
      return route.fulfill({ json: watch });
    }
    const data = path === "/auth/me" ? { user: { id: "owner", name: "Founder" }, csrf_token: "synthetic" }
      : path === "/workspaces" ? [workspace]
      : path === "/workspaces/watch-ws" ? workspace
      : path.endsWith("/reports/research") ? { id: "research", company_name: "Acme", company_url: "https://example.com", status: "SUCCEEDED", content, sources: [], inputs: {}, finished_at: null }
      : [];
    await route.fulfill({ json: data });
  });
}

test("report watches require opt-in and can queue checks or pause", async ({ page }) => {
  await setup(page);
  await page.goto("/w/watch-ws/reports/research");
  const watch = page.locator("#report-watch");
  await watch.locator("summary").first().click();
  await expect(watch.getByRole("button", { name: "Enable weekly watch", exact: true })).toBeDisabled();
  await expect(watch).toContainText("Free hosting can sleep and delay checks");
  await watch.getByRole("checkbox", { name: /Competitor plan is/ }).check();
  const request = page.waitForRequest(r => r.url().endsWith("/watch") && r.method() === "POST");
  await watch.getByRole("button", { name: "Enable weekly watch", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ enabled: true, claim_ids: ["pricing.market_benchmarks.0"] });
  await expect(watch.getByText("Watch enabled", { exact: true })).toBeVisible();
  await watch.getByRole("button", { name: "Check sources now", exact: true }).click();
  await expect(watch.getByRole("status")).toContainText("queued or running");
  await watch.getByRole("button", { name: "Pause watch", exact: true }).click();
  await expect(watch.getByText("Watch paused", { exact: true })).toBeVisible();
});

test("members can inspect watch status but cannot configure it", async ({ page }) => {
  await setup(page, false);
  await page.goto("/w/watch-ws/reports/research");
  const watch = page.locator("#report-watch");
  await watch.locator("summary").first().click();
  await expect(watch.getByText("Watch paused", { exact: true })).toBeVisible();
  await expect(watch.getByRole("button", { name: "Enable weekly watch", exact: true })).toHaveCount(0);
  await expect(watch.getByRole("checkbox")).toHaveCount(0);
});
