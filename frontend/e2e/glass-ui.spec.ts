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
  [`/workspaces/${WS}/approvals`]: [{
    id: "a1", experiment_id: "e1", kind: "send_email", mode: "live", target: "ops@clinic.example", payload: {}, status: "PENDING_APPROVAL",
    prospect_id: null, variant_id: null, decided_at: null, started_at: null, finished_at: null, attempts: 0,
    result_summary: null, error: null, created_at: ago(20),
  }],
  [`/workspaces/${WS}/integrations`]: {
    environment: "development", checked_at: now,
    fo: { mode: "live", status: "connected", tools: ["ask_fo", "get_fo_reply"], verified_live: false, workspace_forced_demo: false, account_connected: true, oauth_configured: true },
    ai: { enabled: true, model: "claude-haiku-5-5", detail: null },
  },
  [`/workspaces/${WS}/members`]: [
    { user_id: "u1", name: "Dana Ruiz", email: "dana@example.com", role: "owner" },
    { user_id: "u2", name: "Sam Patel", email: "sam@example.com", role: "member" },
  ],
  "/plans": [
    { id: "single", name: "Single Report", price_cents: 499, interval: "once", reports: 1, questions: 10, seats: 1 },
    { id: "founder", name: "Founder", price_cents: 1199, interval: "month", reports: 3, questions: 50, seats: 1 },
    { id: "team", name: "Team", price_cents: 3499, interval: "month", reports: 10, questions: 200, seats: 5 },
  ],
  [`/workspaces/${WS}/billing`]: {
    plan: "founder", seats: 1, seats_used: 1, research_remaining: 2, questions_remaining: 41, configured: true, environment: "test_mode",
    status: "active", period_end: ago(-60 * 24 * 12), cancel_at_period_end: false, suspended: false, portal_available: true,
    purchasable: { single: true, founder: false, team: true }, orders: [],
  },
  [`/workspaces/${WS}/allowance`]: { research_remaining: 2, questions_remaining: 41 },
  [`/workspaces/${WS}/reports`]: [
    { id: "r1", company_url: "https://northwind.example", company_name: "Northwind Health", status: "SUCCEEDED", progress: "Done", created_at: ago(90) },
    { id: "r2", company_url: "https://claimsdesk.example", company_name: "", status: "RUNNING", progress: "Researching the market, competitors and pricing", created_at: ago(2) },
  ],
  [`/workspaces/${WS}/focus`]: {
    priorities: [{ id: "review", title: "Review actions waiting on you", reason: "One saved action needs your review.", href: `/w/${WS}/approvals`, is_demo: false, urgency: "needs_review" }],
    reminders: [], overdue_count: 0, generated_at: now,
  },
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
  const controls = await page.locator(".app-shell header button, .app-shell header a").evaluateAll(elements => elements.map(e => {
    const r = e.getBoundingClientRect();
    return { label: e.getAttribute("aria-label") ?? e.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  }).filter(r => r.width > 0 && r.height > 0));
  for (let i = 0; i < controls.length; i++) {
    expect(controls[i].left, `${name}: ${controls[i].label} offscreen`).toBeGreaterThanOrEqual(0);
    expect(controls[i].right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    for (const other of controls.slice(i + 1)) {
      const overlap = controls[i].right > other.left + 1 && other.right > controls[i].left + 1
        && controls[i].bottom > other.top + 1 && other.bottom > controls[i].top + 1;
      expect(overlap, `${name}: header controls overlap`).toBe(false);
    }
  }
  await page.screenshot({ path: `test-results/glass/app-${name}.png`, fullPage: true });
  expect(errors, `${name} page errors`).toEqual([]);
}

for (const vp of [{ name: "desktop", width: 1280, height: 860 }, { name: "tablet", width: 820, height: 900 }, { name: "phone", width: 375, height: 800 }]) {
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

test("settings and approvals render cleanly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockApi(page);
  for (const [path, heading, name] of [
    ["approvals", "Approvals", "approvals"], ["settings", "Settings", "settings"],
  ] as const) {
    await page.goto(`/w/${WS}/${path}`);
    await expect(page.getByRole("heading", { level: 1, name: heading }).first()).toBeVisible();
    await check(page, name, errors);
  }
});

test("dark theme dashboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("pursuit.theme", "dark"));
  await mockApi(page);
  await page.goto(`/w/${WS}`);
  await expect(page.getByRole("heading", { name: "Hi Dana" })).toBeVisible();
  await check(page, "dark-dashboard", errors);
});
