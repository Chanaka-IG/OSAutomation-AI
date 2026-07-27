import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  /**
   * Verifies seeded master data before UI/API runs; writes `test-results/master-data-status.json`.
   * See `scripts/playwright-global-setup.ts`.
   *
   * Always registered — the script itself honours `SKIP_MASTER_DATA_CHECK=1` and returns early, and
   * it must still run to clear the per-run `seedOncePerRun` markers.
   */
  globalSetup: './scripts/playwright-global-setup.ts',

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
    navigationTimeout: 90_000,
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/api/**', '**/setup/**'],
      use: { ...devices['Desktop Chrome'] },
    },

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
  ],
});
