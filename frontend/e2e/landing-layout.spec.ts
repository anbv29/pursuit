import { expect, test } from "@playwright/test";

for (const width of [390, 820, 1440]) {
  test(`research tabs keep their layout and support keyboard use at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const process = page.getByRole("tablist", { name: "How Pursuit works" });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const selected = process.getByRole("tab", { selected: true });
      expect(await selected.locator("span").first().evaluate(node => getComputedStyle(node).color))
        .toBe(await selected.evaluate(node => getComputedStyle(node).color));
    }
    const preview = page.getByRole("region", { name: "Example of Pursuit at work" });
    const band = page.getByRole("region", { name: "What you can rely on" });
    // Document-relative Y for the band: viewport-relative boxes move with the
    // page scroll Playwright performs to click the tab on narrow viewports.
    const bandY = async () => await band.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const before = await preview.boundingBox();
    const bandBefore = await bandY();
    expect(before).not.toBeNull();
    expect(bandBefore).not.toBeNull();
    await preview.getByRole("tab", { name: "Interpretation", exact: true }).click();
    await expect(preview.getByRole("heading", { name: "The upgrade story changes with team size." })).toBeVisible();
    await preview.getByRole("tab", { name: "Interpretation", exact: true }).press("ArrowRight");
    await expect(preview.getByRole("tab", { name: "Unverified", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(preview.getByRole("heading", { name: "Handoff pain is a hypothesis." })).toBeVisible();
    const after = await preview.boundingBox();
    const bandAfter = await bandY();
    expect(Math.abs(after!.height - before!.height), "preview height changed").toBeLessThanOrEqual(1);
    expect(Math.abs(bandAfter - bandBefore), "content shifted below preview").toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/landing-reference-${width}.png`, fullPage: true });
  });
}

test("signed-in mobile navigation fits and dark report tabs remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    sessionStorage.setItem("pursuit.loaderDone", "1");
    localStorage.setItem("pursuit.theme", "dark");
  });
  await page.route("**/api/auth/me", route => route.fulfill({ json: {
    user: { id: "local-ui-user", name: "A founder with a very long name", email: "founder@example.com" }, csrf_token: "local-ui-test",
  } }));
  await page.goto("/");
  const workspace = page.getByRole("link", { name: "Open workspace", exact: true });
  await expect(workspace).toBeVisible();
  const bounds = await workspace.boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const preview = page.getByRole("region", { name: "Example of Pursuit at work" });
  await preview.getByRole("tab", { name: "Unverified", exact: true }).click();
  await expect(preview.getByRole("heading", { name: "Handoff pain is a hypothesis." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "test-results/landing-reference-dark-mobile.png", fullPage: true });
});
