import type { APIRequestContext } from '@playwright/test';
import { test as base } from '@playwright/test';
import { env } from '../config/env';
import { OrangehrmAdminApi } from '../api/orangehrmMaster/OrangehrmAdminApi';
import { LoginPage } from '../pages/auth/LoginPage';
import { LeaveModulePage } from '../pages/leave/LeaveModulePage';
import { PimModulePage } from '../pages/pim/PimModulePage';
import { RecruitmentModulePage } from '../pages/recruitment/RecruitmentModulePage';

type Fixtures = {
  loginPage: LoginPage;
  pimModulePage: PimModulePage;
  leaveModulePage: LeaveModulePage;
  recruitmentModulePage: RecruitmentModulePage;
  /** OrangeHRM host + browser-like Accept headers; use with {@link orangehrmAdminApi}. */
  orangehrmApiContext: APIRequestContext;
  orangehrmAdminApi: OrangehrmAdminApi;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  pimModulePage: async ({ page }, use) => {
    await use(new PimModulePage(page));
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
});

export { expect } from '@playwright/test';
