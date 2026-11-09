import { expect, test, type Page } from "@playwright/test";
import type { z } from "zod";
import type { watchAlertSchema } from "../src/lib/watch";
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

test("Inbox compares changed evidence without claiming a contradiction", async ({ page }) => {
  await setup(page);
  const alerts: z.input<typeof watchAlertSchema>[] = [{
    id: "alert-1", report_id: "research", company_name: "Acme", kind: "changed",
    claim_text: "Competitor plan is $29 per month.", source_url: "https://example.com/pricing", source_title: "Published pricing",
    previous_excerpt: "Team plan $29 monthly.", current_excerpt: "Team plan $9 with annual billing.",
    checked_at: "2026-11-09T00:00:00Z", acknowledged_at: null, section: "pricing",
    reason: "Billing terms need review before concluding the original comparison is wrong.",
  }];
  await page.route("**/api/workspaces/watch-ws/watch-alerts**", async route => {
    if (route.request().method() === "PATCH") {
      alerts[0].acknowledged_at = "2026-11-09T01:00:00Z";
      return route.fulfill({ json: alerts[0] });
    }
    return route.fulfill({ json: alerts });
  });
  await page.goto("/w/watch-ws/approvals");
  const inbox = page.getByRole("region", { name: /^Research alerts/ });
  await expect(inbox.getByText("Evidence changed, review the claim", { exact: true })).toBeVisible();
  await expect(inbox).toContainText("Billing terms need review");
  await inbox.getByText("Compare the receipts", { exact: true }).click();
  await expect(inbox).toContainText("Team plan $29 monthly.");
  await expect(inbox).toContainText("Team plan $9 with annual billing.");
  await expect(inbox.getByText("New evidence contradicts this claim", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/watches/inbox-receipts.png", fullPage: true });
  await inbox.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect(inbox).toContainText("No research alerts need review");
});
