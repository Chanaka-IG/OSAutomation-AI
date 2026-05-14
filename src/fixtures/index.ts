import type { APIRequestContext } from '@playwright/test';
import { test as base } from '@playwright/test';
import { env } from '../config/env';
import { OrangehrmAdminApi } from '../api/orangehrmOSAPI/OrangehrmAdminApi';
import type { MasterDataStatus } from '../setup/masterDataVerification';
import {
  readMasterDataStatus,
  verifyMasterData,
  writeMasterDataStatus,
} from '../setup/masterDataVerification';
import { LoginPage } from '../pages/auth/LoginPage';
import { LeaveModulePage } from '../pages/leave/LeaveModulePage';
import { AddEmployeePage } from '../pages/pim/AddEmployeePage';
import { EmployeeListPage } from '../pages/pim/EmployeeListPage';
import { PimModulePage } from '../pages/pim/PimModulePage';
import { RecruitmentModulePage } from '../pages/recruitment/RecruitmentModulePage';

/** Custom fixtures (must not be named `Fixtures` — clashes with Playwright's `Fixtures<>` generic). */
export type OrangehrmFixtures = {
  loginPage: LoginPage;
  addEmployeePage: AddEmployeePage;
  pimModulePage: PimModulePage;
  employeeListPage: EmployeeListPage;
  leaveModulePage: LeaveModulePage;
  recruitmentModulePage: RecruitmentModulePage;
  /** OrangeHRM host + browser-like Accept headers; use with {@link orangehrmAdminApi}. */
  orangehrmApiContext: APIRequestContext;
  orangehrmAdminApi: OrangehrmAdminApi;
};

/** Worker-scoped fixtures (second generic to `base.extend`). */
export type OrangehrmWorkerFixtures = {
  /**
   * Last verification result (reads `test-results/master-data-status.json` when present).
   * Reference `{ masterDataReadiness }` in `beforeEach` so tests fail fast when seed data is missing.
   */
  masterDataReadiness: MasterDataStatus;
};

export const test = base.extend<OrangehrmFixtures, OrangehrmWorkerFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  addEmployeePage: async ({ page }, use) => {
    await use(new AddEmployeePage(page));
  },

  pimModulePage: async ({ page }, use) => {
    await use(new PimModulePage(page));
  },

  employeeListPage: async ({ page }, use) => {
    await use(new EmployeeListPage(page));
  },

  leaveModulePage: async ({ page }, use) => {
    await use(new LeaveModulePage(page));
  },

  recruitmentModulePage: async ({ page }, use) => {
    await use(new RecruitmentModulePage(page));
  },

  orangehrmApiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    await use(context);
    await context.dispose();
  },

  orangehrmAdminApi: async ({ orangehrmApiContext }, use) => {
    await use(new OrangehrmAdminApi(orangehrmApiContext));
  },

  masterDataReadiness: [
    async ({ playwright }, use) => {
      if (process.env.SKIP_MASTER_DATA_CHECK === '1') {
        await use({
          ok: true,
          missing: [],
          checkedAt: new Date().toISOString(),
          skipped: true,
        });
        return;
      }

      const cached = readMasterDataStatus();
      if (cached && (cached.ok || cached.skipped)) {
        await use(cached);
        return;
      }

      if (!env.baseURL) {
        await use({
          ok: true,
          missing: [],
          checkedAt: new Date().toISOString(),
          skipped: true,
        });
        return;
      }

      const ctx = await playwright.request.newContext({
        baseURL: env.baseURL,
        extraHTTPHeaders: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      try {
        const adminApi = new OrangehrmAdminApi(ctx);
        const status = await verifyMasterData(adminApi);
        writeMasterDataStatus(status);
        if (!status.ok) {
          throw new Error(
            `Master data incomplete: ${status.missing.join('; ')}\n` +
              `Run: npx playwright test --project=master-data tests/setup/seed-master-data.spec.ts`,
          );
        }
        await use(status);
      } finally {
        await ctx.dispose();
      }
    },
    { scope: 'worker', timeout: 120_000 },
  ],
});

export { expect } from '@playwright/test';
export type { MasterDataStatus } from '../setup/masterDataVerification';
