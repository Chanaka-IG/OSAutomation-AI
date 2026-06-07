import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { KpisApi } from '../../src/api/orangehrmOSAPI/KpisApi'
import { kpis as kpiAPIdata } from '../../test-data/performance/api/kpis'


test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness, orangehrmApiContext }) => {

  void masterDataReadiness;

  const kpi = new KpisApi(orangehrmApiContext);
  const usersApi = new AdminUsersApi(orangehrmApiContext);
  const emploee = new EmployeesApi(orangehrmApiContext)

  await orangehrmAdminApi.loginAsAdmin();
  for (const employee of frontend.performance.employees) {
    await emploee.createIfAbsent(employee)
  }
  const empNumber = await emploee.getEmpNumberByEmployeeId(frontend.performance.employees[0].employeeId);

  if (empNumber !== undefined) {
    await usersApi.createIfAbsent({
      username: frontend.performance.userData.username,
      password: frontend.performance.userData.password,
      status: frontend.performance.userData.status,
      userRoleId: frontend.performance.userData.userRoleId,
      empNumber: empNumber
    });
  }

  for (const kpiData of kpiAPIdata.seedRecords) {
    await kpi.createIfAbsent(kpiData)
  }
})

test.beforeEach(async ({ addKpisPage }, testInfo) => {
  if (testInfo.title.includes('TC-203')) {
    return;
  }
  await addKpisPage.loginAs('admin');
  // Implement any setup logic needed before all tests, such as creating necessary data or configurations
});

// test.afterAll(async ({ orangehrmApiContext, orangehrmAdminApi }) => {
//   // Implement any cleanup logic needed after all tests, such as deleting test data or resetting configurations
//   await orangehrmAdminApi.loginAsAdmin();
//   const kpi = new KpisApi(orangehrmApiContext);
//   await kpi.deleteAllKpis();
// });

test.describe('Add KPIs', () => {

  test('TC-001 | List loads with correct columns/records', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    const isVisible = await addKpisPage.validateFieldVisibility();
    expect(isVisible).toBe(true);
  });

  test('TC-005 | Add a KPI with all valid fields', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.validKpi);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Saved');

  });

  test('TC-010 | Delete a single KPI via row action', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.deleteKpiByName(kpiAPIdata.seedRecords[0].title);
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Deleted');

  });

  test('TC-203 | Unauthenticated → login redirect ', async ({ addKpisPage, page }) => {
    await addKpisPage.loginWithCredentials(frontend.performance.userData.username, frontend.performance.userData.password);
    await addKpisPage.navigateToAddKpisPageasESS();
    await page.waitForLoadState('networkidle');
    expect(await addKpisPage.notAccessMsg()).toBe(true);
  });

  test('TC-008 | Edit an existing KPI title', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.editKpiByName(kpiAPIdata.seedRecords[1].title);
    await addKpisPage.fillKeyIndicator(frontend.performance.updateKpi[0]);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Updated');
  });

  test('TC-002 | Filter KPIs by Job Title ', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.filterByJobTitle('QA Engineer');
    await addKpisPage.clickOnSearch();
    await addKpisPage.waitUntilTableLoaderDissapear();
    const row = await addKpisPage.getRowByName(kpiAPIdata.seedRecords[1].title);
    expect(await row.isVisible()).toBe(true);
  });

  test('TC-003 | Reset clears the Job Title filter', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.filterByJobTitle('QA Engineer');
    await addKpisPage.clickOnReset();
    expect(await addKpisPage.getDefaultText()).toContain('Select');
  });

  test('TC-004 | Add button → form', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.clickOnAdd();
    await addKpisPage.waitUntilFormLoaderDissapear();
    expect(await addKpisPage.pageHeadingForAddKpi.isVisible()).toBe(true);
  });

  test('TC-006 | Add using default scale 0–100', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.validScale);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Saved');
  });


  test.only('TC-009 | Edit a KPIs Min/Max rating', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.editKpiByName(kpiAPIdata.seedRecords[2].title);
    await addKpisPage.fillKeyIndicator(frontend.performance.updateKpi[1]);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain('Successfully Updated');
  });
});

test