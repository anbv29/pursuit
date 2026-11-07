import { expect, test, type Page } from "@playwright/test";
import content from "./fixtures/deep-report.json";

async function setup(page: Page, finished = true) {
  const ws = { id: "learning-ws", name: "Learning", role: "owner", is_demo: false, has_finished_report: finished };
  const report = { id: "research", company_name: "Acme", company_url: "https://example.com", inputs: {},
    status: "SUCCEEDED", progress: "Complete", content, sources: [], created_at: "2026-11-07T00:00:00Z", finished_at: "2026-11-07T00:00:00Z" };
  const observations: { id: string; recorded_at: string; text: string; shortened: boolean }[] = [];
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");
    if (path.endsWith("/learning")) {
      if (route.request().method() === "POST") {
        const { text } = route.request().postDataJSON();
        observations.unshift({ id: String(observations.length), text, recorded_at: "2026-11-07T00:00:00Z", shortened: false });
        return route.fulfill({ status: 201, json: {} });
      }
      return route.fulfill({ json: { captured_at: "2026-11-07T00:00:00Z", observations, tasks: [], experiments: [], omitted_items: 0, caveat: "Founder testimony is unverified." } });
    }
    const body = path === "/auth/me" ? { user: { id: "user", name: "Founder" }, csrf_token: "synthetic" }
      : path === "/workspaces" ? [ws]
      : path === "/workspaces/learning-ws" ? ws
      : path.endsWith("/dashboard") ? { experiments: [], pending_actions: [], recent_outcomes: [], recommendations: [] }
      : path.endsWith("/reports/research") ? report
      : path.endsWith("/reports") ? finished ? [report] : [{ ...report, status: "FAILED" }]
      : path.endsWith("/refresh") ? { id: "research", status: "QUEUED" }
      : [];
    return route.fulfill({ json: body });
  });
}

test("learning stays visible after returning and refresh includes it", async ({ page }) => {
  await setup(page);
  await page.goto("/w/learning-ws/reports/research");
  const panel = page.locator("details").filter({ has: page.locator("#versions") });
  await panel.locator("summary").first().click();
  await page.getByLabel("What did you learn?", { exact: true }).fill("Five interviews, zero paid commitments.");
  await page.getByRole("button", { name: "Save learning", exact: true }).click();
  await expect(page.getByText("Five interviews, zero paid commitments.", { exact: true })).toBeVisible();
  await page.reload();
  await panel.locator("summary").first().click();
  await expect(page.getByText("Five interviews, zero paid commitments.", { exact: true })).toBeVisible();
  const request = page.waitForRequest(r => r.url().endsWith("/refresh") && r.method() === "POST");
  await page.getByRole("button", { name: "Save version and refresh selected sections", exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({ include_saved_learning: true });
});

for (const finished of [false, true]) {
  test(`workflow shortcuts ${finished ? "appear after completed research" : "stay out of the first workspace"}`, async ({ page }) => {
    await setup(page, finished);
    await page.goto("/w/learning-ws");
    await expect(page.getByRole("heading", { name: "Hi Founder", exact: true })).toBeVisible();
    const nav = page.getByRole("link", { name: "GTM strategy", exact: true });
    if (finished) {
      await expect(nav).toBeVisible();
      await expect(page.getByRole("link", { name: "New experiment", exact: true }).first()).toBeVisible();
    } else {
      await expect(nav).toHaveCount(0);
      await expect(page.getByRole("link", { name: "New experiment", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Analyze your company", exact: true })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("link", { name: "New report", exact: true })).toHaveAttribute("href", "/w/learning-ws/reports/new");
    }
  });
}
