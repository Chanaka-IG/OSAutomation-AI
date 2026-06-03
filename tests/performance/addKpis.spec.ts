import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';



test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {

  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();
  const emploee = new EmployeesApi(orangehrmAdminApi.request)
  for (const employee of frontend.performance.employees) {
    await emploee.createIfAbsent(employee)
  }
})

test.beforeEach(async ({ orangehrmAdminApi, addKpisPage }) => {
  await addKpisPage.loginAs('admin');
  await addKpisPage.navigateToAddKpisPage();
  // Implement any setup logic needed before all tests, such as creating necessary data or configurations
});

test.describe('Add KPIs', () => {

  test('TC-001 | List loads with correct columns/records', async ({ addKpisPage }) => {
    const isVisible = await addKpisPage.validateFieldVisibility();
    expect(isVisible).toBe(true);
  });

  test.only('TC-005 | Add a KPI with all valid fields', async ({ addKpisPage }) => {
    await addKpisPage.fillKeyIndicator(frontend.performance.validKpi);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Saved');
  });
});     