import { expect, test } from "@playwright/test";

for (const width of [390, 820, 1440]) {
  test(`workspace layouts stay contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    await page.goto("/signup");
    await page.getByLabel("Name", { exact: true }).filter({ visible: true }).fill("Layout Review Founder");
    await page.getByLabel("Work email").fill(`layout-${Date.now()}-${width}@example.com`);
    await page.getByLabel("Password", { exact: true }).filter({ visible: true }).fill("layout-review-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByText("Explore with demo data").click();
    await page.getByRole("button", { name: "Create demo workspace" }).click();
    await expect(page).toHaveURL(/\/w\/[a-f0-9-]+$/);
    await expect(page.getByLabel("Reading style")).toBeVisible();
    const base = new URL(page.url()).pathname;
    for (const route of ["", "/focus", "/reports", "/reports/new", "/first-look", "/fo", "/settings", "/approvals", "/experiments/new"]) {
      await page.goto(base + route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(1);
      const controls = page.getByLabel("Reading style");
      const bounds = await controls.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/layout-${width}-${route.replaceAll("/", "-") || "dashboard"}.png`, fullPage: true });
    }
    if (width === 1440) {
      await page.goto("/");
      const nav = await page.getByRole("navigation", { name: "Product", exact: true }).boundingBox();
      const header = await page.locator(".landing-nav").boundingBox();
      expect(Math.abs(nav!.x + nav!.width / 2 - header!.x - header!.width / 2)).toBeLessThanOrEqual(1);
    }
  });
}

 test("sign-in and signup stay centred on phone, tablet and desktop", async ({ page }) => {
   await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
   for (const width of [320, 390, 820, 1440]) {
     await page.setViewportSize({ width, height: 900 });
     for (const route of ["/login", "/signup"]) {
       await page.goto(route);
       await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
       const card = await page.locator("main .glass").boundingBox();
       expect(Math.abs(card!.x + card!.width / 2 - width / 2)).toBeLessThanOrEqual(1);
       expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
       // Visibility checks alone miss CSS masks that fade a form's descendants.
       for (const theme of ["light", "dark"]) {
         await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
         const maskedContent = await page.locator("main").evaluate((main) =>
           [main, ...main.querySelectorAll("form, input, button, a, p")]
             .filter((el) => {
               for (let node: Element | null = el; node; node = node.parentElement) {
                 if (getComputedStyle(node).maskImage !== "none") return true;
               }
               return false;
             }).map((el) => el.tagName),
         );
         expect(maskedContent, `${route} has faded controls in ${theme} mode`).toEqual([]);
         await page.getByRole("button", { name: route === "/login" ? "Sign in" : "Create account", exact: true }).click();
         await expect(page.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
         await expect(page.getByRole("link", { name: route === "/login" ? "Create an account" : "Sign in", exact: true })).toBeVisible();
         if (width === 390 || width === 1440) {
           await page.screenshot({ path: `test-results/auth-${route.slice(1)}-${width}-${theme}.png`, fullPage: true });
         }
       }
     }
   }
 });
