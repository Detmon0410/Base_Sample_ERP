import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (docs/specs/t1-playwright-test-plan.md). They run the app on its mock API with no business records
// (a browser context starts with an empty browser, so every test starts from the same state).
const PORT = 5310;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",
  timeout: 5 * 60 * 1000, // a smoke test walks through every page
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }], ["json", { outputFile: "e2e-results/results.json" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15 * 1000, // fail fast when a button or field is not there
    locale: "en-US",
    timezoneId: "Asia/Tokyo",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
