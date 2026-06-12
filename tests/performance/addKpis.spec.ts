import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { KpisApi } from '../../src/api/orangehrmOSAPI/KpisApi'
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { kpis as kpiAPIdata } from '../../test-data/performance/api/kpis'


test.describe.configure({ timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness, kpi, users, employees }) => {

  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();
  for (const employee of frontend.performance.employees) {
    await employees.createIfAbsent(employee)
  }
  const empNumber = await employees.getEmpNumberByEmployeeId(frontend.performance.employees[0].employeeId);

  if (empNumber !== undefined) {
    await users.createIfAbsent({
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

test.afterAll(async ({ orangehrmApiContext, orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const kpi = new KpisApi(orangehrmApiContext);
  await kpi.deleteAllKpis();
});

test.describe('Add KPIs', () => {

  test.beforeEach(async ({ addKpisPage }) => {
    await addKpisPage.loginAs('admin');
  });

  test('TC-001 | List loads with correct columns/records', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.expectFieldsVisible();
  });

  test('TC-005 | Add a KPI with all valid fields', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.validKpi);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain(frontend.performance.toastMsg.success);

  });

  test('TC-010 | Delete a single KPI via row action', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.deleteKpiByName(kpiAPIdata.seedRecords[0].title);
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain(frontend.performance.toastMsg.delete);
    const row = await addKpisPage.isRowExists(kpiAPIdata.seedRecords[0].title);
    expect(row).toBe(false);

  });

  test('TC-008 | Edit an existing KPI title', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.editKpiByName(kpiAPIdata.seedRecords[1].title);
    await addKpisPage.fillKeyIndicator(frontend.performance.updateKpi[0]);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain(frontend.performance.toastMsg.update);
  });

  test('TC-002 | Filter KPIs by Job Title ', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.filterByJobTitle(frontend.performance.jobRole.vacancy);
    await addKpisPage.clickOnSearch();
    await addKpisPage.waitUntilTableLoaderDissapear();
    await addKpisPage.isRowExists(kpiAPIdata.seedRecords[1].title);
  });

  test('TC-003 | Reset clears the Job Title filter', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.filterByJobTitle(frontend.performance.jobRole.vacancy);
    await addKpisPage.clickOnReset();
    expect(await addKpisPage.getDefaultText()).toContain('Select');
  });

  test('TC-004 | Add button → form', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.clickOnAdd();
    await addKpisPage.waitUntilFormLoaderDissapear();
    await expect(addKpisPage.pageHeadingForAddKpi).toBeVisible();
  });

  test('TC-006 | Add using default scale 0–100', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.validScale);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain(frontend.performance.toastMsg.success);
  });


  test('TC-009 | Edit a KPIs Min/Max rating', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.editKpiByName(kpiAPIdata.seedRecords[2].title);
    await addKpisPage.fillKeyIndicator(frontend.performance.updateKpi[1]);
    await addKpisPage.clickOnSave();
    const toastMessage = await addKpisPage.waitForSuccessToast();
    expect(toastMessage).toContain(frontend.performance.toastMsg.update);
  });

  test('TC-104 | Job Title dropdown lists only real job titles', async ({ addKpisPage, orangehrmApiContext, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const jobTitles = new JobTitlesApi(orangehrmApiContext)
    const systemJobTitles = await jobTitles.getAll();
    const systemJobTitleNames = systemJobTitles.map(job => job.title);
    await addKpisPage.navigateToSearchPage();
    expect(await addKpisPage.validateJobTitileDropDown(systemJobTitleNames)).toBeTruthy();
  });

  test('TC-100 | Max must be greater than Min (inline message)', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.invalidScale);
    await addKpisPage.expectInlineMsg(frontend.performance.validationMsges.rating);
  });

  test('TC-101 | Ratings constrained 0–100 (inline message)', async ({ addKpisPage }) => {
    await addKpisPage.navigateToAddKpisPage();
    await addKpisPage.fillKeyIndicator(frontend.performance.outOfScale);
    await addKpisPage.expectInlineMsg(frontend.performance.validationMsges.outScale);
  });

  test('TC-509 | Delete confirmation can be cancelled', async ({ addKpisPage }) => {
    await addKpisPage.navigateToSearchPage();
    await addKpisPage.CancelDeleteKpiByName(kpiAPIdata.seedRecords[3].title);
    const row = await addKpisPage.isRowExists(kpiAPIdata.seedRecords[3].title);
    expect(row).toBe(true);
  });
});

test.describe('KPI access control (ESS)', () => {

  test('TC-203 | ESS user is blocked from the admin KPI page', async ({ addKpisPage }) => {
    await addKpisPage.loginWithCredentials(
      frontend.performance.userData.username,
      frontend.performance.userData.password,
    );
    await addKpisPage.navigateToAddKpisPageasESS();
    await expect(addKpisPage.notAccessMsgLocator).toBeVisible();
  });
});
