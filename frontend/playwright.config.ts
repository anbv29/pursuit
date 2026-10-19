import { defineConfig, devices } from "@playwright/test";

// E2E runs against a running stack: FastAPI on :8000 (FO_MODE=demo) and Next on :3000.
// See README "Testing" for how to start both.
export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000, // the flow includes a real Claude synthesis call when ANTHROPIC_API_KEY is set
  workers: 1, // one shared dev server + DB; parallel runs caused load-related timeouts
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce", // Functional checks stay independent of decorative entrance timing.
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
});
