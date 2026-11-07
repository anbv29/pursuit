import { expect, test } from "@playwright/test";

test("a cold anonymous visitor can inspect real research without the backend", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: { message: "Offline" } } }));
  await page.goto("/sample");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cal.com");
  await expect(page.getByText("No signup required", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unverified, test before acting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cal.com pricing and plan comparison", exact: true })).toHaveAttribute("href", "https://cal.com/pricing");
  await page.getByText("Retrieved excerpt", { exact: true }).click();
  await expect(page.getByRole("blockquote")).toContainText("collaborative features");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("landing page leads with receipts and a public report", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every claim");
  await page.getByRole("link", { name: "Read a real report", exact: true }).click();
  await expect(page).toHaveURL(/\/sample$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cal.com");
});
