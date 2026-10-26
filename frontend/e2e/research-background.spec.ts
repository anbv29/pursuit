import { expect, test } from "@playwright/test";

const ws = "11111111-1111-4111-8111-111111111111";
const rid = "22222222-2222-4222-8222-222222222222";
const base = `/w/${ws}`;
const report = {
  id: rid, company_url: "https://example.com", company_name: "Example",
  status: "RUNNING", progress: "Researching verified sources", content: null,
  sources: [], model: null, error: null, inputs: {},
  created_at: new Date().toISOString(), started_at: new Date().toISOString(), finished_at: null,
};

test("research remains visible after leaving the report and survives a slow, failed update", async ({ page }) => {
  let updates = 0;
  let interruptUpdates = false;
  let cancelled = 0;
  let failList = false;
  let listFailures = 0;
  let releaseUpdate!: () => void;
  const heldUpdate = new Promise<void>((resolve) => { releaseUpdate = resolve; });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith(`/${rid}/cancel`)) cancelled++;
    if (path.endsWith(`/reports/${rid}`)) {
      if (interruptUpdates) updates++;
      if (interruptUpdates && updates === 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        return route.fulfill({ status: 503, body: "Temporary outage" });
      }
      if (interruptUpdates && updates === 2) await heldUpdate;
      return route.fulfill({ json: report });
    }
    if (path.endsWith("/auth/me")) return route.fulfill({ json: {
      user: { id: "u1", name: "Dana", email: "dana@example.com" }, csrf_token: "test",
    } });
    if (path.endsWith(`/workspaces/${ws}/reports`)) {
      if (failList) {
        listFailures++;
        return route.fulfill({ status: 503, body: "Temporary outage" });
      }
      return route.fulfill({ json: [report] });
    }
    if (path.endsWith("/workspaces")) return route.fulfill({ json: [{ id: ws, name: "Example workspace", role: "owner", is_demo: false }] });
    if (path.endsWith("/approvals")) return route.fulfill({ json: [] });
    return route.fulfill({ json: { id: ws, name: "Example workspace", role: "owner", is_demo: false } });
  });

  await page.goto(`${base}/reports/${rid}`);
  await expect(page.getByRole("heading", { name: "Analyzing Example" })).toBeVisible();
  interruptUpdates = true;
  await expect.poll(() => updates, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("heading", { name: "Analyzing Example" })).toBeVisible();
  await expect(page.getByText("Report not found")).toHaveCount(0);
  releaseUpdate();

  await page.goto(`${base}/reports`);
  await expect(page.getByRole("link", { name: /Research in progress/ })).toBeVisible();
  failList = true;
  await expect.poll(() => listFailures, { timeout: 20000 }).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole("link", { name: /^Example https/ })).toBeVisible();
  failList = false;
  expect(cancelled).toBe(0);
  await page.getByRole("link", { name: /Research in progress/ }).click();
  await expect(page.getByRole("heading", { name: "Analyzing Example" })).toBeVisible();
  expect(cancelled).toBe(0);
});
