import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { TimesheetsApi } from '../../src/api/orangehrmOSAPI/TimesheetsApi';
import { TimeProjectsApi } from '../../src/api/orangehrmOSAPI/TimeProjectsApi';
import { EmployeeTimesheetsApi } from '../../src/api/orangehrmOSAPI/EmployeeTimesheetsApi';

/**
 * E2E coverage for Time → Timesheets → Employee Timesheets (supervisor/admin Approve-Reject view) —
 * P0 + P1 (12 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> Employee timesheets.md
 *   P0: TC-002, TC-003, TC-004, TC-200, TC-203
 *   P1: TC-001, TC-006, TC-100, TC-201, TC-300, TC-500, TC-501
 *
 * Data strategy: Approve/Reject need a SUBORDINATE with a SUBMITTED timesheet. In beforeAll (as admin):
 * a dedicated employee is seeded reporting to the session admin, plus a Customer→Project→Activity.
 * Each mutating test operates on a FRESH past week located by scanning backward for one with no
 * timesheet (`findEmptyWeek`) and creating it — timesheets are "one per employee per week" and can't be
 * deleted, so this keeps every test isolated and idempotent across re-runs. Week starts Sunday here.
 *
 * Live-verified behaviour that contradicts the domain skill (reported in the review notes):
 * - The reject **comment is optional** in OS 5.8 — rejecting with an empty comment still transitions
 *   the timesheet to `Rejected` (TC-300). The "mandatory comment" rule is Enterprise-only / stale.
 * - Reject sets the state to `REJECTED` (not `NOT_SUBMITTED`).
 *
 * Run:
 *   npx playwright test tests/time/employee-timesheets.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 180_000 });

const etsData = frontend.employeeTimesheets;
const ESS_TEST_USER = auth.essTestUser;

// ── Local date helpers (pure) ────────────────────────────────────────────────
const todayStr = (): string => new Date().toISOString().slice(0, 10);
const addDaysStr = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ── Suite-level seeded data + week cursor ────────────────────────────────────
let adminEmpNumber: number;
let adminFullName: string;
let subEmpNumber: number;
let subFullName: string;
let projectId: number;
let activityId: number;

let weekCursorDate: string; // moves backward as fresh weeks are consumed

// State is seeded inside each test body (not a hook) ON PURPOSE: every mutating test needs a
// DISTINCT fresh week (timesheets are one-per-employee-per-week and undeletable), which a single
// shared hook cannot provide. Mirrors the approved sibling `my-timesheets.spec.ts`.

/** Finds the next never-used past week for the subordinate and creates its timesheet. */
async function nextFreshWeek(api: EmployeeTimesheetsApi): Promise<{ id: number; startDate: string }> {
  const empty = await api.findEmptyWeek(subEmpNumber, weekCursorDate);
  const created = await api.createTimesheet(subEmpNumber, empty.startDate);
  weekCursorDate = addDaysStr(created.startDate, -1);
  return { id: created.id as number, startDate: created.startDate };
}

