import { defineConfig, devices } from "@playwright/test";

import { BACKEND_PORT, FRONTEND_PORT, backendDir, backendEnv } from "./e2e-real/env.js";

// The end-to-end specs on the REAL backend: a backend and a frontend of their own (ports 3310 and 5330), on a new database that is dropped
// after the run. It does not touch the database or the servers of the developer. Run it with `pnpm e2e:real` (one new database for each spec file).
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results-real",
  timeout: 5 * 60 * 1000,
  expect: { timeout: 10 * 1000 },
  workers: 1,
  retries: 0,
  globalSetup: "./e2e-real/global-setup.js",
  globalTeardown: "./e2e-real/global-teardown.js",
  reporter: [["line"]],
  use: { baseURL: `http://localhost:${FRONTEND_PORT}`, actionTimeout: 15 * 1000, locale: "en-US", timezoneId: "Asia/Tokyo", screenshot: "only-on-failure" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: [
    { command: "node src/server.js", cwd: backendDir, env: backendEnv(), url: `http://localhost:${BACKEND_PORT}/api/health`, reuseExistingServer: false, timeout: 60 * 1000 },
    {
      command: `node node_modules/vite/bin/vite.js --port ${FRONTEND_PORT} --strictPort`,
      env: { ...process.env, VITE_USE_MOCK: "false", VITE_API_URL: `http://localhost:${BACKEND_PORT}/api` },
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120 * 1000,
    },
  ],
});
