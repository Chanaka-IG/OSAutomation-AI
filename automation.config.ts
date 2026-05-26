import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Named without `playwright` in the filename on purpose: the VS Code/Cursor Playwright
 * extension activates on `*playwright*.config.*` and may run `node` from an outdated PATH.
 * CLI uses `--config automation.config.ts` (see package.json scripts).
 *
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /** Verifies seeded master data before UI/API runs; writes `test-results/master-data-status.json`. See `scripts/playwright-global-setup.ts`. */
  globalSetup:
    process.env.SKIP_MASTER_DATA_CHECK === '1'
      ? undefined
      : './scripts/playwright-global-setup.ts',

  testDir: './tests',
  /** Run test cases one after another (stable against shared UI/session flakiness). Override locally: `--workers=4`. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /** Prefer locator visibility over long sleeps; caps assertion retries for `expect(locator)...`. */
  expect: {
    timeout: 15_000,
  },

  /* Shared settings for all projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: env.baseURL || undefined,
    /**
     * Worst-case cap for `goto` / `waitForURL` on slow hosts or CI.
     * Fast loads still finish as soon as `domcontentloaded` fires — this is not a sleep.
     * Prefer waiting on specific locators after navigation (see `EmployeeListPage.waitForListReady`).
     */
    navigationTimeout: 90_000,
    video: 'on',
    screenshot: 'on',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/api/**', '**/setup/**'],
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   testIgnore: ['**/api/**', '**/setup/**'],
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   testIgnore: ['**/api/**', '**/setup/**'],
    //   use: { ...devices['Desktop Safari'] },
    // },

    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        trace: 'off',
      },
    },

    {
      name: 'master-data',
      testMatch: '**/setup/**/*.spec.ts',
      use: {
        trace: 'off',
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
