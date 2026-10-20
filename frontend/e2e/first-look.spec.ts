import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`free four-section preview renders, cites and refreshes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem("pursuit.loaderDone", "1"));
    const ws = { id: "free-preview-test", name: "Preview project", role: "owner", is_demo: false };
    const claim = { text: "The website describes inventory software for shops\u2014with 5\u201310 staff.", kind: "fact", quote: "Inventory software for independent shops." };
    const assumption = { text: "Shop owners may need faster stock checks.", kind: "assumption", quote: "" };
    const content = {
      executive_summary: [claim, assumption],
      snapshot: { name: "Shop toolkit", offering: claim, business_model: assumption, investigation: [{
        finding: "An operations lead may buy while shop staff use the tool.",
        quote: "Inventory software for independent shops.",
        reasoning: "A repeated stock-check workflow may involve several people and a different budget owner.",
        counterargument: "The owner may do stock checks personally and see no reason to delegate.",
        next_test: "Ask five owners who last approved software spending and why.",
        why_now: "The buying trigger remains unknown.",
        decision_if_supported: "Test owner-approved team onboarding.",
        decision_if_rejected: "Keep the owner as the primary user.",
      }] },
      segments: [{ name: "Independent shops", rationale: assumption }],
      personas: [{ title: "Shop owner", needs: assumption }],
    };
    let completed = false;
    let submissions = 0;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/first-look") && request.method() === "POST") {
        expect(request.postDataJSON()).toMatchObject({ company_url: "https://example.com/", description: "Inventory for shops", founder_reality: { customers: "Three owners tried it; none paid." } });
        submissions++; completed = true;
      }
      const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder", email: "preview@example.com" }, csrf_token: "synthetic" }
        : path.endsWith("/first-look") ? { used: completed, available: true, can_retry: false, status: completed ? "SUCCEEDED" : null, error: null,
          preview: completed ? { title: "Shop toolkit", source_url: "https://example.com/", retrieved_at: "2026-10-20T00:00:00Z", founder_reality: { customers: "Three owners tried it; none paid." }, content, limitations: "An AI-generated preview based on one public page and your optional description." } : null }
          : path.endsWith("/approvals") ? [] : path === "/api/workspaces" ? [ws] : ws;
      await route.fulfill({ json: data });
    });
    await page.goto(`/w/${ws.id}/first-look`);
    await page.getByLabel("Your website", { exact: true }).fill("example.com");
    await page.getByLabel("What does your company do?", { exact: true }).fill("Inventory for shops");
    await page.getByText("Founder reality check", { exact: false }).click();
    await page.getByLabel("Who has actually used or paid for this?", { exact: true }).fill("Three owners tried it; none paid.");
    await page.getByRole("button", { name: "Get my free first look" }).click();
    for (const name of ["Executive summary", "Company snapshot", "Potential customer segments", "Customer personas"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Your strongest investigation angle", exact: true })).toBeVisible();
    await expect(page.getByText("Test owner-approved team onboarding.", { exact: false })).toBeVisible();
    await expect(page.getByText("Keep the owner as the primary user.", { exact: false })).toBeVisible();
    await expect(page.getByText(/The owner may do stock checks personally/)).toBeVisible();
    await page.getByText("Supporting website quote", { exact: true }).first().click();
    await expect(page.getByText("“Inventory software for independent shops.”", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Competitors", exact: true })).toHaveCount(0);
    await expect(page.getByText(/haiku|deepseek|opencode|extracted page text/i)).toHaveCount(0);
    await expect(page.getByText(/An AI-generated preview based on one public page/)).toHaveCount(0);
    expect(await page.locator("body").innerText()).not.toMatch(/[\u2013\u2014]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/free-preview-${width}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Executive summary", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get my free first look" })).toHaveCount(0);
    await page.getByText("Your founder context (1/5 answered)", { exact: true }).click();
    await expect(page.getByText("Three owners tried it; none paid.", { exact: true })).toBeVisible();
    expect(submissions).toBe(1);
    expect(errors).toEqual([]);
  });
}

test("free preview is honest and disabled until the provider is configured", async ({ page }) => {
  const ws = { id: "free-unavailable", name: "Preview", role: "owner", is_demo: false };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/auth/me") ? { user: { id: "user", name: "Founder" }, csrf_token: "synthetic" }
      : path.endsWith("/first-look") ? { used: false, available: false, preview: null, error: null }
        : path.endsWith("/approvals") ? [] : path === "/api/workspaces" ? [ws] : ws;
    await route.fulfill({ json: data });
  });
  await page.goto(`/w/${ws.id}/first-look`);
  await expect(page.getByText(/Free previews are temporarily unavailable/)).toBeVisible();
  await page.getByLabel("Your website", { exact: true }).fill("example.com");
  await expect(page.getByRole("button", { name: "Get my free first look" })).toBeDisabled();
});
