import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("saved reports download actual files and public exports obey revocation", async ({ page, browser }) => {
  const signup = await page.request.post("/api/auth/register", { data: {
    email: `export-${Date.now()}@example.com`, name: "Export verification", password: "local-export-verification",
  } });
  expect(signup.status()).toBe(201);
  const headers = { "X-CSRF-Token": (await signup.json()).csrf_token };
  const created = await page.request.post("/api/workspaces", {
    headers, data: { name: "Export verification", with_demo_data: true },
  });
  expect(created.status()).toBe(201);
  const workspace = (await created.json()).id;
  const reports = await page.request.get(`/api/workspaces/${workspace}/reports`);
  const report = (await reports.json())[0];
  const path = `/api/workspaces/${workspace}/reports/${report.id}`;
  await page.goto(`/w/${workspace}/reports/${report.id}`);
  for (const format of ["Markdown", "PDF"]) {
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: `Download ${format}`, exact: true }).click();
    const download = await downloading;
    const filename = await download.path();
    if (!filename) throw new Error("The browser did not save the report download.");
    const data = await readFile(filename);
    if (format === "PDF") expect(data.subarray(0, 5).toString()).toBe("%PDF-");
    else {
      expect(data.toString("utf-8")).toContain("synthetic example");
      expect(data.toString("utf-8")).toContain("assumption");
      expect(data.toString("utf-8")).toContain("risks and unknowns");
    }
  }
  const shareResponse = await page.request.post(path + "/shares", { headers, data: { expires_days: 1 } });
  expect(shareResponse.status()).toBe(201);
  const share = await shareResponse.json();
  const token = share.url.split("/").at(-1);
  const anonymous = await browser.newContext();
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(`/shared/${token}`);
    const downloading = visitor.waitForEvent("download");
    await visitor.getByRole("button", { name: "Download Markdown", exact: true }).click();
    expect((await downloading).suggestedFilename()).toMatch(/\.md$/);
    expect((await anonymous.request.get(path + "/export/md")).status()).toBe(401);
    expect((await page.request.delete(path + `/shares/${share.id}`, { headers })).status()).toBe(204);
    expect((await anonymous.request.get(`/api/shared-reports/${token}/export/pdf`)).status()).toBe(404);
  } finally { await anonymous.close(); }
});
