import { expect, test, type Page } from "@playwright/test";
import content from "./fixtures/deep-report.json";
import fixture from "./fixtures/gtm-strategy.json";

async function setup(page: Page, legacy = false, shared = false) {
  await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
  const ws = { id: "gtm-project", name: "GTM review", role: "owner", is_demo: true };
  const report = { id: "gtm-report", company_name: "Acme", company_url: "https://example.com", inputs: {},
    status: "SUCCEEDED", progress: "Complete", content: { ...content, gtm_strategy: legacy ? null : fixture.strategy, measurements: [fixture.measurement] },
    sources: [{ id: "S1", url: "https://example.com/trial", title: "Public trial page", via: "pursuit_fetch", source_role: "company", retrieval_status: "fetched", retrieved_at: "2026-10-20T00:00:00Z", excerpt: fixture.measurement.quote },
      { id: "S2", url: "https://example.com/unavailable", title: "Unavailable research", via: "pursuit_fetch", retrieval_status: "failed", retrieved_at: "2026-10-20T00:00:00Z", excerpt: "" }],
    created_at: "2026-10-20T00:00:00Z", finished_at: "2026-10-20T00:00:00Z", expires_at: "2026-11-20T00:00:00Z" };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder" }, csrf_token: "synthetic" }
      : path.endsWith("/refresh") ? { ...report, status: "QUEUED" }
      : path.endsWith("/reports/gtm-report") || path.includes("/shared-reports/") ? report
      : path.endsWith("/reports") ? route.request().method() === "POST" ? { ...report, status: "QUEUED" } : [report]
      : path.endsWith("/allowance") ? { plan: "founder", research_remaining: 3, questions_remaining: 50 }
      : path === "/api/workspaces" ? [ws] : path.endsWith("/workspaces/gtm-project") ? ws : [];
    await route.fulfill({ json: data });
  });
  if (shared) await page.goto("/shared/gtm-share");
}

for (const width of [390, 1280]) {
  test(`new GTM form preserves unknown and zero at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page);
    await page.goto("/w/gtm-project/reports/new");
    await page.getByLabel("Website", { exact: true }).fill("example.com");
    await page.getByLabel("Monthly budget", { exact: true }).fill("0");
    await page.getByLabel("Currency", { exact: true }).fill("inr");
    await page.getByLabel("Planning horizon").selectOption("30");
    await page.getByLabel("Research URLs", { exact: true }).fill("ftp://example.com/data");
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page.getByText("Each research URL must start with http:// or https://.")).toBeVisible();
    await page.getByLabel("Research URLs", { exact: true }).fill(Array.from({length:7}, (_, i) => `https://example.com/${i}`).join("\n"));
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page.getByText("Add no more than six research URLs.")).toBeVisible();
    await page.getByLabel("Research URLs", { exact: true }).fill("https://example.com/data");
    const request = page.waitForRequest(r => r.url().endsWith("/reports") && r.method() === "POST");
    await page.getByRole("button", { name: "Generate report" }).click();
    expect((await request).postDataJSON()).toMatchObject({gtm_constraints:{monthly_budget:0,currency:"INR",weekly_hours:null,team_size:null,horizon_days:30},research_urls:["https://example.com/data"]});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`saved strategy and exact research evidence at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page);
    await page.goto("/w/gtm-project/gtm");
    await page.getByRole("link", { name: /Acme/ }).click();
    await expect(page.getByRole("heading", { name:"Your GTM strategy", exact:true })).toBeVisible();
    await expect(page.getByText("Validate five buyer conversations", {exact:true})).toBeVisible();
    await expect(page.getByText("0 USD / month · 5 hours / week", {exact:true})).toBeVisible();
    await expect(page.locator("#research-data").getByText(fixture.measurement.quote, {exact:true}).first()).toBeVisible();
    await expect(page.getByRole("link",{name:"Public trial page"}).first()).toHaveAttribute("href","https://example.com/trial");
    await expect(page.getByText(/S2.*Retrieval status: failed/)).toBeVisible();
    await expect(page.getByText(/Public statements are not independently verified/).first()).toBeVisible();
    await page.getByText("Update resources and refresh strategy", {exact:true}).click();
    await expect(page.getByLabel("Monthly budget", {exact:true})).toHaveValue("0");
    await expect(page.getByText("Resource adjustments · review required", {exact:true})).toBeVisible();
    const refreshRequest = page.waitForRequest(r => r.url().endsWith("/reports/gtm-report/refresh") && r.method() === "POST");
    await page.getByRole("button", {name:"Refresh my GTM strategy"}).click();
    expect((await refreshRequest).postDataJSON()).toMatchObject({sections:["gtm_strategy","measurements"],gtm_constraints:fixture.constraints,correction:""});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:`test-results/gtm-${width}.png`,fullPage:true});
  });

  test(`legacy report builds strategy on same report at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:900}); await setup(page,true);
    await page.goto("/w/gtm-project/reports/gtm-report");
    await page.getByLabel("Weekly hours",{exact:true}).fill("0");
    const request = page.waitForRequest(r => r.url().endsWith("/reports/gtm-report/refresh") && r.method() === "POST");
    await page.getByRole("button",{name:"Build my GTM strategy"}).click();
    expect((await request).postDataJSON()).toEqual({sections:["gtm_strategy","measurements"],gtm_constraints:{monthly_budget:null,currency:"USD",weekly_hours:0,team_size:null,horizon_days:90,available_assets:"",channel_constraints:""},research_urls:[],correction:""});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("shared strategy is read-only and preserves original quotes", async ({page}) => {
  await setup(page,false,true);
  await expect(page.getByRole("heading",{name:"Your GTM strategy",exact:true})).toBeVisible();
  await expect(page.locator("#research-data").getByText(fixture.measurement.quote,{exact:true}).first()).toBeVisible();
  await expect(page.getByLabel("Monthly budget",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Build my GTM|Refresh my GTM/})).toHaveCount(0);
});
