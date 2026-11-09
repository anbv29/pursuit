import { expect, test, type Page, type Locator } from "@playwright/test";
import content from "./fixtures/deep-report.json";
import type { ExperimentDetail } from "../src/lib/types";

const base = "/w/layout-workspace";
const now = "2026-11-09T00:00:00Z";
const title = "CustomerDiscovery".repeat(8);
const experiment: ExperimentDetail = {
  id: "layout-experiment", workspace_id: "layout-workspace", use_case: "funnel_diagnosis",
  title, hypothesis: "Trial signups leave before reaching their first useful result.",
  target_audience: "Small company founders", stage: "evidence", config: {}, is_demo: true,
  archived_at: null, created_at: now, updated_at: now, criteria: [], counts: {},
  stages: [
    { stage: "research", state: "done", ready: true, blocker: null },
    { stage: "evidence", state: "current", ready: true, blocker: null },
    { stage: "design", state: "upcoming", ready: true, blocker: null },
  ],
};

async function setup(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("pursuit.loaderDone", "1");
    localStorage.setItem("pursuit.readingMode", "advanced");
  });
  const workspace = { id: "layout-workspace", name: "Layout review", role: "owner", is_demo: true };
  const report = { id: "layout-report", company_name: "Layout company", company_url: "https://example.com",
    status: "SUCCEEDED", content, sources: [], inputs: {}, created_at: now, finished_at: now };
  await page.route("**/api/**", async route => {
    expect(route.request().method(), "Layout checks must never mutate backend data").toBe("GET");
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/me") ? { user: { id: "owner", name: "Layout Founder" }, csrf_token: "synthetic" }
      : path === "/api/workspaces" ? [workspace]
      : path === "/api/workspaces/layout-workspace" ? workspace
      : path.endsWith("/dashboard") ? { experiments: [experiment], pending_actions: [], recent_outcomes: [], recommendations: [] }
      : path.endsWith("/reports/layout-report") ? report
      : path.endsWith("/reports") ? [report]
      : path.endsWith("/experiments/layout-experiment") ? experiment
      : path.endsWith("/experiments") ? [experiment]
      : path.endsWith("/analysis") ? { criteria: [], metrics: { excluded_simulated_outcomes: {}, funnel: {
        stages: [{ name: "Visitors with a long stage label", count: 1000000 }, { name: "Paid customers", count: 2500 }],
        steps: [], overall: { numerator: 2500, denominator: 1000000, value: 0.0025, ci_low: 0.002, ci_high: 0.003 },
        bottleneck: null, explanations: [],
      } } }
      : path.endsWith("/focus") ? { priorities: [], overdue_count: 0 }
      : path.endsWith("/fo-chat") ? { mode: "demo", connected: false, actions_disabled: true, can_send: false, turns: [] }
      : path.endsWith("/watch") ? { enabled: false, checking: false, claim_ids: [], alerts: [], last_checked_at: null, next_check_at: null,
        claims: [{ id: "claim", text: "A source claim with a long receipt URL " + "https://example.com/" + "research".repeat(15), source_ids: ["S1"], section: "pricing" }] }
      : path.endsWith("/shares") ? [{ id: "share", expires_at: "2026-12-01T12:30:00Z", revoked_at: null }]
      : path.endsWith("/members") ? [{ user_id: "owner", name: title, email: "founder@example.com", role: "owner" }]
      : path.endsWith("/use-cases") ? [{ use_case: "funnel_diagnosis", name: "Funnel diagnosis", summary: "Find where trial signups leave.", actions: [], default_criteria: [], hypothesis_hint: "Why do signups leave?" }]
      : [];
    await route.fulfill({ json: data });
  });
}

async function contained(page: Page, context: string) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), context).toBeLessThanOrEqual(1);
}

async function controlsFit(controls: Locator) {
  const bounds = await controls.evaluateAll(nodes => nodes.flatMap(node => {
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(node).visibility === "hidden") return [];
    return [{ label: node.getAttribute("aria-label") ?? node.textContent ?? "control", left: rect.left, right: rect.right, viewport: innerWidth }];
  }));
  for (const control of bounds) {
    expect(control.left, control.label).toBeGreaterThanOrEqual(0);
    expect(control.right, control.label).toBeLessThanOrEqual(control.viewport + 1);
  }
}

for (const width of [320, 820, 1440]) {
  test(`workspace pages and report controls stay aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    for (const route of ["", "/reports", "/reports/new", "/experiments", "/experiments/new", "/approvals", "/settings", "/fo", "/focus", "/gtm", "/reports/layout-report"]) {
      await page.goto(base + route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await contained(page, route);
      await controlsFit(page.locator("main button, main input, main select"));
      if (width < 768 && route === "/reports/new") {
        const current = page.getByRole("navigation", { name: "Breadcrumb", exact: true }).locator("[aria-current=page]");
        await expect(current).toBeVisible();
        expect(await current.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
      }
      if ([320, 1440].includes(width) && ["/reports/new", "/reports/layout-report"].includes(route)) {
        await page.screenshot({ path: `test-results/studio-${width}-${route.replaceAll("/", "-")}.png`, fullPage: true });
      }
      if (route === "") {
        const chrome = await page.locator(".workspace-header > div").evaluate(node => {
          const style = getComputedStyle(node);
          return { radius: style.borderTopLeftRadius, border: style.borderTopWidth, shadow: style.boxShadow, padding: style.paddingLeft };
        });
        expect(chrome).toEqual({ radius: "0px", border: "0px", shadow: "none", padding: "0px" });
        const tops = await page.getByRole("list", { name: "Workspace summary" }).locator("li > :last-child")
          .evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
        expect(Math.max(...tops) - Math.min(...tops), "Summary values share a baseline").toBeLessThanOrEqual(1);
      }
    }
    await page.getByText("Share a public report link", { exact: true }).click();
    await page.locator("#report-watch summary").click();
    await expect(page.getByRole("button", { name: "Revoke link", exact: true })).toBeVisible();
    await contained(page, "expanded report controls");
    await controlsFit(page.locator("#report-watch button, #report-watch input"));
  });

  test(`experiment review actions fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto(`${base}/experiments/new?type=funnel_diagnosis`);
    await page.getByLabel("Name", { exact: true }).fill("Trial conversion");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("Hypothesis", { exact: true }).fill(experiment.hypothesis);
    for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Review", exact: true })).toBeVisible();
    await contained(page, "experiment review");
    await controlsFit(page.getByRole("button", { name: /^(Back|Create experiment)$/ }));
  });

  test(`experiment title, lifecycle and funnel stay usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto(`${base}/experiments/layout-experiment?tab=funnel`);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("figure", { name: "Funnel chart" })).toBeVisible();
    await contained(page, "experiment detail");
    await controlsFit(page.getByRole("button", { name: /Archive|Back to|Advance to|Remove stage/ }));
    const firstName = await page.getByLabel("Stage 1 name", { exact: true }).boundingBox();
    const firstCount = await page.getByLabel("Stage 1 count", { exact: true }).boundingBox();
    expect(firstName).not.toBeNull();
    expect(firstCount).not.toBeNull();
    if (firstName && firstCount) {
      expect(firstName.width).toBeGreaterThanOrEqual(72);
      expect(firstCount.width).toBeGreaterThanOrEqual(72);
      expect(Math.abs(firstName.y - firstCount.y)).toBeLessThanOrEqual(1);
    }
  });
}
