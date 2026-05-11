import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { ensureEmployeeRecords } from '../../src/setup/frontendTesting/ensureEmployeeRecords';
import { frontendApi } from '../../test-data';

/**
 * **API layer** — PIM employees collection (`/api/v2/pim/employees`).
 * Data comes only from `frontend-api/pim` (seeded below); never master `api.employees.seedRecords`.
 */

test.beforeEach(async ({ masterDataReadiness }) => {
  test.skip(!env.baseURL, 'Set BASE_URL.');
  void masterDataReadiness;
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await ensureEmployeeRecords(orangehrmAdminApi, frontendApi.pim.apiContractRecords);
});

test('GET employees without session returns 401', async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: env.baseURL || undefined,
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  const res = await ctx.get(frontendApi.pim.employeesAdminPath);
  expect([401, 403]).toContain(res.status());
  await ctx.dispose();
});

test('GET employees with admin session returns JSON list payload', async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();

  const res = await orangehrmAdminApi.request.get(frontendApi.pim.employeesAdminPath, {
    headers: { Accept: 'application/json' },
  });

  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: unknown };
  expect(body.data).toBeDefined();
});

test('GET employees filtered by name matches API contract', async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();

  const qs = new URLSearchParams({ name: frontendApi.pim.apiContractEmployee.firstName });
  const res = await orangehrmAdminApi.request.get(
    `${frontendApi.pim.employeesAdminPath}?${qs.toString()}`,
    {
      headers: { Accept: 'application/json' },
    },
  );

  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data?: Array<{ firstName?: string }> };
  expect(Array.isArray(body.data)).toBeTruthy();
});

test('TC-PIM-EL-E04 — POST duplicate employeeId fails when id already exists', async ({
  orangehrmAdminApi,
}) => {
  await orangehrmAdminApi.loginAsAdmin();
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);

  await expect(
    employeesApi.create({
      employeeId: frontendApi.pim.apiContractEmployee.employeeId,
      firstName: 'Dup',
      lastName: 'Try',
      middleName: 'X',
    }),
  ).rejects.toThrow();
});
