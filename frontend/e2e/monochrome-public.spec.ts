import { expect, test, type Page } from "@playwright/test";
import type { ReportContent } from "../src/lib/types";

const content: ReportContent = {
  executive_summary: ["Ask customers what they need."], focus_first: "Check the evidence.",
  snapshot: { name: "Public report", one_liner: "Research with receipts", offering: "Research", business_model: "Free", stage_assessment: "Early", observed_pricing: [], key_facts: [] },
  segments: [], personas: [], problems: [], competitors: [],
  positioning: { gaps: [], recommended_statement: "Research for founders", differentiators: [] },
  pricing: { market_benchmarks: [], hypotheses: [], wtp_questions: [] }, messaging: [],
  prospecting: { signals: [], channels: [], search_queries: [] }, funnel_risks: [], experiments: [], risks_and_unknowns: [],
};

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  for (const control of await page.locator("main input:visible, main button:visible, header a:visible, footer a:visible").all()) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
}

for (const width of [390, 820, 1280, 1440]) {
  test(`public content edges and forms fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem("pursuit.loaderDone", "1");
      localStorage.setItem("pursuit.theme", "light");
    });
    await page.route("**/api/**", route => route.fulfill({ status: 401, json: {} }));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const hero = await page.locator(".pursuit-hero").boundingBox();
    for (const selector of ["#how-it-works", "#capabilities", "#pricing", "section[aria-labelledby='questions-h']"]) {
      const section = await page.locator(selector).boundingBox();
      expect(section!.x).toBeCloseTo(hero!.x, 0);
    }
    const footer = await page.locator("footer h2").boundingBox();
    expect(footer!.x).toBeCloseTo(hero!.x, 0);
    if (width >= 1024) {
      const logo = await page.locator("header").getByRole("link", { name: "Pursuit home" }).boundingBox();
      expect(logo!.x).toBeCloseTo(hero!.x, 0);
    } else {
      const dock = await page.locator(".cta-dock a").boundingBox();
      expect(dock!.x).toBeCloseTo(hero!.x, 0);
      expect(dock!.width).toBeCloseTo(hero!.width, 0);
    }
    await fitsViewport(page);
    await page.screenshot({ path: `test-results/public-landing-${width}.png`, fullPage: true });

    for (const path of ["/login", "/signup"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const form = page.locator("form");
      const submit = await form.locator("button[type='submit']").boundingBox();
      for (const field of await form.locator("input").all()) {
        const input = await field.boundingBox();
        expect(input!.x).toBeCloseTo(submit!.x, 0);
        expect(input!.width).toBeCloseTo(submit!.width, 0);
      }
      const footer = await page.locator("main > p").boundingBox();
      expect(footer!.x + footer!.width / 2).toBeCloseTo(width / 2, 0);
      await fitsViewport(page);
      await page.screenshot({ path: `test-results/public-${path.slice(1)}-${width}.png`, fullPage: true });
    }
    await page.goto("/sample");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cal.com");
    await fitsViewport(page);
    await page.screenshot({ path: `test-results/public-sample-${width}.png`, fullPage: true });
  });

  test(`account, onboarding and shared reports fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("pursuit.theme", "dark"));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({ json: path.endsWith("/auth/me")
        ? { user: { id: "public-user", name: "Public Founder", email: `${"founder".repeat(15)}@example.com` }, csrf_token: "fixture" }
        : path.includes("/shared-reports/")
          ? { company_name: "UnbrokenCompanyName".repeat(12), content, sources: [], expires_at: "2030-01-01T00:00:00Z" }
          : [] });
    });
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account security" })).toBeVisible();
    await fitsViewport(page);
    await page.screenshot({ path: `test-results/public-account-${width}.png`, fullPage: true });
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByText("Explore with demo data", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Create demo workspace" })).toBeVisible();
    await fitsViewport(page);
    await page.screenshot({ path: `test-results/public-onboarding-${width}.png`, fullPage: true });
    await page.goto("/shared/layout-fixture");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("shared report");
    await fitsViewport(page);
    await page.screenshot({ path: `test-results/public-shared-${width}.png`, fullPage: true });
    await page.route("**/api/shared-reports/missing", route => route.fulfill({ status: 404, json: {} }));
    await page.goto("/shared/missing");
    await expect(page.getByText("This report link is unavailable", { exact: true })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    await fitsViewport(page);
  });
}
