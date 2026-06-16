import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { TimeProjectsApi } from '../../src/api/orangehrmOSAPI/TimeProjectsApi';
import { TimesheetsApi } from '../../src/api/orangehrmOSAPI/TimesheetsApi';

/**
 * E2E coverage for Time → Timesheets → My Timesheet — P0 + P1 (20 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> My timesheets.md
 *   P0: TC-001, TC-004, TC-005, TC-006, TC-200, TC-202, TC-204
 *   P1: TC-002, TC-003, TC-007, TC-008, TC-009, TC-010, TC-103, TC-105, TC-107, TC-201, TC-300, TC-500, TC-501
 *
 * Data strategy: a timesheet row needs an active Project (with a Customer) + Activity — one of each is
 * seeded via API in beforeAll (unique names per run, hard-deleted in afterAll). Timesheets cannot be
 * deleted and are "one per employee per week", so mutating tests operate on a FRESH past week located by
 * scanning backward for one with no timesheet (`TimesheetsApi.findEmptyWeek`) and creating it — this keeps
 * each test isolated and idempotent across re-runs. Week starts Sunday in this instance.
 *
 * Run:
 *   npx playwright test tests/time/my-timesheets.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 180_000 });

const tsData = frontend.timesheets;
const ESS_TEST_USER = auth.essTestUser;

// ── Local date helpers (pure) ────────────────────────────────────────────────
const todayStr = (): string => new Date().toISOString().slice(0, 10);
const addDaysStr = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const periodStart = (period: string): string => period.split(' to ')[0].trim();
const daysApart = (a: string, b: string): number => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// ── Suite-level seeded data + week cursor ────────────────────────────────────
const stamp = Date.now();
let customerName: string;
let customerId: number;
let projectName: string;
let projectId: number;
let activityId: number;
let activityId2: number;
let projectOptionLabel: string;
let employeeFullName: string;
let adminTimesheetId: number;
const createdProjectNames: string[] = [];
const createdCustomerNames: string[] = [];

let weekCursorDate: string; // moves backward as fresh weeks are consumed

/** Finds the next never-used past week and creates its timesheet; returns its meta. */
async function nextFreshWeek(tsApi: TimesheetsApi): Promise<{ id: number; startDate: string }> {
  const empty = await tsApi.findEmptyWeek(weekCursorDate);
  const created = await tsApi.createTimesheet(empty.startDate);
  weekCursorDate = addDaysStr(created.startDate, -1); // next search starts before this week
  return { id: created.id as number, startDate: created.startDate };
}

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const projApi = new TimeProjectsApi(orangehrmAdminApi.request);
  const tsApi = new TimesheetsApi(orangehrmAdminApi.request);

  customerName = `${tsData.samples.customerPrefix} ${stamp}`;
  customerId = await projApi.ensureCustomer(customerName);
  createdCustomerNames.push(customerName);

  projectName = `${tsData.samples.projectPrefix} ${stamp}`;
  const project = await projApi.createProject({ name: projectName, customerId, projectAdminsEmpNumbers: [] });
  projectId = project.id;
  createdProjectNames.push(projectName);
  activityId = await projApi.ensureActivity(projectId, tsData.samples.activityName);
  activityId2 = await projApi.ensureActivity(projectId, tsData.samples.activityName2);
  projectOptionLabel = `${customerName} - ${projectName}`;

  // A timesheet owned by the session (admin) employee, for the ESS IDOR check + the log performer name.
  const ownTs = await tsApi.ensureTimesheet(todayStr());
  adminTimesheetId = ownTs.id as number;
  const meta = (await tsApi.getEntries(adminTimesheetId)).meta as unknown as {
    employee: { firstName: string; lastName: string };
  };
  employeeFullName = `${meta.employee.firstName} ${meta.employee.lastName}`.trim();

  weekCursorDate = addDaysStr(todayStr(), -120); // start well before any recently-used week
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const projApi = new TimeProjectsApi(orangehrmAdminApi.request);
  await projApi.deleteProjectsByNames([...new Set(createdProjectNames)]);
  const customers = await projApi.getCustomers();
  const ids = customers.filter((c) => createdCustomerNames.includes(c.name)).map((c) => c.id);
  await projApi.deleteCustomers(ids);
});

// ─── View & navigation (admin) ───────────────────────────────────────────────
test.describe('My Timesheet — view & navigation (admin)', () => {
  test.beforeEach(async ({ loginPage, myTimesheetPage }) => {
    await loginPage.loginAs('admin');
    await myTimesheetPage.gotoView();
  });

  test('TC-TIME-MTS-001 — Opens on the current week and auto-loads it', async ({ myTimesheetPage }) => {
    await expect(myTimesheetPage.viewHeading).toBeVisible();
    await expect(myTimesheetPage.periodInput).toHaveValue(/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/);
  });

  test('TC-TIME-MTS-002 — Previous-period navigation steps back one week', async ({ myTimesheetPage }) => {
    const before = periodStart(await myTimesheetPage.readPeriod());
    await myTimesheetPage.goPrevPeriod();
    const after = periodStart(await myTimesheetPage.readPeriod());
    expect(daysApart(after, before)).toBe(7);
  });

  test('TC-TIME-MTS-003 — Next-period navigation steps forward one week', async ({ myTimesheetPage }) => {
    const before = periodStart(await myTimesheetPage.readPeriod());
    await myTimesheetPage.goNextPeriod();
    const after = periodStart(await myTimesheetPage.readPeriod());
    expect(daysApart(before, after)).toBe(7);
  });

  test('TC-TIME-MTS-200 — Self-scoped: no employee selector', async ({ myTimesheetPage }) => {
    await expect(myTimesheetPage.viewHeading).toBeVisible();
    await expect(myTimesheetPage.employeeNameLabel).toHaveCount(0);
  });
});

