import { expect, test } from "@playwright/test";

// Real end-to-end: real Claude research on a real public website (~2-4 min, costs API credits).
// Skip with E2E_SKIP_AI=1.
test.skip(!!process.env.E2E_SKIP_AI, "AI report generation disabled for this run");
test.setTimeout(8 * 60_000);

test("website + description -> full sourced report -> tracked experiment", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const v = (l: string) => page.getByLabel(l, { exact: true }).filter({ visible: true });

  await page.goto("/signup");
  await v("Name").fill("Report Tester");
  await v("Work email").fill(`report-${Date.now()}@example.com`);
  await v("Password").fill("report-tester-pass");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Analyze my company").click();
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: "Analyze your company" })).toBeVisible({ timeout: 60_000 });
  const workspaceId = new URL(page.url()).pathname.split("/")[2];
  const integrations = await page.request.get(`/api/workspaces/${workspaceId}/integrations`);
  expect(integrations.ok()).toBeTruthy();
  test.skip(!(await integrations.json()).ai.enabled,
    "Live report verification requires ANTHROPIC_API_KEY on the backend; research is unavailable without it.");
  const allowance = await page.request.get(`/api/workspaces/${workspaceId}/allowance`);
  expect(allowance.ok()).toBeTruthy();
  test.skip((await allowance.json()).research_remaining < 1,
    "Live report verification requires a legitimately purchased research credit; this test never buys one.");
  // This integration test verifies detailed terminology; guided mode is tested separately.
  await page.getByLabel("Reading style").selectOption("advanced");

  await v("Website").fill("linear.app");
  await v("What do you do, and for whom?").fill("Issue tracking and project management for software teams.");
  await v("What do you most want to learn?").fill("Which segment to target first and how to position against Jira");
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByText(/Analyzing/)).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible({ timeout: 7 * 60_000 });
  for (const h of ["Who to sell to", "Buyer personas", "Problem hypotheses", "Competitive landscape", "Positioning",
    "Pricing & willingness to pay", "Outreach angles", "Finding prospects", "Experiments to run, in order", "Risks & unknowns"]) {
    await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Sourced fact").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Sources \(\d+\)$/ })).toBeVisible();
  await page.screenshot({ path: "test-results/screens/report-full.png", fullPage: true });

  // Persists across reload
  await page.reload();
  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();

  // Turn the first recommended experiment into a tracked one
  await page.getByRole("button", { name: "Track this" }).first().click();
  await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[aria-current="step"]')).toContainText("Hypothesis");
  expect(errors, errors.join("\n")).toEqual([]);
});
