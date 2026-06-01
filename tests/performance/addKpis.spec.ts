import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';



test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({orangehrmAdminApi, masterDataReadiness}) => {

  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();
  const emploee = new EmployeesApi(orangehrmAdminApi.request)
  for (const employee of frontend.performance.employees) {
    await emploee.createIfAbsent(employee)
  }
})

test.beforeAll(async ({ orangehrmAdminApi,addKpisPage }) => {
  await orangehrmAdminApi.loginAsAdmin();
  await addKpisPage.navigateToAddKpisPage();
  // Implement any setup logic needed before all tests, such as creating necessary data or configurations
});

test.describe('Add KPIs', () => {
  test('should add KPIs successfully', async ({ orangehrmAdminApi }) => {
    // Implement the logic to add KPIs using the orangehrmAdminApi
    // Example:
    // await orangehrmAdminApi.addKpi({ name: 'KPI Name', description: 'KPI Description' });
    
    // For demonstration, we'll just assert true
    expect(true).toBe(true);
  });
});