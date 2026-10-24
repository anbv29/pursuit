import { expect, test, type Page } from "@playwright/test";

const uid = () => Math.random().toString(36).slice(2, 8);
const PASSWORD = "e2e-password-123";

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill(name);
  await page.getByLabel("Work email", { exact: true }).filter({ visible: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).filter({ visible: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

test("founder runs a full experiment loop and an outsider is locked out", async ({ page, browser }) => {
  const email = `founder-${uid()}@example.com`;
  await signUp(page, email, "Fiona Founder");

  // Workspace
  await page.getByLabel("Workspace name", { exact: true }).filter({ visible: true }).fill("Clinic Startup");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create workspace" }).click();
  // Onboarding now opens the company report form; manual experiments are one click away.
  await expect(page).toHaveURL(/reports\/new/);
  await page.getByLabel("Reading style").selectOption("advanced");
  // The sidebar regroup dropped the "New experiment" shortcut, and a fresh
  // workspace shows no such link on the dashboard either (no report yet).
  // Drive the experiments/new route directly; the loop itself is the subject.
  const wsBase = new URL(page.url()).pathname.split("/").slice(0, 3).join("/");
  await page.goto(`${wsBase}/experiments/new`);
  await expect(page).toHaveURL(/experiments\/new/);

  // Experiment with hypothesis + default criteria
  await page.getByRole("button", { name: /Problem validation/ }).click();
  await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill("Claims reconciliation pain");
  await page.getByLabel("Hypothesis", { exact: true }).filter({ visible: true }).fill("Clinic managers reconcile insurance claims by hand every week.");
  await page.getByLabel("Target audience", { exact: true }).filter({ visible: true }).fill("Independent clinics, 5-30 staff");
  await expect(page.getByRole("complementary", { name: "Preview" })).toContainText("Claims reconciliation pain");
  await page.getByRole("button", { name: "Create experiment" }).click();
  await expect(page.getByRole("heading", { name: "Claims reconciliation pain" })).toBeVisible();
  const expUrl = page.url().split("?")[0];

  // Evidence
  await page.getByRole("button", { name: "Advance to Research" }).click();
  await expect(page.getByText("Add at least one piece of evidence first.")).toBeVisible();
  await page.getByRole("tab", { name: "Research & evidence" }).click();
  await page.getByLabel("Claim", { exact: true }).filter({ visible: true }).fill("4 of 5 managers I spoke to reconcile claims in Excel weekly.");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByText("4 of 5 managers")).toBeVisible();
  for (const stage of ["Evidence", "Design", "Approval"]) {
    await page.getByRole("button", { name: `Advance to ${stage}` }).click();
    await expect(page.getByRole("button", { name: `Back to ${stage}` }).or(page.locator('[aria-current="step"]', { hasText: stage }))).toBeVisible();
  }

  // Action requires approval; demo run is labelled as simulated
  await page.getByRole("tab", { name: "Actions" }).click();
  await page.getByLabel("Recipient email", { exact: true }).filter({ visible: true }).fill("dana@clinic.example.com");
  await page.getByLabel("Subject", { exact: true }).filter({ visible: true }).fill("15 minutes on claims?");
  await page.getByLabel("Body", { exact: true }).filter({ visible: true }).fill("Would you share how you reconcile claims today?");
  await page.getByRole("button", { name: "Request approval" }).click();
  await expect(page.getByText("Needs approval")).toBeVisible();
  await page.getByRole("button", { name: "Review & approve" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if ((await dialog.textContent())?.includes("Approve a real action")) {
    // Backend is in live Fo mode: never send a real email from a test.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    test.skip(true, "Backend runs FO_MODE=live; this flow test only runs against demo mode.");
  }
  await expect(dialog).toContainText("Demo mode: nothing will actually be sent.");
  await dialog.getByRole("button", { name: "Approve (demo)" }).click();
  await expect(page.getByText("Succeeded", { exact: true })).toBeVisible();
  await expect(page.getByText("Simulated").first()).toBeVisible();
  await page.getByRole("button", { name: "Advance to Action" }).click();

  // Outcome + recommendation
  await page.getByRole("tab", { name: "Outcomes" }).click();
  await page.getByLabel("What happened", { exact: true }).filter({ visible: true }).selectOption("interview_completed");
  await page.getByRole("button", { name: "Record outcome" }).click();
  await expect(page.getByText("Interview completed").last()).toBeVisible();
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText(/confidence ·/)).toBeVisible({ timeout: 60_000 });

  // Persistence across a full reload
  await page.reload();
  await expect(page.getByText(/confidence ·/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claims reconciliation pain" })).toBeVisible();
  await expect(page.getByRole("tabpanel").locator("dd").first()).toHaveText("1"); // persisted evidence

  // An unrelated user cannot open the experiment
  const ctx = await browser.newContext();
  const outsider = await ctx.newPage();
  await signUp(outsider, `outsider-${uid()}@example.com`, "Oscar Outsider");
  await outsider.goto(expUrl);
  await expect(outsider.getByText("Workspace not available")).toBeVisible();
  await ctx.close();
});

test("anonymous visitors are sent to sign in", async ({ page }) => {
  await page.goto("/w/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/login/);
});

test("sign-up validates input before calling the server", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work email", { exact: true }).filter({ visible: true }).fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).filter({ visible: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Tell us your name.")).toBeVisible();
});
