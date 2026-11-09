import { expect, test, type Page } from "@playwright/test";

async function workspace(page: Page, finished = true) {
  const ws = { id: "navigation", name: "Navigation review", role: "owner", is_demo: false, has_finished_report: finished };
  const report = { id: "research", company_name: "Acme", company_url: "https://example.com", status: "SUCCEEDED", created_at: "2026-11-07T00:00:00Z" };
  const experiments = [
    { id: "interviews", title: "Interview clinic owners", use_case: "problem_discovery", stage: "action", is_demo: false, latest_decision: null, updated_at: "2026-11-07T00:00:00Z" },
    { id: "pricing", title: "Validate clinic pricing", use_case: "willingness_to_pay", stage: "analysis", is_demo: false, latest_decision: "CONTINUE", updated_at: "2026-11-07T00:00:00Z" },
    { id: "messaging", title: "Test clinic messaging", use_case: "messaging", stage: "action", is_demo: false, latest_decision: null, updated_at: "2026-11-06T00:00:00Z" },
    { id: "pharmacies", title: "Interview pharmacy owners", use_case: "problem_discovery", stage: "action", is_demo: false, latest_decision: null, updated_at: "2026-11-05T00:00:00Z" },
  ];
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/me") ? { user: { id: "founder", name: "Dana Founder" }, csrf_token: "test" }
      : path === "/api/workspaces" ? [ws]
      : path.endsWith("/workspaces/navigation") ? ws
      : path.endsWith("/dashboard") ? { experiments: finished ? experiments : [], pending_actions: [], recent_outcomes: [], recommendations: [] }
      : path.endsWith("/reports") ? finished ? [report] : []
      : path.endsWith("/focus") ? { priorities: [], overdue_count: 0 }
      : [];
    await route.fulfill({ json: data });
  });
}

