import { expect, test } from "@playwright/test";

for (const width of [390, 820, 1440]) {
  test(`animated research preview keeps its layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    await page.clock.install();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const preview = page.getByRole("img", { name: "Example of Pursuit at work" });
    const band = page.getByRole("region", { name: "What you can rely on" });
    const before = await preview.boundingBox();
    const bandBefore = await band.boundingBox();
    expect(before).not.toBeNull();
    expect(bandBefore).not.toBeNull();
    await page.clock.runFor(7500);
    await expect(preview.getByText("Ready", { exact: true })).toBeVisible();
    const after = await preview.boundingBox();
    const bandAfter = await band.boundingBox();
    expect(Math.abs(after!.height - before!.height), "preview height changed").toBeLessThanOrEqual(1);
    expect(Math.abs(bandAfter!.y - bandBefore!.y), "content shifted below preview").toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
