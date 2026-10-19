import { expect, test } from "@playwright/test";

for (const width of [390, 820, 1440]) {
  test(`research tabs keep their layout and support keyboard use at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const preview = page.getByRole("region", { name: "Example of Pursuit at work" });
    const band = page.getByRole("region", { name: "What you can rely on" });
    const before = await preview.boundingBox();
    const bandBefore = await band.boundingBox();
    expect(before).not.toBeNull();
    expect(bandBefore).not.toBeNull();
    await preview.getByRole("tab", { name: "Competition", exact: true }).click();
    await expect(preview.getByRole("heading", { name: "Your competition includes the workaround." })).toBeVisible();
    await preview.getByRole("tab", { name: "Competition", exact: true }).press("ArrowRight");
    await expect(preview.getByRole("tab", { name: "Next test", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(preview.getByRole("heading", { name: "Trade interest for a concrete commitment." })).toBeVisible();
    const after = await preview.boundingBox();
    const bandAfter = await band.boundingBox();
    expect(Math.abs(after!.height - before!.height), "preview height changed").toBeLessThanOrEqual(1);
    expect(Math.abs(bandAfter!.y - bandBefore!.y), "content shifted below preview").toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
