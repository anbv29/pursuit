import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`Fo demo chat reviews, approves and persists at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const signup = await page.request.post("/api/auth/register", { data: {
      email: `fo-chat-${width}-${Date.now()}@example.com`, name: "Fo chat browser check", password: "local-fo-chat-test-only",
    } });
    expect(signup.status()).toBe(201);
    const session = await signup.json();
    const created = await page.request.post("/api/workspaces", {
      headers: { "X-CSRF-Token": session.csrf_token }, data: { name: "Fo chat browser project" },
    });
    expect(created.status()).toBe(201);
    const ws = await created.json();
    const url = `/w/${ws.id}/fo`;
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Fo Assistant", exact: true })).toBeVisible();
    await expect(page.getByText(/Demo mode, requests are simulated/)).toBeVisible();
    const input = page.getByRole("textbox", { name: "Message Fo" });
    await input.fill("Draft a customer interview invitation. Do not send it.");
    await page.getByRole("button", { name: "Review request", exact: true }).click();
    await expect(page.getByText("Review before sending", { exact: true })).toBeVisible();
    await expect(input).toBeDisabled();
    await page.getByRole("button", { name: "Review demo request" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Review before sending", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Review demo request" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Run demo preview", exact: true }).click();
    await expect(page.getByText("Simulated reply · nothing sent", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Simulated reply · nothing sent", { exact: true })).toBeVisible();
    await expect(input).toBeEnabled();
    const billing = await page.request.get(`/api/workspaces/${ws.id}/billing`);
    expect((await billing.json()).questions_remaining).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/fo-chat-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("Fo live chat offers personal Wajo connection and keeps its composer disabled", async ({ page }) => {
  const ws = { id: "fo-disconnected", name: "Disconnected project", role: "owner", is_demo: false };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder", email: "fo@example.com" }, csrf_token: "synthetic" }
      : path.endsWith("/fo-chat") ? { mode: "live", connected: false, actions_disabled: false, can_send: true, daily_limit: 30, reports: [{ id: "report-context", name: "Acme" }], turns: [] }
        : path.endsWith("/approvals") ? [] : path === "/api/workspaces" ? [ws] : ws;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${ws.id}/fo`);
  await expect(page.getByText(/Connect your Wajo account below/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message Fo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Review request", exact: true })).toBeDisabled();
});

test("customer settings never display or request operator costs and connection setup", async ({ page }) => {
  const seen: string[] = [];
  const ws = { id: "customer-settings", name: "Customer project", role: "owner", is_demo: false };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    seen.push(path);
    const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder", email: "founder@example.com" }, csrf_token: "synthetic" }
      : path.endsWith("/members") ? [{ user_id: "user", name: "Founder", email: "founder@example.com", role: "owner" }]
        : path.endsWith("/approvals") ? [] : path === "/api/workspaces" ? [ws] : ws;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${ws.id}/settings`);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members", exact: true })).toBeVisible();
  await expect(page.getByText(/AI safety settings|Estimated this month|Monthly estimated-spend|Recent AI requests|Environment:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Connect my Fo|Reconnect my Fo|Save usage settings/ })).toHaveCount(0);
  expect(seen.some(path => path.endsWith("/usage") || path.endsWith("/integrations"))).toBe(false);
});

test("Wajo connection discloses the selected report and waits for sharing consent", async ({ page }) => {
  let connects = 0;
  const ws = { id: "context-consent", name: "Report context project", role: "owner", is_demo: false };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/fo-chat/connect")) {
      connects++;
      expect(route.request().postDataJSON()).toMatchObject({ report_id: "selected-report", share_report: true });
      await route.fulfill({ json: { url: `http://localhost:3000/w/${ws.id}/fo?oauth=started` } });
      return;
    }
    const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder", email: "founder@example.com" }, csrf_token: "synthetic" }
      : path.endsWith("/fo-chat") ? { mode: "live", connected: false, actions_disabled: false, can_send: true, daily_limit: 30, reports: [{ id: "selected-report", name: "Selected company" }], turns: [] }
        : path.endsWith("/approvals") ? [] : path === "/api/workspaces" ? [ws] : ws;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${ws.id}/fo`);
  const button = page.getByRole("button", { name: "Connect Wajo & share report" });
  await button.click();
  await expect(page.getByRole("dialog")).toContainText("Selected company");
  await expect(page.getByRole("dialog")).toContainText("Raw inputs, billing information and other projects are excluded");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(connects).toBe(0);
  await button.click();
  await page.getByRole("dialog").getByRole("button", { name: "Continue to Wajo", exact: true }).click();
  await expect(page).toHaveURL(/oauth=started/);
  expect(connects).toBe(1);
});