/** A fresh week with one row, submitted — ready for the supervisor to Approve/Reject. */
async function nextSubmittedWeek(api: EmployeeTimesheetsApi): Promise<{ id: number; startDate: string }> {
  const { id, startDate } = await nextFreshWeek(api);
  await api.seedEntry(id, projectId, activityId, addDaysStr(startDate, 1), etsData.samples.validHours);
  await api.submit(subEmpNumber, id);
  return { id, startDate };
}

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const empApi = new EmployeesApi(orangehrmAdminApi.request);
  const projApi = new TimeProjectsApi(orangehrmAdminApi.request);
  const selfTsApi = new TimesheetsApi(orangehrmAdminApi.request);

  // Resolve the session admin's own employee (the approver / subordinate's supervisor).
  const ownTs = await selfTsApi.ensureTimesheet(todayStr());
  const ownMeta = (await selfTsApi.getEntries(ownTs.id as number)).meta as unknown as {
    employee: { empNumber: number; firstName: string; lastName: string };
  };
  adminEmpNumber = ownMeta.employee.empNumber;
  adminFullName = `${ownMeta.employee.firstName} ${ownMeta.employee.lastName}`.trim();

  // Subordinate employee, recreated from a clean slate so re-runs stay idempotent.
  const stale = await empApi.getEmpNumberByEmployeeId(etsData.subordinate.employeeId);
  if (stale != null) await empApi.deleteEmployees([stale]);
  await empApi.create({
    employeeId: etsData.subordinate.employeeId,
    firstName: etsData.subordinate.firstName,
    lastName: etsData.subordinate.lastName,
    middleName: etsData.subordinate.middleName,
  });
  const resolved = await empApi.getEmpNumberByEmployeeId(etsData.subordinate.employeeId);
  if (resolved == null) throw new Error('Setup: could not resolve the seeded subordinate empNumber');
  subEmpNumber = resolved;
  subFullName = `${etsData.subordinate.firstName} ${etsData.subordinate.lastName}`;

  // Subordinate reports to the session admin so the admin may approve/reject their timesheets.
  await empApi.addSupervisorIfAbsent(subEmpNumber, adminEmpNumber, etsData.reportingMethodDirectId);

  // A timesheet row needs an active Project (with a Customer) + Activity. These use stable,
  // suite-owned names and are created-if-absent: a timesheeted project can't be hard-deleted, so
  // reusing them across runs avoids accumulating residue on the shared instance.
  const customerId = await projApi.ensureCustomer(etsData.samples.customerName);
  projectId =
    (await projApi.getProjectIdByName(etsData.samples.projectName)) ??
    (await projApi.createProject({
      name: etsData.samples.projectName,
      customerId,
      projectAdminsEmpNumbers: [],
    })).id;
  activityId = await projApi.ensureActivity(projectId, etsData.samples.activityName);

  weekCursorDate = addDaysStr(todayStr(), -120); // start well before any recently-used week
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const empApi = new EmployeesApi(orangehrmAdminApi.request);
  // Delete only the seeded employee. The suite's Customer/Project are intentionally retained and
  // reused across runs (create-if-absent): once a project is referenced by a timesheet it can't be
  // hard-deleted, so deleting here would only 400. Stable names mean nothing accumulates.
  if (subEmpNumber != null) await empApi.deleteEmployees([subEmpNumber]);
});

// ─── Select view (admin) ─────────────────────────────────────────────────────
test.describe('Employee Timesheets — select view (admin)', () => {
  test.beforeEach(async ({ loginPage, employeeTimesheetPage }) => {
    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoSelect();
  });

  test('TC-ETS-001 — Opens with the Select Employee picker and View button', async ({ employeeTimesheetPage }) => {
    await expect(employeeTimesheetPage.selectHeading).toBeVisible();
    await expect(employeeTimesheetPage.employeeNameInput).toBeVisible();
    await expect(employeeTimesheetPage.viewButton).toBeVisible();
  });

  test('TC-ETS-002 — Select an employee and view their timesheet', async ({ employeeTimesheetPage, page }) => {
    await employeeTimesheetPage.selectEmployeeAndView(subFullName);

    await expect(page).toHaveURL(etsData.urlPatterns.detail);
    await expect(employeeTimesheetPage.detailHeading).toContainText(subFullName);
    await expect(employeeTimesheetPage.periodInput).toBeVisible();
  });
});

