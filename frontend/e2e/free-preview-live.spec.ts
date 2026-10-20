import { expect, test } from "@playwright/test";

// Explicit opt-in only: this test uses the configured free provider and public website.
test("live free preview persists four sections without paid allowances", async ({ page, playwright }) => {
  test.skip(process.env.E2E_LIVE_FREE_PREVIEW !== "1", "Requires an explicitly authorized live provider check");
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  const signup = await page.request.post("/api/auth/register", { data: {
    email: `free-preview-live-${Date.now()}@example.com`, name: "Synthetic preview verification",
    password: "local-synthetic-preview-check-only",
  } });
  expect(signup.status()).toBe(201);
  const session = await signup.json();
  const created = await page.request.post("/api/workspaces", {
    headers: { "X-CSRF-Token": session.csrf_token }, data: { name: "Synthetic free preview verification" },
  });
  expect(created.status()).toBe(201);
  const ws = await created.json();
  await page.goto(`/w/${ws.id}/first-look`);
  await page.getByLabel("Your website", { exact: true }).fill("https://pancake.ai");
  await page.getByRole("button", { name: "Get my free first look" }).click();
  for (const name of ["Executive summary", "Company snapshot", "Potential customer segments", "Customer personas"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 60_000 });
  }
  const path = `/api/workspaces/${ws.id}/first-look`;
  const saved = await page.request.get(path);
  const result = await saved.json();
  expect(result.used).toBe(true);
  expect(Object.keys(result.preview.content).sort()).toEqual(["executive_summary", "personas", "segments", "snapshot"]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Executive summary", exact: true })).toBeVisible();
  const refreshed = await page.request.get(path);
  expect((await refreshed.json()).preview).toEqual(result.preview);
  const duplicate = await page.request.post(path, {
    headers: { "X-CSRF-Token": session.csrf_token }, data: { company_url: "https://pancake.ai" },
  });
  expect(duplicate.status()).toBe(409);
  const billing = await page.request.get(`/api/workspaces/${ws.id}/billing`);
  expect(await billing.json()).toMatchObject({ plan: "free", research_remaining: 0, questions_remaining: 0 });
  const anonymous = await playwright.request.newContext();
  try { expect((await anonymous.get(`http://localhost:3000${path}`)).status()).toBe(401); }
  finally { await anonymous.dispose(); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/live-free-preview.png", fullPage: true });
});
