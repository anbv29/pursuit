import { expect, test } from "@playwright/test";

const workspace = { id: "session-recovery", name: "Recovery workspace", role: "owner", is_demo: false };
const session = { user: { id: "recovery-user", name: "Recovery Founder", email: "recovery@example.com" }, csrf_token: "test-only" };

test("temporary gateway failures restore the session without sending the founder to login", async ({ page }) => {
  let checks = 0;
  let logins = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/login")) logins++;
    if (path.endsWith("/auth/me")) {
      checks++;
      return checks < 3 ? route.fulfill({ status: checks === 1 ? 502 : 503, body: "Starting" }) : route.fulfill({ json: session });
    }
    const data = path === "/api/workspaces" ? [workspace]
      : /\/(reports|approvals)$/.test(path) ? [] : workspace;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${workspace.id}/reports`);
  await expect(page.getByRole("status").filter({ hasText: "Connecting to Pursuit" })).toContainText("Connecting to Pursuit");
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.id}/reports$`));
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  expect(checks).toBe(3);
  expect(logins).toBe(0);
});

test("sign in waits for the server and database before sending credentials once", async ({ page }) => {
  let healthChecks = 0;
  let logins = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: { error: { code: "unauthorized", message: "Sign in required." } } });
    if (path.endsWith("/health")) {
      healthChecks++;
      if (healthChecks === 1) await new Promise((resolve) => setTimeout(resolve, 10000));
      return [1, 2, 4].includes(healthChecks) ? route.fulfill({ status: 503, body: "Starting" }) : route.fulfill({ json: { status: "ok" } });
    }
    if (path.endsWith("/auth/login")) {
      logins++;
      expect(healthChecks).toBe(5);
      return route.fulfill({ json: session });
    }
    await route.fulfill({ json: path === "/api/workspaces" ? [] : workspace });
  });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("recovery@example.com");
  await page.getByLabel("Password", { exact: true }).fill("local-recovery-password");
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(signIn).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "Connecting to Pursuit" })).toContainText("Connecting to Pursuit");
  await expect(page.getByRole("status").filter({ hasText: "Waiting for Pursuit’s server" })).toContainText("continue automatically");
  await expect(page.getByLabel("Work email")).toHaveValue("recovery@example.com");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("local-recovery-password");
  await page.screenshot({ path: "test-results/auth-connecting.png" });
  await expect(signIn).toBeEnabled();
  await signIn.click();
  await expect(page).toHaveURL(/\/onboarding$/);
  expect(logins).toBe(1);
});

test("invalid credentials stay a real authentication error and are not retried", async ({ page }) => {
  let logins = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/health")) return route.fulfill({ json: { status: "ok" } });
    if (path.endsWith("/auth/login")) logins++;
    await route.fulfill({ status: 401, json: { error: { code: "unauthorized", message: "Invalid email or password." } } });
  });
  await page.goto("/login");
  await page.getByLabel("Work email").fill("recovery@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid email or password.", { exact: true })).toBeVisible();
  expect(logins).toBe(1);
});

for (const recovery of ["retry button", "network reconnect"] as const) {
  test(`an unavailable backend keeps the protected route and recovers with ${recovery}`, async ({ page }) => {
    let available = false;
    await page.clock.install();
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/me")) return available ? route.fulfill({ json: session }) : route.fulfill({ status: 502, body: "Unavailable" });
      const data = path === "/api/workspaces" ? [workspace]
        : /\/(reports|approvals)$/.test(path) ? [] : workspace;
      await route.fulfill({ json: data });
    });
    await page.goto(`/w/${workspace.id}/reports`);
    await expect(page.getByRole("status").filter({ hasText: "Connecting to Pursuit" })).toContainText("Connecting to Pursuit");
    await page.clock.fastForward(91_000);
    await expect(page.getByRole("alert").filter({ hasText: "taking longer to connect" })).toContainText("taking longer to connect");
    await expect(page).toHaveURL(new RegExp(`/w/${workspace.id}/reports$`));
    available = true;
    if (recovery === "retry button") await page.getByRole("button", { name: "Try connecting again" }).click();
    else await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();
  });
}

test("a slow server wake-up keeps the original session request and explains the wait", async ({ page }) => {
  let checks = 0;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) {
      checks++;
      await new Promise((resolve) => setTimeout(resolve, 15000));
      return route.fulfill({ json: session });
    }
    const data = path === "/api/workspaces" ? [workspace]
      : /\/(reports|approvals)$/.test(path) ? [] : workspace;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${workspace.id}/reports`);
  await expect(page.getByRole("status").filter({ hasText: "Waiting for Pursuit’s server" })).toContainText("continue automatically");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible({ timeout: 25000 });
  expect(checks).toBe(1);
  await expect(page).toHaveURL(new RegExp(`/w/${workspace.id}/reports$`));
});
