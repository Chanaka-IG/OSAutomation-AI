import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { TimeProjectsApi } from '../../src/api/orangehrmOSAPI/TimeProjectsApi';
import { TimesheetsApi } from '../../src/api/orangehrmOSAPI/TimesheetsApi';
import { EmployeeTimesheetsApi } from '../../src/api/orangehrmOSAPI/EmployeeTimesheetsApi';
import type { LoginPage } from '../../src/pages/auth/LoginPage';
import type { MyTimesheetPage } from '../../src/pages/time/MyTimesheetPage';

/**
 * E2E cross-role timesheet lifecycle (OS 5.8, "Flow 5"): an **ESS** user submits their own weekly
 * timesheet through `time/viewMyTimesheet`; then **Admin** (the supervisor) Approves/Rejects it through
 * `time/viewEmployeeTimesheet`. One test = one full journey with a real session hand-off, with the
 * persisted state asserted via the employee-scoped API.
 *
 * Source: docs/test-priority_E2E Attendance. ESS submit timesheet and admin or supervisor do the actions.md
 *   P0: TC-001, TC-002, TC-200, TC-202
 *   P1: TC-003, TC-004, TC-100, TC-201, TC-500
 *   P2: TC-005, TC-401, TC-400, TC-402
 * Not re-implemented here (fully covered by the dedicated single-view suites, avoiding duplication):
 *   TC-302 (ESS hour validation) → my-timesheets.spec TC-300; TC-501/TC-502 (buttons/log) →
 *   employee-timesheets.spec TC-500/504 + asserted inline in TC-001/TC-004/TC-100 below.
 *
 * Data strategy: a dedicated ESS employee + login (userRoleId 2) reporting to the session admin, plus a
 * Customer→Project→Activity where the ESS is a project admin (so the project shows in the ESS autocomplete).
 * Identities are STABLE + create-if-absent (reused across runs). Each test consumes a FRESH past week for
 * the ESS (timesheets are one-per-week & undeletable), so tests stay isolated and idempotent.
 *
 * Run:
 *   npx playwright test tests/time/timesheet-lifecycle.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 240_000 });

const lc = frontend.timesheetLifecycle;
const tsData = frontend.timesheets; // ESS My-Timesheet strings
const etsData = frontend.employeeTimesheets; // supervisor strings

// ── Local date helpers (pure) ────────────────────────────────────────────────
const todayStr = (): string => new Date().toISOString().slice(0, 10);
const addDaysStr = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Suite-level seeded data + week cursor ────────────────────────────────────
let essEmp: number;
let essFullName: string;
let adminEmp: number;
let adminFullName: string;
let projectId: number;
let activityId: number;
let projectOptionLabel: string;
const essUser = lc.essUser;

let weekCursorDate: string; // moves backward as fresh weeks are consumed

/**
 * Reserves the next never-used past week for the ESS employee (does NOT create it). The shared
 * `weekCursorDate` is advanced so successive calls hand out non-overlapping weeks (relies on the
 * suite's serial / single-worker execution).
 */
async function claimFreshWeek(api: EmployeeTimesheetsApi): Promise<string> {
  const empty = await api.findEmptyWeek(essEmp, weekCursorDate);
  weekCursorDate = addDaysStr(empty.startDate, -1);
  return empty.startDate;
}

/** The ESS timesheet id for a week (after it has been created). */
async function essTimesheetId(api: EmployeeTimesheetsApi, weekStart: string): Promise<number> {
  const meta = await api.getDefault(essEmp, weekStart);
  return meta.id as number;
}

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const empApi = new EmployeesApi(orangehrmAdminApi.request);
  const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
  const projApi = new TimeProjectsApi(orangehrmAdminApi.request);
  const selfTsApi = new TimesheetsApi(orangehrmAdminApi.request);

  // Resolve the session admin's own employee (the approver / ESS's supervisor).
  const ownTs = await selfTsApi.ensureTimesheet(todayStr());
  const ownMeta = (await selfTsApi.getEntries(ownTs.id as number)).meta as unknown as {
    employee: { empNumber: number; firstName: string; lastName: string };
  };
  adminEmp = ownMeta.employee.empNumber;
  adminFullName = `${ownMeta.employee.firstName} ${ownMeta.employee.lastName}`.trim();

  // ESS employee + login (create-if-absent; identities are reused across runs).
  await empApi.createIfAbsent({
    employeeId: lc.essEmployee.employeeId,
    firstName: lc.essEmployee.firstName,
    lastName: lc.essEmployee.lastName,
    middleName: lc.essEmployee.middleName,
  });
  const resolved = await empApi.getEmpNumberByEmployeeId(lc.essEmployee.employeeId);
  if (resolved == null) throw new Error('Setup: could not resolve the ESS employee empNumber');
  essEmp = resolved;
  essFullName = `${lc.essEmployee.firstName} ${lc.essEmployee.lastName}`;

  await empApi.addSupervisorIfAbsent(essEmp, adminEmp, lc.reportingMethodDirectId);
  await usersApi.createIfAbsent({
    username: essUser.username,
    password: essUser.password,
    status: true,
    userRoleId: essUser.userRoleId,
    empNumber: essEmp,
  });

  // Customer→Project→Activity. The ESS is a project admin so the project shows in their autocomplete.
  const customerId = await projApi.ensureCustomer(lc.project.customerName);
  projectId =
    (await projApi.getProjectIdByName(lc.project.projectName)) ??
    (await projApi.createProject({
      name: lc.project.projectName,
      customerId,
      projectAdminsEmpNumbers: [essEmp],
    })).id;
  activityId = await projApi.ensureActivity(projectId, lc.project.activityName);
  await projApi.ensureActivity(projectId, lc.project.activity2Name);
  projectOptionLabel = `${lc.project.customerName} - ${lc.project.projectName}`;

  weekCursorDate = addDaysStr(todayStr(), -150); // start well before any recently-used week
});

