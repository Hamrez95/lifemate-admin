import { defineConfig, devices } from "@playwright/test";

const qaEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://ci-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci_publishable_placeholder",
  NEXT_PUBLIC_ADMIN_API_URL: "https://admin-api.ci-placeholder.test",
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/playwright",
  timeout: 30_000,
  expect: {
    timeout: 7_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3100",
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    colorScheme: "light",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: qaEnv,
  },
});
