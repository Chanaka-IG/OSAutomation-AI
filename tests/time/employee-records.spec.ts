import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { AttendanceApi } from '../../src/api/orangehrmOSAPI/AttendanceApi';

/**
 * E2E coverage for Time → Attendance → Employee Records — P0 + P1 (13 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> Employee records.md
 *   P0: TC-001, TC-004, TC-006, TC-200, TC-203
 *   P1: TC-002, TC-005, TC-007, TC-003, TC-201, TC-202, TC-300, TC-302
 *
 * Notes:
 *  - Summary tests key off stable master-data employees (Ruwan Kumara = empNumber 1, Marcus Chen = 2).
 *  - Detail tests seed a cycle for the admin's own employee (Ruwan, empNumber 1) at current server time
 *    (past/future punches are rejected with the default config) and assert on a unique note.
 *  - Empty detail uses a far-past date (always empty; viewing any date is allowed).
 *
 * Run:
 *   npx playwright test tests/attendance/employee-records.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const attendanceData = frontend.attendance;
const ESS_TEST_USER = auth.essTestUser;

const { ruwan: RUWAN, marcus: MARCUS } = attendanceData.employees;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Summary list (admin) ────────────────────────────────────────────────────
test.describe('Employee Records — summary (admin)', () => {
  test.beforeEach(async ({ loginPage, employeeAttendanceRecordsPage }) => {
    await loginPage.loginAs('admin');
    await employeeAttendanceRecordsPage.gotoSummary();
  });

  test('TC-ATT-ER-001 — Summary lists employees with their total duration', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await expect(employeeAttendanceRecordsPage.heading).toBeVisible();
    await expect(employeeAttendanceRecordsPage.rowByText(RUWAN.name)).toBeVisible();
    await expect(employeeAttendanceRecordsPage.rowByText(MARCUS.summaryName)).toBeVisible();
    expect(await employeeAttendanceRecordsPage.recordsFoundCount()).toBeGreaterThanOrEqual(1);
  });

  test('TC-ATT-ER-003 — A summary row shows the employee, a total, and a View button', async ({
    employeeAttendanceRecordsPage,
  }) => {
    const row = employeeAttendanceRecordsPage.rowByText(RUWAN.name);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\d+\.\d{2}/); // Total Duration (Hours) value
    await expect(employeeAttendanceRecordsPage.rowViewButton(RUWAN.name)).toBeVisible();
  });

  test('TC-ATT-ER-002 — Filtering by a date reloads the summary', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await employeeAttendanceRecordsPage.filterByDate(attendanceData.samples.emptyDate);

    await expect(employeeAttendanceRecordsPage.rowByText(RUWAN.name)).toBeVisible();
    expect(await employeeAttendanceRecordsPage.recordsFoundCount()).toBeGreaterThanOrEqual(1);
  });

  test('TC-ATT-ER-007 — "(N) Records Found" equals the API employee count', async ({
    employeeAttendanceRecordsPage,
    orangehrmAdminApi,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new AttendanceApi(orangehrmAdminApi.request);
    const date = (await api.getCurrentDateTime()).utcDate;
    const { total } = await api.getEmployeeSummary(date);

    await employeeAttendanceRecordsPage.filterByDate(date);

    expect(await employeeAttendanceRecordsPage.recordsFoundCount()).toBe(total);
    await expect(employeeAttendanceRecordsPage.tableRows).toHaveCount(Math.min(total, 50));
  });

  test('TC-ATT-ER-300 — Empty Date + View shows "Required" and does not refresh', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await employeeAttendanceRecordsPage.clearDateAndView();
    await expect(employeeAttendanceRecordsPage.dateError.first()).toHaveText('Required');
  });

  test('TC-ATT-ER-004 — Row "View" drills into that employee\'s detail', async ({
    employeeAttendanceRecordsPage,
    page,
  }) => {
    await employeeAttendanceRecordsPage.viewEmployeeRow(RUWAN.name);

    await expect(page).toHaveURL(new RegExp(`[?&]employeeId=${RUWAN.empNumber}&date=`));
    await expect(employeeAttendanceRecordsPage.heading).toBeVisible();
  });

  test('TC-ATT-ER-005 — Selecting an employee + View opens their detail', async ({
    employeeAttendanceRecordsPage,
    page,
  }) => {
    await employeeAttendanceRecordsPage.selectEmployeeAndView(MARCUS.query, MARCUS.option);

    await expect(page).toHaveURL(new RegExp(`[?&]employeeId=${MARCUS.empNumber}&date=`));
    await expect(employeeAttendanceRecordsPage.heading).toBeVisible();
  });

  test('TC-ATT-ER-302 — An employee with no records on the date shows the empty state', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await employeeAttendanceRecordsPage.gotoDetail(RUWAN.empNumber, attendanceData.samples.emptyDate);

    await expect(employeeAttendanceRecordsPage.noRecordsText.first()).toBeVisible();
    await expect(employeeAttendanceRecordsPage.tableRows).toHaveCount(0);
  });
});

// ─── Detail (admin, seeded for Ruwan = empNumber 1) ─────────────────────────
test.describe('Employee Records — detail (admin)', () => {
  let seedDate: string;
  let inNote: string;
  let outNote: string;

  test.beforeEach(async ({ loginPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new AttendanceApi(orangehrmAdminApi.request);
    await api.ensurePunchedOut();
    seedDate = (await api.getCurrentDateTime()).utcDate;

    const stamp = Date.now();
    inNote = `${attendanceData.samples.myRecordsInNote} ${stamp}`;
    outNote = `${attendanceData.samples.myRecordsOutNote} ${stamp}`;
    await api.punchIn(inNote);
    await api.punchOut(outNote);

    await loginPage.loginAs('admin');
  });

  test('TC-ATT-ER-006 — Detail view lists the employee\'s punch records', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await employeeAttendanceRecordsPage.gotoDetail(RUWAN.empNumber, seedDate);

    const row = employeeAttendanceRecordsPage.rowByText(inNote);
    await expect(row).toBeVisible();
    await expect(row).toContainText(seedDate); // Punch In / Punch Out date
    await expect(row).toContainText(/\d{1,2}:\d{2}\s?(AM|PM)/); // punch time
    await expect(row).toContainText(outNote); // Punch Out Note
    await expect(row).toContainText(/\d+\.\d{2}/); // Duration (Hours)
  });

  test('TC-ATT-ER-202 — Detail records have no edit/delete affordance (config OFF)', async ({
    employeeAttendanceRecordsPage,
  }) => {
    await employeeAttendanceRecordsPage.gotoDetail(RUWAN.empNumber, seedDate);

    const row = employeeAttendanceRecordsPage.rowByText(inNote);
    await expect(row).toBeVisible();
    await expect(row.locator('.oxd-icon-button')).toHaveCount(0);
    await expect(row.locator('input[type="checkbox"]')).toHaveCount(0);
  });
});

// ─── Access control ─────────────────────────────────────────────────────────
test.describe('Employee Records — access control', () => {
  test('TC-ATT-ER-200 — ESS user cannot access the Employee Records summary', async ({
    loginPage,
    employeeAttendanceRecordsPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await employeeAttendanceRecordsPage.gotoSummary();

    await expect(employeeAttendanceRecordsPage.credentialRequired).toBeVisible();
    await expect(employeeAttendanceRecordsPage.tableRows).toHaveCount(0);
  });

  test('TC-ATT-ER-201 — ESS user cannot deep-link into an employee\'s detail', async ({
    loginPage,
    employeeAttendanceRecordsPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await employeeAttendanceRecordsPage.gotoDetail(RUWAN.empNumber, attendanceData.samples.emptyDate);

    await expect(employeeAttendanceRecordsPage.credentialRequired).toBeVisible();
    await expect(employeeAttendanceRecordsPage.tableRows).toHaveCount(0);
  });

  test('TC-ATT-ER-203 — Unauthenticated access redirects to login', async ({
    employeeAttendanceRecordsPage,
    page,
  }) => {
    await page.context().clearCookies();
    await employeeAttendanceRecordsPage.gotoSummary();

    await expect(page).toHaveURL(attendanceData.urlPatterns.login);
  });
});