// ─── Create / edit / submit lifecycle (admin) ────────────────────────────────
test.describe('My Timesheet — lifecycle (admin)', () => {
  let tsApi: TimesheetsApi;

  test.beforeEach(async ({ loginPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    tsApi = new TimesheetsApi(orangehrmAdminApi.request);
    await loginPage.loginAs('admin');
  });

  test('TC-TIME-MTS-004 — Create a timesheet for a period that has none', async ({ myTimesheetPage }) => {
    const empty = await tsApi.findEmptyWeek(weekCursorDate);
    await myTimesheetPage.gotoViewWeek(empty.startDate);

    await expect(myTimesheetPage.noTimesheetsAlert).toBeVisible();
    await expect(myTimesheetPage.createButton).toBeEnabled();

    await myTimesheetPage.clickCreateTimesheet();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.notSubmitted);
    await expect(myTimesheetPage.editButton).toBeVisible();
    await expect(myTimesheetPage.submitButton).toBeVisible();
    weekCursorDate = addDaysStr(empty.startDate, -1);
  });

  test('TC-TIME-MTS-005 — Add a row (project + activity + hours) and Save', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);
    const monday = addDaysStr(startDate, 1);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.selectProject(projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(tsData.samples.activityName);
    await myTimesheetPage.setDayHours(1, tsData.samples.validHours);
    await myTimesheetPage.save();

    const entries = await tsApi.getEntries(id);
    expect(entries.data).toHaveLength(1);
    expect(entries.data[0].dates[monday].duration).toBe(tsData.samples.validHours);
    expect(entries.meta.sum.label).toBe(tsData.samples.validHours);

    await myTimesheetPage.gotoViewWeek(startDate);
    await expect(myTimesheetPage.gridRowByText(projectName)).toBeVisible();
  });

  test('TC-TIME-MTS-006 — Submit a timesheet', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);
    await myTimesheetPage.gotoViewWeek(startDate);

    await myTimesheetPage.clickSubmit();

    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);
    await expect(myTimesheetPage.submitButton).toHaveCount(0);
    const meta = (await tsApi.getEntries(id)).meta.timesheet;
    expect(meta.status.id).toBe('SUBMITTED');
  });

  test('TC-TIME-MTS-007 — Edit an existing row\'s hours and Save', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);
    const monday = addDaysStr(startDate, 1);
    await tsApi.seedEntry(id, projectId, activityId, monday, '08:00');

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.setDayHours(1, tsData.samples.hhmmHours); // 04:30
    await myTimesheetPage.save();

    const entries = await tsApi.getEntries(id);
    expect(entries.data[0].dates[monday].duration).toBe('04:30');
  });

  test('TC-TIME-MTS-008 — Delete a row and Save', async ({ myTimesheetPage }) => {
    // Two rows are seeded: deleting the only row would re-insert a blank (invalid) row and block Save,
    // so the realistic delete path keeps a second valid row. The first row (Development) is removed.
    const { id, startDate } = await nextFreshWeek(tsApi);
    const monday = addDaysStr(startDate, 1);
    await tsApi.putEntries(id, [
      { projectId, activityId, dates: { [monday]: { duration: tsData.samples.multiDay.day1 } } },
      { projectId, activityId: activityId2, dates: { [monday]: { duration: tsData.samples.multiDay.day2 } } },
    ]);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.deleteFirstRow();
    await myTimesheetPage.save();

    // Assert by presence/absence rather than row position (order-independent).
    const names = (await tsApi.getEntries(id)).data.map((e) => e.activity.name);
    expect(names).toHaveLength(1);
    expect(names).not.toContain(tsData.samples.activityName);
    expect(names).toContain(tsData.samples.activityName2);
  });

  test('TC-TIME-MTS-009 — Multiple days sum into row + grand totals', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.selectProject(projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(tsData.samples.activityName);
    await myTimesheetPage.setDayHours(1, tsData.samples.multiDay.day1);
    await myTimesheetPage.setDayHours(2, tsData.samples.multiDay.day2);
    await myTimesheetPage.save();

    const entries = await tsApi.getEntries(id);
    expect(entries.meta.sum.label).toBe(tsData.samples.multiDay.total);

    await myTimesheetPage.gotoViewWeek(startDate);
    await expect(myTimesheetPage.grandTotalRow).toContainText(tsData.samples.multiDay.total);
  });

  test('TC-TIME-MTS-010 — Action log records the Submit', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);
    await myTimesheetPage.gotoViewWeek(startDate);
    await myTimesheetPage.clickSubmit();

    await expect(myTimesheetPage.actionLogHeading).toBeVisible();
    await expect(myTimesheetPage.actionLogTable).toContainText(tsData.status.submitted);
    await expect(myTimesheetPage.actionLogTable).toContainText(employeeFullName);
    const logs = await tsApi.getActionLogs(id);
    expect(logs.total).toBeGreaterThanOrEqual(1);
  });

  test('TC-TIME-MTS-103 — Both HH:MM and decimal hour formats are accepted', async ({ myTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(tsApi);
    const monday = addDaysStr(startDate, 1);
    const tuesday = addDaysStr(startDate, 2);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.selectProject(projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(tsData.samples.activityName);
    await myTimesheetPage.setDayHours(1, tsData.samples.hhmmAlt); // 08:30
    await myTimesheetPage.setDayHours(2, tsData.samples.decimalHours); // 8.5
    await expect(myTimesheetPage.hoursError).toHaveCount(0);
    await myTimesheetPage.save();

    const entries = await tsApi.getEntries(id);
    expect(entries.data[0].dates[monday].duration).toBe(tsData.samples.hhmmAlt);
    expect(entries.data[0].dates[tuesday].duration).toBe(tsData.samples.decimalHoursNormalized); // 8.5 → 08:30
  });

  test('TC-TIME-MTS-107 — A row needs both Project and Activity to persist', async ({ myTimesheetPage }) => {
    const { id } = await nextFreshWeek(tsApi);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.setDayHours(1, tsData.samples.validHours); // hours only, no project/activity
    await myTimesheetPage.save();

    const entries = await tsApi.getEntries(id);
    expect(entries.data).toHaveLength(0);
  });

  test('TC-TIME-MTS-300 — Hours ≥ 24 are rejected with a validation error', async ({ myTimesheetPage }) => {
    const { id } = await nextFreshWeek(tsApi);

    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.selectProject(projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(tsData.samples.activityName);
    await myTimesheetPage.setDayHours(1, tsData.samples.overLimitHours); // 25:00

    await expect(myTimesheetPage.hoursError.first()).toBeVisible();
  });

  test('TC-TIME-MTS-105 — A future-week timesheet cannot be created', async ({ myTimesheetPage }) => {
    await myTimesheetPage.gotoViewWeek(addDaysStr(todayStr(), 30));

    await expect(myTimesheetPage.noTimesheetsAlert).toBeVisible();
    await expect(myTimesheetPage.createButton).toBeDisabled();
  });

  test('TC-TIME-MTS-500 — No-timesheet state shows the alert + Create button', async ({ myTimesheetPage }) => {
    const empty = await tsApi.findEmptyWeek(weekCursorDate);
    await myTimesheetPage.gotoViewWeek(empty.startDate);

    await expect(myTimesheetPage.noTimesheetsAlert).toBeVisible();
    await expect(myTimesheetPage.createButton).toBeVisible();
    await expect(myTimesheetPage.createButton).toBeEnabled();
  });

  test('TC-TIME-MTS-501 — Button set reflects state (Not Submitted vs Submitted)', async ({ myTimesheetPage }) => {
    // Not Submitted → Edit + Submit
    const open = await nextFreshWeek(tsApi);
    await myTimesheetPage.gotoViewWeek(open.startDate);
    await expect(myTimesheetPage.editButton).toBeVisible();
    await expect(myTimesheetPage.submitButton).toBeVisible();

    // Submitted → Edit only
    const done = await nextFreshWeek(tsApi);
    await tsApi.submit(done.id);
    await myTimesheetPage.gotoViewWeek(done.startDate);
    await expect(myTimesheetPage.editButton).toBeVisible();
    await expect(myTimesheetPage.submitButton).toHaveCount(0);
  });
});

// ─── ESS access (positive + IDOR) ────────────────────────────────────────────
test.describe('My Timesheet — ESS access', () => {
  test('TC-TIME-MTS-201 — An ESS user can reach My Timesheet', async ({ loginPage, myTimesheetPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await myTimesheetPage.gotoView();

    await expect(myTimesheetPage.viewHeading).toBeVisible();
    await expect(myTimesheetPage.periodInput).toBeVisible();
  });

  test('TC-TIME-MTS-202 — ESS cannot open another employee\'s timesheet by id (IDOR)', async ({
    loginPage,
    myTimesheetPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await myTimesheetPage.gotoEdit(adminTimesheetId);

    // The ESS user must not get another employee's editable timesheet form.
    await expect(myTimesheetPage.editHeading).toHaveCount(0);
  });
});

// ─── Auth guard ──────────────────────────────────────────────────────────────
test.describe('My Timesheet — auth guard', () => {
  test('TC-TIME-MTS-204 — Unauthenticated access redirects to login', async ({ page, myTimesheetPage }) => {
    await page.context().clearCookies();
    await myTimesheetPage.gotoView();
    await expect(page).toHaveURL(tsData.urlPatterns.login);
  });
});
