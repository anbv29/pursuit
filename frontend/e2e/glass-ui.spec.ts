import { expect, test, type Page } from "@playwright/test";

/**
 * Visual smoke test for the redesigned UI. The API is intercepted with fixtures
 * shaped like real responses, so this runs without the backend. It checks each
 * key screen renders without page errors or horizontal overflow, and saves
 * screenshots to test-results/glass for review.
 */
const WS = "11111111-1111-4111-8111-111111111111";
const now = new Date().toISOString();
const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const FIXTURES: Record<string, unknown> = {
  "/auth/me": { user: { id: "u1", email: "dana@example.com", name: "Dana Ruiz" }, csrf_token: "t" },
  "/workspaces": [{ id: WS, name: "Northwind Health", is_demo: false, created_at: now, role: "owner" }],
  [`/workspaces/${WS}`]: { id: WS, name: "Northwind Health", is_demo: false, created_at: now, role: "owner" },
  [`/workspaces/${WS}/approvals`]: [{ id: "a1" }],
  [`/workspaces/${WS}/allowance`]: { research_remaining: 2, questions_remaining: 41 },
  [`/workspaces/${WS}/reports`]: [
    { id: "r1", company_url: "https://northwind.example", company_name: "Northwind Health", status: "SUCCEEDED", progress: "Done", created_at: ago(90) },
    { id: "r2", company_url: "https://claimsdesk.example", company_name: "", status: "RUNNING", progress: "Researching the market, competitors and pricing", created_at: ago(2) },
  ],
  [`/workspaces/${WS}/reports/r2`]: {
    id: "r2", company_url: "https://claimsdesk.example", company_name: "Claimsdesk", inputs: {}, status: "RUNNING",
    progress: "Writing the report from 37 sources", content: null, sources: [], model: null, error: null,
    created_at: ago(2), started_at: ago(2), finished_at: null,
  },
  [`/workspaces/${WS}/dashboard`]: {
    experiments: [
      { id: "e1", title: "Interview recently funded clinics about claim pain", use_case: "problem_discovery", stage: "action", is_demo: false, updated_at: ago(30), latest_decision: null },
      { id: "e2", title: "Cost angle vs speed angle outreach", use_case: "messaging", stage: "analysis", is_demo: false, updated_at: ago(240), latest_decision: "ITERATE" },
      { id: "e3", title: "Will practice owners pay $49 a month", use_case: "willingness_to_pay", stage: "outcomes", is_demo: false, updated_at: ago(1440), latest_decision: "CONTINUE" },
    ],
    pending_actions: [{ id: "a1", experiment_id: "e1", experiment_title: "Interview recently funded clinics about claim pain", kind: "send_email", target: "ops@clinic.example", status: "PENDING_APPROVAL", mode: "live" }],
    recent_outcomes: [{ id: "o1", experiment_id: "e2", experiment_title: "Cost angle vs speed angle outreach", kind: "positive_reply", origin: "manual", occurred_at: ago(60) }],
    recommendations: [{ experiment_id: "e2", experiment_title: "Cost angle vs speed angle outreach", decision: "ITERATE", confidence: 0.62, next_action: "Rewrite the subject line around rework cost and send 20 more.", includes_demo_data: false }],
  },
};

async function mockApi(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    const body = FIXTURES[path];
    return body === undefined
      ? route.fulfill({ status: 404, json: { error: { code: "not_found", message: "Not in fixtures." } } })
      : route.fulfill({ json: body });
  });
}

async function check(page: Page, name: string, errors: string[]) {
  await page.waitForTimeout(900);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${name} scrolls sideways`).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `test-results/glass/app-${name}.png`, fullPage: true });
  expect(errors, `${name} page errors`).toEqual([]);
}

for (const vp of [{ name: "desktop", width: 1280, height: 860 }, { name: "phone", width: 375, height: 800 }]) {
  test(`app screens render cleanly (${vp.name})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await mockApi(page);

    await page.goto(`/w/${WS}`);
    await expect(page.getByRole("heading", { name: "Hi Dana" })).toBeVisible();
    await check(page, `${vp.name}-dashboard`, errors);

    await page.goto(`/w/${WS}/reports`);
    await expect(page.getByRole("heading", { name: "Company reports" })).toBeVisible();
    await check(page, `${vp.name}-reports`, errors);

    await page.goto(`/w/${WS}/reports/r2`);
    await expect(page.getByRole("heading", { name: /Analyzing Claimsdesk/ })).toBeVisible();
    await check(page, `${vp.name}-report-progress`, errors);

    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "This page isn't here" })).toBeVisible();
    await check(page, `${vp.name}-404`, errors);
  });
}

test("dark theme dashboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("pursuit.theme", "dark"));
  await mockApi(page);
  await page.goto(`/w/${WS}`);
  await expect(page.getByRole("heading", { name: "Hi Dana" })).toBeVisible();
  await check(page, "dark-dashboard", errors);
});
