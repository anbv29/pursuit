import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`interview capture, priorities and reminders work together at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const checkDark = async (name: string) => {
      const theme = page.getByRole("button", { name: /^Theme: .*\. Change theme$/ });
      await theme.click();
      await theme.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `test-results/screens/${name}-${width}-dark.png`, fullPage: true });
      await theme.click();
    };
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    const registered = await page.request.post("/api/auth/register", { data: {
      email: `founder-tools-${width}-${Date.now()}@example.com`, name: "Workflow Founder",
      password: "workflow-browser-test-only",
    } });
    expect(registered.status()).toBe(201);
    const headers = { "X-CSRF-Token": (await registered.json()).csrf_token };
    const created = await page.request.post("/api/workspaces", { headers, data: { name: "Founder tools test" } });
    expect(created.status()).toBe(201);
    const ws = (await created.json()).id;
    const expResponse = await page.request.post(`/api/workspaces/${ws}/experiments`, { headers, data: {
      title: "Inventory interview follow-up", use_case: "problem_discovery",
      hypothesis: "Shop owners lose time to manual inventory reconciliation.",
      criteria: [{ metric: "interviews_completed", target: 5 }],
    } });
    expect(expResponse.status()).toBe(201);
    const exp = (await expResponse.json()).id;
    const base = `/w/${ws}`;
    const apiPath = `/api/workspaces/${ws}/experiments/${exp}`;

    await page.goto(`${base}/focus`);
    await expect(page.getByRole("heading", { level: 1, name: "Your priorities" })).toBeVisible();
    if (width >= 768) {
      const navigation = page.getByRole("navigation", { name: "Primary", exact: true });
      await expect(navigation.getByRole("link", { name: "Your priorities", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(navigation.getByRole("link", { name: "Fo Assistant", exact: true })).not.toHaveAttribute("aria-current", "page");
    }
    await page.getByRole("link", { name: /Add evidence before deciding/ }).click();
    await expect(page.getByRole("tab", { name: "Interview notes", exact: true })).toHaveAttribute("aria-selected", "true");

    const transcript = "Owner: We waste hours reconciling inventory manually.\nOwner: But we have no budget for another subscription.\nOwner: Today we use Excel to track stock.\nOwner: ☕ Café orders take three minutes.";
    await page.getByLabel("Upload interview notes", { exact: true }).setInputFiles({
      name: "owner-interview.txt", mimeType: "text/plain", buffer: Buffer.from(transcript, "utf8"),
    });
    await expect(page.getByLabel("Interview notes or transcript", { exact: true })).toHaveValue(transcript);
    await expect(page.getByLabel("Interview title", { exact: true })).toHaveValue("owner-interview");
    await page.getByRole("button", { name: "Save notes & find highlights", exact: true }).click();
    await expect(page.getByRole("heading", { name: "owner-interview", exact: true })).toBeVisible();
    const highlight = page.getByRole("article", { name: "Pain point highlight, line 1", exact: true });
    await expect(highlight.locator("blockquote")).toContainText("We waste hours reconciling inventory manually.");
    await highlight.getByLabel("Your reviewed finding", { exact: true }).fill("Manual reconciliation costs this participant time.");
    await highlight.getByLabel("Relationship to your hypothesis").selectOption("supports");
    await highlight.getByRole("button", { name: "Add reviewed finding", exact: true }).click();
    await expect(highlight.getByRole("link", { name: "View added evidence", exact: true })).toBeVisible();
    const evidence = await (await page.request.get(`${apiPath}/evidence`)).json();
    expect(evidence).toHaveLength(1);
    expect(evidence[0].source.excerpt).toContain("We waste hours");
    expect(evidence[0].kind).toBe("interpretation");
    expect(await (await page.request.get(`${apiPath}/interviews`)).json()).toHaveLength(0);

    await page.getByText("Add your own highlight", { exact: true }).click();
    await page.getByLabel("Exact quotation", { exact: true }).fill("Café orders take three minutes.");
    await page.getByRole("button", { name: "Save highlight for review", exact: true }).click();
    await expect(page.getByRole("article", { name: "Other finding highlight, line 4", exact: true })).toBeVisible();
    await page.getByText("Original interview notes", { exact: true }).click();
    await expect(page.locator("pre")).toHaveText(transcript);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/founder-notes-${width}.png`, fullPage: true });
    await checkDark("founder-notes");

    await page.getByRole("tab", { name: "Research & evidence", exact: true }).click();
    await expect(page.getByText("Manual reconciliation costs this participant time.", { exact: true })).toBeVisible();
    const [provenance] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("link", { name: /owner-interview.*line 1/ }).first().click(),
    ]);
    await expect(provenance.getByRole("heading", { name: "owner-interview", exact: true })).toBeVisible();
    await provenance.close();
    // The saved capture and reviewed status also survive a fresh navigation.
    const stored = await (await page.request.get(`${apiPath}/interview-captures`)).json();
    await page.goto(`${base}/experiments/${exp}?tab=interview-notes&capture=${stored[0].id}`);
    await expect(page.getByRole("heading", { name: "owner-interview", exact: true })).toBeVisible();
    await expect(page.getByRole("article", { name: "Pain point highlight, line 1", exact: true }).getByText("Reviewed", { exact: true })).toBeVisible();

    await page.goto(`${base}/focus`);
    await page.getByLabel("Experiment for reminder", { exact: true }).selectOption(exp);
    await page.getByLabel("Reminder title", { exact: true }).fill("Review owner feedback");
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 16);
    await page.getByLabel("Due date & time", { exact: true }).fill(yesterday);
    await page.getByRole("button", { name: "Set reminder", exact: true }).click();
    const reminder = page.locator("#reminders li").filter({ has: page.getByRole("heading", { name: "Review owner feedback", exact: true }) });
    await expect(reminder.getByText("Overdue", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Review owner feedback.*Overdue/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/screens/founder-focus-${width}.png`, fullPage: true });
    await checkDark("founder-focus");
    await reminder.getByRole("button", { name: "Move Review owner feedback to tomorrow at 9am", exact: true }).click();
    await expect(reminder.getByText("Upcoming", { exact: true })).toBeVisible();
    await expect(page.getByText("1 overdue reminder.", { exact: false })).toHaveCount(0);
    await reminder.getByRole("button", { name: "Complete Review owner feedback", exact: true }).click();
    await expect(reminder).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Show completed reminders", exact: true }).check();
    await expect(reminder.getByText("Completed", { exact: true })).toBeVisible();
    await reminder.getByRole("button", { name: "Reopen Review owner feedback", exact: true }).click();
    await page.reload();
    await expect(reminder.getByText("Upcoming", { exact: true })).toBeVisible();
    if (width >= 768) {
      const second = await page.request.post("/api/workspaces", { headers, data: { name: "Another founder project" } });
      expect(second.status()).toBe(201);
      const otherWorkspace = (await second.json()).id;
      await page.reload();
      await page.getByLabel("Experiment for reminder", { exact: true }).selectOption(exp);
      await page.getByLabel("Reminder title", { exact: true }).fill("Private unfinished reminder draft");
      await page.getByLabel("Switch workspace", { exact: true }).filter({ visible: true }).selectOption(otherWorkspace);
      await expect(page).toHaveURL(new RegExp(`/w/${otherWorkspace}`));
      await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Your priorities", exact: true }).click();
      await expect(page.getByLabel("Reminder title", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Experiment for reminder", { exact: true })).toHaveValue("");
    }
    expect(errors).toEqual([]);
  });
}
