import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`public surfaces use neutral colors in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => {
      sessionStorage.setItem("pursuit.loaderDone", "1");
      localStorage.setItem("pursuit.theme", value);
    }, theme);
    for (const path of ["/", "/login", "/signup", "/sample"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const colored = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const values = new Set<string>();
        for (const element of document.querySelectorAll("*")) {
          if (!element.getClientRects().length) continue;
          const style = getComputedStyle(element);
          for (const property of ["color", "background-color", "border-top-color", "fill", "stroke"]) {
            const value = style.getPropertyValue(property);
            if (CSS.supports("color", value)) values.add(value);
          }
        }
        return [...values].filter((value) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = value;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
          return alpha > 10 && Math.max(r, g, b) - Math.min(r, g, b) > 2;
        });
      });
      expect(colored, `${path} contains chromatic UI colors`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (path === "/login") {
        await page.screenshot({ path: `test-results/monochrome-login-${theme}.png`, fullPage: true });
      }
    }
  });
}
