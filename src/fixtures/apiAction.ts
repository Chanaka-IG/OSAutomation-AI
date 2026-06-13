import { test as apiAction } from './index'
import type { APIRequestContext } from '@playwright/test';
import { env } from '../config/env';
// use the built-in request fixture provided by Playwright via the test parameters
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { KpisApi } from '../../src/api/orangehrmOSAPI/KpisApi'
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi'
import { MyTrackersApi } from '../../src/api/orangehrmOSAPI/MyTrackersApi'


export type ApiAction = {
    employees: EmployeesApi,
    users: AdminUsersApi,
    kpi: KpisApi,
    jobTitle: JobTitlesApi,
    myTracker: MyTrackersApi,
    orangehrmApiContext: APIRequestContext;

};
export const test = apiAction.extend<ApiAction>({

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
    employees: async ({ orangehrmApiContext }, use) => {
        await use(new EmployeesApi(orangehrmApiContext));
    },
    users: async ({ orangehrmApiContext }, use) => {
        await use(new AdminUsersApi(orangehrmApiContext));
    },
    kpi: async ({ orangehrmApiContext }, use) => {
        await use(new KpisApi(orangehrmApiContext));
    },
    jobTitle: async ({ orangehrmApiContext }, use) => {
        await use(new JobTitlesApi(orangehrmApiContext));
    },
    myTracker: async ({ orangehrmApiContext }, use) => {
        await use(new MyTrackersApi(orangehrmApiContext));
    },
});

export { expect } from '@playwright/test';