// ─── Approve / Reject lifecycle (admin) ──────────────────────────────────────
test.describe('Employee Timesheets — approve / reject (admin)', () => {
  let api: EmployeeTimesheetsApi;

  test.beforeEach(async ({ loginPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    api = new EmployeeTimesheetsApi(orangehrmAdminApi.request);
    await loginPage.loginAs('admin');
  });

  test('TC-ETS-003 — Approve a submitted timesheet', async ({ employeeTimesheetPage }) => {
    const { id, startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);

    await expect(employeeTimesheetPage.approveButton).toBeVisible();
    await employeeTimesheetPage.approve();

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.approved);
    await expect(employeeTimesheetPage.actionCardHeading).toHaveCount(0);
    const meta = (await api.getEntries(id)).meta.timesheet;
    expect(meta.status.id).toBe('APPROVED');
  });

  test('TC-ETS-004 — Reject a submitted timesheet with a comment', async ({ employeeTimesheetPage }) => {
    const { id, startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);

    await expect(employeeTimesheetPage.rejectButton).toBeVisible();
    await employeeTimesheetPage.reject(etsData.samples.rejectComment);

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.rejected);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(etsData.actions.rejected);
    const meta = (await api.getEntries(id)).meta.timesheet;
    expect(meta.status.id).toBe('REJECTED');
  });

  test('TC-ETS-006 — Action log records the approval performer and date', async ({ employeeTimesheetPage }) => {
    const { startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);
    await employeeTimesheetPage.approve();

    await expect(employeeTimesheetPage.actionLogHeading).toBeVisible();
    await expect(employeeTimesheetPage.actionLogTable).toContainText(etsData.actions.approved);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(adminFullName);
    await expect(employeeTimesheetPage.actionLogTable).toContainText(todayStr());
  });

  test('TC-ETS-100 — A not-submitted timesheet offers no Approve/Reject', async ({ employeeTimesheetPage }) => {
    const { id, startDate } = await nextFreshWeek(api); // created, not submitted
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.notSubmitted);
    await expect(employeeTimesheetPage.actionCardHeading).toHaveCount(0);
    await expect(employeeTimesheetPage.approveButton).toHaveCount(0);

    const actions = (await api.getEntries(id)).meta.allowedActions.map((a) => a.action);
    expect(actions).not.toContain('APPROVE');
    expect(actions).not.toContain('REJECT');
  });

  test('TC-ETS-300 — Reject without a comment still transitions to Rejected (comment optional in OS)', async ({
    employeeTimesheetPage,
  }) => {
    // Domain skill claims the reject comment is mandatory; OS 5.8 accepts an empty comment.
    const { id, startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);

    await employeeTimesheetPage.reject(); // no comment

    await expect(employeeTimesheetPage.statusText).toContainText(etsData.status.rejected);
    const meta = (await api.getEntries(id)).meta.timesheet;
    expect(meta.status.id).toBe('REJECTED');
  });

  test('TC-ETS-500 — Action buttons reflect state (Submitted → Approve+Reject; Approved → none)', async ({
    employeeTimesheetPage,
  }) => {
    const { startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);
    await expect(employeeTimesheetPage.approveButton).toBeVisible();
    await expect(employeeTimesheetPage.rejectButton).toBeVisible();

    await employeeTimesheetPage.approve();
    await expect(employeeTimesheetPage.approveButton).toHaveCount(0);
    await expect(employeeTimesheetPage.rejectButton).toHaveCount(0);
  });

  test('TC-ETS-501 — Submitted timesheet renders the inline Timesheet Action card', async ({
    employeeTimesheetPage,
  }) => {
    const { startDate } = await nextSubmittedWeek(api);
    await employeeTimesheetPage.gotoDetail(subEmpNumber, startDate);

    await expect(employeeTimesheetPage.actionCardHeading).toBeVisible();
    await expect(employeeTimesheetPage.commentInput).toBeVisible();
    await expect(employeeTimesheetPage.approveButton).toBeVisible();
    await expect(employeeTimesheetPage.rejectButton).toBeVisible();
  });
});

// ─── Access control ──────────────────────────────────────────────────────────
test.describe('Employee Timesheets — access control', () => {
  test('TC-ETS-201 — Admin can view any employee\'s timesheet', async ({
    loginPage,
    employeeTimesheetPage,
    orangehrmAdminApi,
    page,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new EmployeeTimesheetsApi(orangehrmAdminApi.request);
    const week = await api.getDefault(subEmpNumber, todayStr());

    await loginPage.loginAs('admin');
    await employeeTimesheetPage.gotoDetail(subEmpNumber, week.startDate);

    await expect(page).toHaveURL(etsData.urlPatterns.detail);
    await expect(employeeTimesheetPage.detailHeading).toContainText(subFullName);
  });

  test('TC-ETS-200 — A non-supervisor ESS user is denied Employee Timesheets', async ({
    loginPage,
    employeeTimesheetPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await employeeTimesheetPage.gotoSelect();

    await expect(employeeTimesheetPage.credentialRequired).toBeVisible();
    await expect(employeeTimesheetPage.selectHeading).toHaveCount(0);
  });

  test('TC-ETS-203 — Unauthenticated access redirects to login', async ({ page, employeeTimesheetPage }) => {
    await page.context().clearCookies();
    await employeeTimesheetPage.gotoSelect();
    await expect(page).toHaveURL(etsData.urlPatterns.login);
  });
});