test("Inbox badge refreshes on events and visible minutes without polling hidden tabs", async ({ page }) => {
  await workspace(page);
  let requests = 0;
  let alerts: { acknowledged_at: null }[] = [];
  await page.route("**/api/workspaces/navigation/watch-alerts", route => {
    requests += 1;
    return route.fulfill({ json: alerts });
  });
  await page.clock.install();
  await page.goto("/w/navigation");
  await expect(page.getByRole("heading", { name: "Hi Dana", exact: true })).toBeVisible();
  alerts = [{ acknowledged_at: null }];
  await page.evaluate(() => window.dispatchEvent(new Event("pursuit.watch-alerts")));
  await expect(page.getByRole("link", { name: "Inbox, 1 waiting", exact: true })).toBeVisible();

  const beforeHidden = requests;
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pursuit.watch-alerts"));
  });
  await page.clock.fastForward(60000);
  expect(requests).toBe(beforeHidden);

  alerts = [];
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("link", { name: "Inbox, 1 waiting", exact: true })).toHaveCount(0);
  expect(requests).toBeGreaterThan(beforeHidden);
  alerts = [{ acknowledged_at: null }];
  await page.clock.fastForward(60000);
  await expect(page.getByRole("link", { name: "Inbox, 1 waiting", exact: true })).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`clear destinations preserve saved work and old bookmarks at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await workspace(page);
    await page.goto("/w/navigation");
    await expect(page.getByRole("heading", { name: "Hi Dana", exact: true })).toBeVisible();
    await expect(page.getByLabel("Reading style")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Interview pharmacy owners", exact: true })).toHaveCount(0);
    await expect(page.getByRole("tablist", { name: "Filter experiments", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View all experiments", exact: true })).toHaveAttribute("href", "/w/navigation/experiments");
    if (width >= 768) {
      const nav = page.getByRole("navigation", { name: "Primary", exact: true });
      await expect(nav.locator("ul").getByRole("link")).toHaveText(["Home", "Reports", "Experiments", "Inbox", "Assistant", "Settings"]);
      await nav.getByRole("link", { name: "Experiments", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      const nav = page.getByRole("navigation", { name: "More workspace pages", exact: true });
      await expect(nav.getByRole("link", { name: "Assistant", exact: true })).toBeVisible();
      await nav.getByRole("link", { name: "Experiments", exact: true }).click();
    }
    await expect(page).toHaveURL(/\/w\/navigation\/experiments$/, { timeout: 45000 });
    await expect(page.getByRole("heading", { level: 1, name: "Experiments", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Interview pharmacy owners", exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Interview clinic owners", exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole("tab", { name: "Has a verdict", exact: true }).click();
    await expect(page.getByRole("link", { name: "Interview clinic owners", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Validate clinic pricing", exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "New experiment", exact: true }).first()).toHaveAttribute("href", "/w/navigation/experiments/new");

    await page.goto("/w/navigation/focus#reminders");
    await expect(page.getByRole("heading", { name: "Your priorities", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Experiment reminders", exact: true })).toBeVisible();
    if (width >= 768) await expect(page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");

    await page.goto("/w/navigation/reports");
    await expect(page.getByRole("heading", { level: 1, name: "Reports", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Browse GTM strategies", exact: true }).click();
    await expect(page).toHaveURL(/\/w\/navigation\/gtm$/, { timeout: 45000 });
    await expect(page.getByRole("heading", { name: "GTM strategy", exact: true })).toBeVisible();
    await expect(page.getByLabel("Reading style")).toBeVisible();
    await expect(page.getByRole("link", { name: /Acme/ })).toHaveAttribute("href", "/w/navigation/reports/research#gtm-strategy");
    if (width >= 768) await expect(page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Reports", exact: true })).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/navigation-${width}.png`, fullPage: true });
  });

  test(`report first navigation stays focused at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await workspace(page, false);
    await page.goto("/w/navigation");
    await expect(page.getByText("Start with a company report", { exact: true })).toBeVisible();
    if (width >= 768) {
      await expect(page.getByRole("navigation", { name: "Primary", exact: true }).locator("ul").getByRole("link")).toHaveText(["Home", "Reports", "Settings"]);
    } else {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      const menu = page.getByRole("navigation", { name: "More workspace pages", exact: true });
      await expect(menu.getByRole("link", { name: "Experiments", exact: true })).toHaveCount(0);
      await expect(menu.getByRole("link", { name: "Assistant", exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole("link", { name: "New experiment", exact: true })).toHaveCount(0);
  });

  test(`Inbox stays compact and counts unread research at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await workspace(page);
    await page.goto("/w/navigation/approvals");
    await expect(page.getByRole("heading", { level: 1, name: "Inbox", exact: true })).toBeVisible();
    await expect(page.getByLabel("Reading style")).toHaveCount(0);
    await expect(page.getByText("You're all caught up", { exact: true })).toHaveCount(1);
    await expect(page.getByText("No research alerts need review.", { exact: false })).toBeVisible();
    await expect(page.getByText("Nothing here", { exact: true })).toHaveCount(0);
    const empty = await page.getByText("No approvals, assistant questions or unconfirmed outcomes.", { exact: true }).locator("../..").boundingBox();
    expect(empty?.height).toBeLessThan(160);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/inbox-empty-${width}.png`, fullPage: true });

    const alert = { id: "change", report_id: "research", company_name: "Acme", kind: "changed", claim_text: "The trial is free.", source_url: "https://example.com", source_title: "Trial terms", previous_excerpt: "Free", current_excerpt: "$10", checked_at: "2026-11-07T00:00:00Z", acknowledged_at: null, section: "pricing" };
    await page.route("**/api/workspaces/navigation/watch-alerts", route => route.fulfill({ json: [alert, { ...alert, id: "reviewed", acknowledged_at: "2026-11-08T00:00:00Z" }] }));
    await page.route("**/api/workspaces/navigation/approvals", route => route.fulfill({ json: [{ id: "action", experiment_id: "interviews", kind: "send_email", mode: "demo", target: "clinic@example.com", status: "PENDING_APPROVAL", created_at: "2026-11-07T00:00:00Z" }] }));
    await page.reload();
    await expect(page.getByRole("link", { name: "Inbox, 2 waiting", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waiting for approval", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Outcome unconfirmed", exact: false })).toHaveCount(0);
    await expect(page.getByText("The trial is free.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /clinic@example.com/ })).toHaveAttribute("href", "/w/navigation/experiments/interviews?tab=actions");
    await page.route("**/api/workspaces/navigation/watch-alerts", route => route.fulfill({ json: { legacy: true } }));
    await page.reload();
    await expect(page.getByRole("link", { name: "Inbox, 1 waiting", exact: true })).toBeVisible();
  });
}
