import type { APIRequestContext } from '@playwright/test';
import { test as base } from '@playwright/test';
import { env } from '../config/env';
import { OrangehrmAdminApi } from '../api/orangehrmMaster/OrangehrmAdminApi';
import { PostsApi } from '../api/jsonplaceholder/PostsApi';
import { LoginPage } from '../pages/auth/LoginPage';
import { LeaveModulePage } from '../pages/leave/LeaveModulePage';
import { PimModulePage } from '../pages/pim/PimModulePage';
import { RecruitmentModulePage } from '../pages/recruitment/RecruitmentModulePage';

type Fixtures = {
  loginPage: LoginPage;
  pimModulePage: PimModulePage;
  leaveModulePage: LeaveModulePage;
  recruitmentModulePage: RecruitmentModulePage;
  /** JSONPlaceholder / generic HTTP sample APIs (`postsApi`). */
  apiContext: APIRequestContext;
  /** OrangeHRM host + browser-like Accept headers; use with {@link orangehrmAdminApi}. */
  orangehrmApiContext: APIRequestContext;
  postsApi: PostsApi;
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

  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: env.apiBaseURL,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(context);
    await context.dispose();
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

  postsApi: async ({ apiContext }, use) => {
    await use(new PostsApi(apiContext));
  },

  orangehrmAdminApi: async ({ orangehrmApiContext }, use) => {
    await use(new OrangehrmAdminApi(orangehrmApiContext));
  },
});

export { expect } from '@playwright/test';
