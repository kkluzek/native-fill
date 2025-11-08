import { defineConfig, devices } from "@playwright/test";

const HARNESS_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: HARNESS_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  testMatch: "**/*.spec.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    },
    {
      name: "webkit-mobile",
      testMatch: /safari-parity\.spec\.ts$/,
      use: {
        ...devices["iPhone 13"],
        baseURL: HARNESS_URL
      }
    }
  ],
  webServer: {
    command:
      "bash -lc 'bun run build:harness && bunx http-server dist/harness -p 4173 -a 127.0.0.1 --silent'",
    url: HARNESS_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
