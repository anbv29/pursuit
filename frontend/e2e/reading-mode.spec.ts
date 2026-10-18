import { expect, test } from "@playwright/test";
import type { Report } from "../src/lib/types";

// Synthetic report: no backend, credentials, company fetch, or paid AI calls.
const report: Report = {
  id: "report", company_url: "https://example.com", company_name: "Reading test company", inputs: {},
  status: "SUCCEEDED", progress: "Done", sources: [{ id: "S0", url: "https://example.com", title: "Example source", via: "fixture" }],
  model: "test-fixture", error: null, created_at: "2026-10-18T00:00:00Z", started_at: null, finished_at: null,
  content: {
    executive_summary: ["Start by talking to five potential customers."], focus_first: "Ask about their last purchase.",
    snapshot: { name: "Reading test company", one_liner: "Helps founders find customers", offering: "Research", business_model: "Subscription", stage_assessment: "Early stage", observed_pricing: [],
      key_facts: [{ text: "This claim keeps its original source.", kind: "fact", confidence: "high", source_ids: ["S0"] }] },
    segments: [], personas: [], problems: [], competitors: [],
    positioning: { gaps: [], recommended_statement: "Customer research for first-time founders", differentiators: [] },
    pricing: { market_benchmarks: [], hypotheses: [], wtp_questions: [] }, messaging: [],
    prospecting: { signals: [], channels: [], search_queries: [] }, funnel_risks: [],
    experiments: [{ use_case: "problem_discovery", title: "Talk to customers", hypothesis: "Customers need help finding buyers", metric: "interviews_completed", comparator: ">=", target: 5, min_sample: 5, why_first: "Check demand before building", effort: "low" }],
    risks_and_unknowns: ["Demand is untested."],
  },
};

for (const width of [1280, 390]) {
  test(`reading modes preserve evidence, persist and fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const ws = { id: "workspace", name: "Reading test", is_demo: true, role: "owner" };
      const data = path.endsWith("/auth/me") ? { user: { id: "user", email: "reader@example.com", name: "Reader" }, csrf_token: "fixture" }
        : path.endsWith("/reports/report") ? report
          : path === "/api/workspaces" ? [ws] : path.endsWith("/approvals") ? [] : ws;
      await route.fulfill({ json: data });
    });
    await page.goto("/w/workspace/reports/report");
    await expect(page.getByRole("heading", { name: "Your report at a glance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customers to focus on" })).toBeVisible();
    await expect(page.getByText("This claim keeps its original source.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start this test" })).toBeVisible();
    await page.getByText("Startup terms, explained", { exact: true }).click();
    await expect(page.getByText("ICP (ideal customer profile)", { exact: true })).toBeVisible();
    await page.getByLabel("Reading style").selectOption("advanced");
    await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Track this" })).toBeVisible();
    await expect(page.getByText("Sourced fact", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Reading style")).toHaveValue("advanced");
    await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
    await page.getByLabel("Reading style").selectOption("guided");
    await expect(page.getByRole("heading", { name: "Your report at a glance" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/guided-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