// The ESS employee, user, and project are STABLE create-if-absent identities reused across runs (and
// employee deletes are environment-restricted on this shared instance), so there is no destructive
// afterAll — nothing new accumulates.

// ── Reusable journey fragments ───────────────────────────────────────────────
/** ESS logs in and submits a timesheet for `weekStart` (create → edit → save → submit). */
async function essLogAndSubmit(
  loginPage: LoginPage,
  myTimesheetPage: MyTimesheetPage,
  weekStart: string,
  hours = lc.samples.validHours,
): Promise<void> {
  await loginPage.loginWithCredentials(essUser.username, essUser.password);
  await myTimesheetPage.gotoViewWeek(weekStart);
  await myTimesheetPage.clickCreateTimesheet();
  await myTimesheetPage.openEdit();
  await myTimesheetPage.selectProject(lc.project.projectName, projectOptionLabel);
  await myTimesheetPage.selectActivity(lc.project.activityName);
  await myTimesheetPage.setDayHours(1, hours);
  await myTimesheetPage.save();
  await myTimesheetPage.gotoViewWeek(weekStart);
  await myTimesheetPage.clickSubmit();
}

// ─── P0 + P1 + P2 — cross-role journeys ───────────────────────────────────────
test.describe('Timesheet lifecycle — ESS submit → Admin/Supervisor action', () => {
  let api: EmployeeTimesheetsApi;

  test.beforeEach(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    api = new EmployeeTimesheetsApi(orangehrmAdminApi.request);
  });

  test('TC-TSL-001 — ESS submits and Admin approves (golden path)', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);

    await essLogAndSubmit(loginPage, myTimesheetPage, week);
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await expect(employeeTimesheetPage.approveButton).toBeVisible();
    await employeeTimesheetPage.approve();

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
    const id = await essTimesheetId(api, week);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('APPROVED');
  });

  test('TC-TSL-002 — ESS submits and Admin rejects with a comment', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);

    await essLogAndSubmit(loginPage, myTimesheetPage, week);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.reject(lc.samples.rejectComment);

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.rejected);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(etsData.actions.rejected);
    const id = await essTimesheetId(api, week);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('REJECTED');
  });

  test('TC-TSL-003 — ESS adds a row, saves it, and submits', async ({ loginPage, myTimesheetPage }) => {
    const week = await claimFreshWeek(api);

    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickCreateTimesheet();
    await myTimesheetPage.openEdit();
    await myTimesheetPage.selectProject(lc.project.projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(lc.project.activityName);
    await myTimesheetPage.setDayHours(1, lc.samples.validHours);
    await myTimesheetPage.save();

    // Save persists the row and returns to the view (no toast in OS — verified live on My Timesheet).
    await myTimesheetPage.gotoViewWeek(week);
    await expect(myTimesheetPage.gridRowByText(lc.project.projectName)).toBeVisible();
    await myTimesheetPage.clickSubmit();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);
  });

  test('TC-TSL-004 — Action log captures both the ESS submit and the Admin approve', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    // The submit must be performed BY the ESS (not admin-on-behalf) so the log's "Submitted" row
    // credits the ESS — that is the audit trail under test.
    const week = await claimFreshWeek(api);
    await essLogAndSubmit(loginPage, myTimesheetPage, week);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.approve();

    await expect(employeeTimesheetPage.actionLogHeading).toBeVisible();
    await expect(employeeTimesheetPage.actionLogTable).toContainText(etsData.actions.submitted);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(etsData.actions.approved);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(essFullName); // ESS submitter
    await expect(employeeTimesheetPage.actionLogTable).toContainText(adminFullName); // approver
    const id = await essTimesheetId(api, week);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('APPROVED');
  });

  test('TC-TSL-100 — Admin sees no Approve/Reject for a not-submitted timesheet', async ({
    loginPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);
    const created = await api.createTimesheet(essEmp, week); // created, not submitted

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.notSubmitted);
    await expect(employeeTimesheetPage.actionCardHeading).toHaveCount(0);
    await expect(employeeTimesheetPage.approveButton).toHaveCount(0);
    const actions = (await api.getEntries(created.id as number)).meta.allowedActions.map((a) => a.action);
    expect(actions).not.toContain('APPROVE');
    expect(actions).not.toContain('REJECT');
  });

  test('TC-TSL-200 — ESS cannot access the supervisor Employee Timesheets view', async ({
    loginPage,
    employeeTimesheetPage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await employeeTimesheetPage.gotoSelect();

    await expect(employeeTimesheetPage.credentialRequired).toBeVisible();
    await expect(employeeTimesheetPage.selectHeading).toHaveCount(0);
  });

  test('TC-TSL-201 — My Timesheet is self-scoped (no employee selector for ESS)', async ({
    loginPage,
    myTimesheetPage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoView();

    await expect(myTimesheetPage.viewHeading).toBeVisible();
    await expect(myTimesheetPage.employeeNameLabel).toHaveCount(0);
  });

  test('TC-TSL-202 — Owner cannot Approve/Reject their own submitted timesheet', async ({
    loginPage,
    myTimesheetPage,
    page,
  }) => {
    const week = await claimFreshWeek(api);
    await api.createSubmittedTimesheet(essEmp, week, projectId, activityId, lc.samples.validHours);

    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);

    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toHaveCount(0);
  });

  test('TC-TSL-500 — State badge transitions Not Submitted → Submitted → Approved', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);

    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickCreateTimesheet();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.notSubmitted);

    await myTimesheetPage.openEdit();
    await myTimesheetPage.selectProject(lc.project.projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(lc.project.activityName);
    await myTimesheetPage.setDayHours(1, lc.samples.validHours);
    await myTimesheetPage.save();
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickSubmit();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.approve();
    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
  });

  test('TC-TSL-005 — Rejected timesheet returns to the ESS, who resubmits → Admin approves', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);
    const id = await api.createSubmittedTimesheet(essEmp, week, projectId, activityId, lc.samples.validHours);

    // Admin rejects
    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.reject(lc.samples.rejectComment);
    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.rejected);

    // ESS sees it rejected, edits hours, and resubmits
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.rejected);
    await myTimesheetPage.gotoEdit(id);
    await myTimesheetPage.setDayHours(1, lc.samples.resubmitHours);
    await myTimesheetPage.save();
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickSubmit();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);

    // Admin approves the resubmission
    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.approve();
    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('APPROVED');
  });

  test('TC-TSL-401 — Multi-day timesheet submits and approves with correct totals', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);

    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickCreateTimesheet();
    await myTimesheetPage.openEdit();
    await myTimesheetPage.selectProject(lc.project.projectName, projectOptionLabel);
    await myTimesheetPage.selectActivity(lc.project.activityName);
    await myTimesheetPage.setDayHours(1, lc.samples.validHours); // 08:00
    await myTimesheetPage.setDayHours(2, lc.samples.day2Hours); // 04:00
    await myTimesheetPage.save();
    await myTimesheetPage.gotoViewWeek(week);
    await expect(myTimesheetPage.grandTotalRow).toContainText(lc.samples.twoDayTotal); // 12:00
    await myTimesheetPage.clickSubmit();

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.approve();

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
    const id = await essTimesheetId(api, week);
    const entries = await api.getEntries(id);
    expect(entries.meta.sum.label).toBe(lc.samples.twoDayTotal);
    expect(entries.meta.timesheet.status.id).toBe('APPROVED');
  });

  test('TC-TSL-400 — Admin can reject with an empty comment (comment optional in OS)', async ({
    loginPage,
    employeeTimesheetPage,
  }) => {
    // Domain skill claims the reject comment is mandatory; OS 5.8 accepts an empty comment.
    const week = await claimFreshWeek(api);
    const id = await api.createSubmittedTimesheet(essEmp, week, projectId, activityId, lc.samples.validHours);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.reject(); // no comment

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.rejected);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('REJECTED');
  });

  test('TC-TSL-402 — An empty timesheet can be submitted by ESS and approved by Admin', async ({
    loginPage,
    myTimesheetPage,
    employeeTimesheetPage,
  }) => {
    const week = await claimFreshWeek(api);

    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await myTimesheetPage.gotoViewWeek(week);
    await myTimesheetPage.clickCreateTimesheet(); // no rows added
    await myTimesheetPage.clickSubmit();
    await expect(myTimesheetPage.statusText).toContainText(tsData.status.submitted);

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(essEmp, week);
    await employeeTimesheetPage.approve();
    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
    const id = await essTimesheetId(api, week);
    expect((await api.getEntries(id)).meta.timesheet.status.id).toBe('APPROVED');
  });
});
