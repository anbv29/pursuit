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
    let planCreated = false;
    let done = false;
    let asked = false;
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const ws = { id: "workspace", name: "Reading test", is_demo: true, role: "owner" };
      if (path.endsWith("/plan/day-1")) {
        done = route.request().postDataJSON().done;
        return route.fulfill({ json: {} });
      }
      if (path.endsWith("/plan")) {
        if (route.request().method() === "POST") planCreated = true;
        return route.fulfill({ json: planCreated ? [{ id: "day-1", payload: {
          day: 1, title: "Choose your customer", goal: "Pick one group", steps: ["Read the source"],
          completion: "One group selected", done, notes: "",
        } }] : [] });
      }
      if (path.endsWith("/questions")) {
        if (route.request().method() === "POST") asked = true;
        return route.fulfill({ json: asked ? [{ id: "answer", payload: {
          question: "What should I do first and why?", answer: "Talk to five potential customers first.",
          source_ids: ["S0"], limitations: ["Buying intent is unverified."],
        } }] : [] });
      }
      const data = path.endsWith("/auth/me") ? { user: { id: "user", email: "reader@example.com", name: "Reader" }, csrf_token: "fixture" }
        : path.endsWith("/reports/report") ? report
          : path === "/api/workspaces" ? [ws]
            : /\/(approvals|questions|plan|versions|prospects|shares)$/.test(path) ? [] : ws;
      await route.fulfill({ json: data });
    });
    await page.goto("/w/workspace/reports/report");
    await expect(page.getByRole("heading", { name: "Your report at a glance" })).toBeVisible();
    await page.getByRole("button", { name: "Create my first-week plan" }).click();
    const task = page.getByRole("checkbox", { name: "Day 1: Choose your customer" });
    await task.click();
    await expect(task).toBeChecked();
    await page.getByText("Ask about the report or explain a term", { exact: true }).click();
    await page.getByRole("button", { name: "What should I do first and why?" }).click();
    await page.getByRole("button", { name: "Ask report", exact: true }).click();
    await expect(page.getByText("Talk to five potential customers first.", { exact: true })).toBeVisible();
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
    await expect(page.getByRole("checkbox", { name: "Day 1: Choose your customer" })).toBeChecked();
    await expect(page.getByLabel("Reading style")).toHaveValue("advanced");
    await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
    await page.getByLabel("Reading style").selectOption("guided");
    await expect(page.getByRole("heading", { name: "Your report at a glance" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/guided-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("shared reports stay read-only and handle revoked links", async ({ page }) => {
  let revoked = false;
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname.includes("/shared-reports/")) {
      return route.fulfill(revoked ? { status: 404, json: { error: { code: "not_found", message: "Revoked" } } }
        : { json: { company_name: report.company_name, content: report.content, sources: report.sources, expires_at: "2026-10-25T00:00:00Z" } });
    }
    return route.fulfill({ status: 401, json: { error: { code: "unauthorized", message: "Sign in" } } });
  });
  await page.goto("/shared/test-link");
  await expect(page.getByRole("heading", { name: "Reading test company · shared report" })).toBeVisible();
  await expect(page.getByText("This claim keeps its original source.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Start this test|Track this|Ask report/ })).toHaveCount(0);
  revoked = true;
  await page.reload();
  await expect(page.getByText("This report link is unavailable", { exact: true })).toBeVisible();
});
