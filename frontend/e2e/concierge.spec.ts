import { expect, test } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`interview concierge reviews, approves and records a demo booking at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const health = await page.request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    test.skip((await health.json()).fo_mode !== "demo", "Never run a real outreach action from this test.");
    const signup = await page.request.post("/api/auth/register", { data: {
      name: "Concierge Tester", email: `concierge-${width}-${Date.now()}@example.com`, password: "concierge-test-password",
    } });
    expect(signup.status()).toBe(201);
    const headers = { "X-CSRF-Token": (await signup.json()).csrf_token };
    const ws = await page.request.post("/api/workspaces", { headers, data: { name: "Concierge test" } });
    const workspace = (await ws.json()).id;
    const exp = await page.request.post(`/api/workspaces/${workspace}/experiments`, { headers, data: {
      use_case: "problem_discovery", title: "Interview clinic managers", hypothesis: "Clinic managers reconcile claims manually each week.",
    } });
    expect(exp.status()).toBe(201);
    const experiment = (await exp.json()).id;
    const apiPath = `/api/workspaces/${workspace}/experiments/${experiment}`;
    await page.request.post(apiPath + "/prospects", { headers, data: { name: "Dana", email: "dana-concierge@example.com", company: "Test Clinic" } });
    await page.goto(`/w/${workspace}/experiments/${experiment}?tab=discovery`);
    await page.getByRole("tab", { name: "Prospects & interviews" }).click();
    await expect(page.getByRole("heading", { name: "Interview concierge", exact: true })).toBeVisible();
    await page.getByRole("checkbox", { name: /Dana/ }).check();
    await page.getByLabel("Available times", { exact: true }).fill("Weekdays 2–5pm next week");
    const future = new Date(Date.now() + 7 * 86400000);
    const localFuture = new Date(future.getTime() - future.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await page.getByLabel("Stop coordination by", { exact: true }).fill(localFuture);
    await page.getByRole("button", { name: "Review invitations", exact: true }).click();
    await expect(page.getByRole("region", { name: "Invitation preview" })).toContainText("dana-concierge@example.com");
    await page.screenshot({ path: `test-results/screens/concierge-review-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Request 1 approval", exact: true }).click();
    await page.getByRole("link", { name: "Review interview approvals" }).click();
    await expect(page.getByText("Needs approval", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Review & approve" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("At most 0 reminder(s)");
    await expect(dialog).toContainText("Would you be open");
    await dialog.getByRole("button", { name: "Approve (demo)" }).click();
    await expect(page.getByText("Succeeded", { exact: true })).toBeVisible();
    await page.getByText("Record a simulated interview result", { exact: true }).click();
    await page.getByLabel("Confirmed meeting time", { exact: true }).fill(localFuture);
    await page.getByRole("button", { name: "Review and record result" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Record result", exact: true }).click();
    await expect(page.getByText(/Simulated result: booked/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Simulated result: booked/)).toBeVisible();
    const interviews = await page.request.get(apiPath + "/interviews");
    const stored = await interviews.json();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ status: "planned", origin: "demo" });
    const outcomes = await (await page.request.get(apiPath + "/outcomes")).json();
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ kind: "meeting_booked", origin: "demo" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/concierge-result-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
