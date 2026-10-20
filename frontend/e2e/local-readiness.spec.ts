import { expect, test } from "@playwright/test";

test("desktop product navigation has concise labels and working section links", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Product", exact: true });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "The process", exact: true })).toHaveCount(0);
  await nav.getByRole("link", { name: "Process", exact: true }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.locator("#how-it-works")).toBeInViewport();
  await nav.getByRole("link", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/#pricing$/);
  await page.goto("/");
  await page.screenshot({ path: "test-results/landing-nav.png" });
});

test("public page shows the real catalog and six workflows on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("object-src 'none'");
  await expect(page.getByRole("heading", { name: "A clearer picture. A smarter next move." })).toBeVisible();
  for (const name of ["Explore", "Single Report", "Founder", "Team"]) {
    await expect(page.locator("#pricing").getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const price of ["$4.99", "$11.99", "$34.99"]) await expect(page.getByText(price, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A company report is your starting point." })).toBeVisible();
  await expect(page.getByText("Find funnel drop-offs", { exact: true })).toBeVisible();
  await page.getByText("Does research prove that people will buy?", { exact: true }).click();
  await expect(page.getByText(/Reports link available sources/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Theme: system. Change theme" }).click();
  await page.getByRole("button", { name: "Theme: light. Change theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("account password change signs out and account deletion persists", async ({ page, request }) => {
  const email = `security-${Date.now()}@example.com`;
  const oldPassword = "local-security-before";
  const newPassword = "local-security-after";
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Security test");
  await page.getByLabel("Work email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(oldPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.goto("/account");
  await page.getByLabel("Current password", { exact: true }).fill(oldPassword);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Work email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.goto("/account");
  const accountResponse = await page.request.get("/account");
  expect(accountResponse.headers()["x-robots-tag"]).toContain("noindex");
  await page.getByLabel("Confirm current password", { exact: true }).fill(newPassword);
  await page.getByLabel("Type DELETE MY ACCOUNT", { exact: true }).fill("DELETE MY ACCOUNT");
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.reload();
  const result = await request.post("/api/auth/login", { data: { email, password: newPassword } });
  expect(result.status()).toBe(401);
});

test("public pricing renders without waiting on the plans API", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/plans", async (route) => {
    ++attempts;
    await route.abort();
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  expect(attempts).toBe(0);
});

test("blocked browser storage does not duplicate or prevent workspace creation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Object.defineProperty(Storage.prototype, method, { value() { throw new DOMException("Storage blocked", "SecurityError"); } });
    }
  });
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Storage test");
  await page.getByLabel("Work email", { exact: true }).fill(`storage-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("storage-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page).toHaveURL(/reports\/new/);
  const workspaces = await (await page.request.get("/api/workspaces")).json();
  expect(workspaces).toHaveLength(1);
  await page.goto(`/w/${workspaces[0].id}`);
  await expect(page.getByRole("heading", { name: "Hi Storage", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
