import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { HolidaysApi } from '../../src/api/orangehrmOSAPI/HolidaysApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { leave } from '../../test-data/leave/frontend/leave';
import { assignLeaveData } from '../../test-data/leave/frontend/assignLeave';

/**
 * Leave → Assign Leave
 * Covers P0 and P1 scenarios from docs/test-priority.md.
 *
 * NOTE: This suite runs in `serial` mode and shares a single Annual Leave
 * entitlement (seeded once in beforeAll). Tests use distinct, non-overlapping
 * dates so each can run independently; the employee is deleted in afterAll,
 * which also clears their leave requests.
 *
 * Run:
 *   npx playwright test tests/leave/assign-leave.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-203 — Unauthenticated access redirects to login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-203 — Unauthenticated access', () => {
  test('direct Assign Leave URL redirects to login', async ({ page }) => {
    await page.goto(leave.routes.assignLeave, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(leave.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(leave.urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite (Admin role)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authenticated — Assign Leave', () => {
  const {
    employees, essUser, supervisorUser, reportingMethodId,
    leaveTypes, entitlements, holiday, dates, expectedConsumed,
  } = assignLeaveData;
  const assignFullName = `${employees.main.firstName} ${employees.main.lastName}`;
  const essFullName = `${employees.ess.firstName} ${employees.ess.lastName}`;
  const p2FullName = `${employees.p2.firstName} ${employees.p2.lastName}`;

  let assignEmpNumber = 0;
  let essEmpNumber = 0;
  let supEmpNumber = 0;
  let p2EmpNumber = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext }) => {
    test.setTimeout(120_000);
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const holidaysApi = new HolidaysApi(orangehrmApiContext);

    // Create main test employee
    await empApi.createIfAbsent(employees.main);
    const n1 = await empApi.getEmpNumberByFullName(employees.main.firstName, employees.main.lastName);
    if (n1 == null) throw new Error(`Setup: could not resolve empNumber for ${assignFullName}`);
    assignEmpNumber = n1;

    // Annual Leave entitlement (consumed across most happy-path tests)
    await entApi.createOrUpdateEntitlement({
      empNumber: assignEmpNumber,
      leaveTypeId: leaveTypes.annual.id,
      entitlement: entitlements.annualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });

    // Casual Leave entitlement for TC-402 boundary test
    await entApi.createOrUpdateEntitlement({
      empNumber: assignEmpNumber,
      leaveTypeId: leaveTypes.casual.id,
      entitlement: entitlements.casualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });

    // Create ESS employee + user for TC-201 access control test
    await empApi.createIfAbsent(employees.ess);
    const n2 = await empApi.getEmpNumberByFullName(employees.ess.firstName, employees.ess.lastName);
    if (n2 == null) throw new Error(`Setup: could not resolve empNumber for ${employees.ess.firstName} ${employees.ess.lastName}`);
    essEmpNumber = n2;

    await usersApi.createIfAbsent({
      username: essUser.username,
      password: essUser.password,
      status: true,
      userRoleId: essUser.userRoleId},
      essEmpNumber
    );

    // Create supervisor employee + user, then make the main employee report to them
    // (TC-007 / TC-202). employees.ess is intentionally left as a NON-subordinate.
    await empApi.createIfAbsent(employees.supervisor);
    const n3 = await empApi.getEmpNumberByFullName(employees.supervisor.firstName, employees.supervisor.lastName);
    if (n3 == null) throw new Error(`Setup: could not resolve empNumber for ${employees.supervisor.firstName} ${employees.supervisor.lastName}`);
    supEmpNumber = n3;

    await usersApi.createIfAbsent({
      username: supervisorUser.username,
      password: supervisorUser.password,
      status: true,
      userRoleId: supervisorUser.userRoleId},
      supEmpNumber,
    );

    // main employee → reports to supervisor (Direct)
    await empApi.addSupervisorIfAbsent(assignEmpNumber, supEmpNumber, reportingMethodId);

    // P2 employee with distinct Annual/Casual entitlements (P2 suite)
    await empApi.createIfAbsent(employees.p2);
    const n4 = await empApi.getEmpNumberByFullName(employees.p2.firstName, employees.p2.lastName);
    if (n4 == null) throw new Error(`Setup: could not resolve empNumber for ${p2FullName}`);
    p2EmpNumber = n4;
    await entApi.createOrUpdateEntitlement({
      empNumber: p2EmpNumber,
      leaveTypeId: leaveTypes.annual.id,
      entitlement: entitlements.p2AnnualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });
    await entApi.createOrUpdateEntitlement({
      empNumber: p2EmpNumber,
      leaveTypeId: leaveTypes.casual.id,
      entitlement: entitlements.p2CasualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });

    // Holiday for TC-401 (Mon-Fri range = 4 consumed, not 5)
    try {
      await holidaysApi.create(holiday);
    } catch {
      // Holiday may already exist from a prior run; safe to ignore
    }
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!assignEmpNumber && !essEmpNumber && !supEmpNumber && !p2EmpNumber) return;

    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      const empApi = new EmployeesApi(apiCtx.request);
      const toDelete = [assignEmpNumber, essEmpNumber, supEmpNumber, p2EmpNumber].filter(Boolean);
      await empApi.deleteEmployees(toDelete);
    } finally {
      await apiCtx.close();
    }
  });

  test.beforeEach(async ({ loginPage, assignLeavePage }) => {
    await loginPage.loginAs('admin');
    await assignLeavePage.gotoAssignLeave();
  });

  // ── P0: TC-001 — Full-day happy path ─────────────────────────────────────

  test('TC-LVE-ASN-001 — Admin assigns a full-day Annual Leave with sufficient entitlement', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.fullDay);
    await assignLeavePage.fillToDate(dates.fullDay);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P0: TC-105 — Admin-assigned leave status is immediately "Scheduled" ───

  test('TC-LVE-ASN-105 — Admin-assigned leave status is immediately Scheduled', async ({
    assignLeavePage, leaveListPage,
  }) => {
    // Self-seed: assign a full-day leave on a dedicated date so this test does
    // not depend on the ordering/side effects of any other test.
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.scheduledCheck);
    await assignLeavePage.fillToDate(dates.scheduledCheck);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.assign();
    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    // Verify the request shows as "Scheduled" in the admin Leave List.
    await leaveListPage.gotoLeaveList();
    await leaveListPage.clearStatusChip(); // list defaults to "Pending Approval"
    await leaveListPage.selectStatus('Scheduled');
    await leaveListPage.searchByEmployee(assignFullName);
    await leaveListPage.search();

    await expect(leaveListPage.rowsWithStatus('Scheduled').first()).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-002 — Multi-day leave ─────────────────────────────────────────

  test('TC-LVE-ASN-002 — Admin assigns multi-day Annual Leave (Mon–Wed)', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.multiDayFrom);
    await assignLeavePage.fillToDate(dates.multiDayTo);
    await assignLeavePage.waitForFormReady();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-003 — First Half (morning) leave ───────────────────────────────

  test('TC-LVE-ASN-003 — Admin assigns First Half (morning) leave', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.firstHalf);
    await assignLeavePage.fillToDate(dates.firstHalf);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.selectDuration(leave.duration.firstHalf);
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-004 — Second Half (afternoon) leave ────────────────────────────

  test('TC-LVE-ASN-004 — Admin assigns Second Half (afternoon) leave', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.secondHalf);
    await assignLeavePage.fillToDate(dates.secondHalf);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.selectDuration(leave.duration.secondHalf);
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-005 — Specify Time duration ───────────────────────────────────

  test('TC-LVE-ASN-005 — Admin assigns leave with Specify Time duration', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.specifyTime);
    await assignLeavePage.fillToDate(dates.specifyTime);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.selectDuration(leave.duration.specifyTime);
    // "Specify Time" auto-populates a valid default window (09:00 AM–05:00 PM);
    // assign with it (the time field is an AM/PM picker, not a free-text input).
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-007 — Supervisor assigns leave for a subordinate ──────────────

  test('TC-LVE-ASN-007 — Supervisor assigns leave for a subordinate employee', async ({
    page, assignLeavePage,
  }) => {
    // Log in as the seeded supervisor (employees.main reports to them)
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(supervisorUser.username, supervisorUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await assignLeavePage.gotoAssignLeave();

    await assignLeavePage.selectEmployee(assignFullName); // the subordinate
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.supervisorAssign);
    await assignLeavePage.fillToDate(dates.supervisorAssign);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-104 — Weekend days excluded from leave count ───────────────────

  test('TC-LVE-ASN-104 — Leave spanning weekends counts only working days', async ({
    assignLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    const balanceBefore = await entApi.getEntitlementBalance(assignEmpNumber, leaveTypes.annual.id);

    // Fri → Mon: spans Sat+Sun = 2 working days consumed, not 4
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.weekendFrom);
    await assignLeavePage.fillToDate(dates.weekendTo);
    await assignLeavePage.waitForFormReady();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const balanceAfter = await entApi.getEntitlementBalance(assignEmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(expectedConsumed.weekend);
  });

  // ── P1: TC-202 — Supervisor cannot assign leave for non-subordinate ────────

  test('TC-LVE-ASN-202 — Supervisor cannot assign leave for a non-subordinate employee', async ({
    page, assignLeavePage,
  }) => {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(supervisorUser.username, supervisorUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await assignLeavePage.gotoAssignLeave();

    // The supervisor's employee picker lists only subordinates; the ESS employee
    // (a non-subordinate) must not be selectable.
    await assignLeavePage.typeEmployee(essFullName);
    await expect(assignLeavePage.autocompleteNoResults).toBeVisible({ timeout: 8_000 });
    await expect(assignLeavePage.employeeOption(essFullName)).toHaveCount(0);
  });

  // ── P0: TC-301 — Missing employee shows Required validation ───────────────

  test('TC-LVE-ASN-301 — Missing employee field shows Required validation', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.assignButton.click();

    await expect(assignLeavePage.validationErrors.first()).toBeVisible({ timeout: 5_000 });
    const errors = await assignLeavePage.validationErrors.allInnerTexts();
    expect(errors.some((e) => /required/i.test(e))).toBe(true);
  });

  // ── P0: TC-302 — Missing leave type shows Required validation ─────────────

  test('TC-LVE-ASN-302 — Missing leave type field shows Required validation', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    // Fill dates but skip leave type selection
    await assignLeavePage.fillFromDate(dates.missingLeaveType);
    await assignLeavePage.fillToDate(dates.missingLeaveType);
    await assignLeavePage.assignButton.click();

    await expect(assignLeavePage.validationErrors.first()).toBeVisible({ timeout: 5_000 });
    const errors = await assignLeavePage.validationErrors.allInnerTexts();
    expect(errors.some((e) => /required/i.test(e))).toBe(true);
  });

  // ── P1: TC-303 — Missing From Date shows Required validation ──────────────

  test('TC-LVE-ASN-303 — Missing From Date shows Required validation', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    // Fill only To Date — From Date left empty
    await assignLeavePage.fillToDate(dates.missingFromDate);
    await assignLeavePage.assignButton.click();

    await expect(assignLeavePage.validationErrors.first()).toBeVisible({ timeout: 5_000 });
    const errors = await assignLeavePage.validationErrors.allInnerTexts();
    expect(errors.some((e) => /required/i.test(e))).toBe(true);
  });

  // ── P1: TC-304 — Empty To Date auto-populates from From Date ─────────────

  test('TC-LVE-ASN-304 — Empty To Date is auto-populated with From Date value', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    // Fill only From Date; OrangeHRM auto-populates To Date = From Date (no Required error fires)
    await assignLeavePage.fillFromDate(dates.autoToDate);
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-401 — Holiday excluded from working day count ──────────────────

  test('TC-LVE-ASN-401 — Holiday excluded from day count', async ({
    assignLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    const balanceBefore = await entApi.getEntitlementBalance(assignEmpNumber, leaveTypes.annual.id);

    // Mon → Fri: 5 weekdays minus the seeded holiday (Thu) = 4 consumed
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.holidayFrom);
    await assignLeavePage.fillToDate(dates.holidayTo);
    await assignLeavePage.waitForFormReady();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const balanceAfter = await entApi.getEntitlementBalance(assignEmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(expectedConsumed.holiday);
  });

  // ── P1: TC-402 — Assign exactly remaining balance (boundary) ─────────────

  test('TC-LVE-ASN-402 — Assign exactly remaining Casual Leave balance (boundary)', async ({
    assignLeavePage,
  }) => {
    // 2 days Casual Leave entitlement given in beforeAll; assign exactly 2 days (Wed–Thu)
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.casual.label);
    await assignLeavePage.fillFromDate(dates.casualFrom);
    await assignLeavePage.fillToDate(dates.casualTo);
    await assignLeavePage.waitForFormReady();
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P0: TC-201 — ESS user cannot access Assign Leave ─────────────────────

  test('TC-LVE-ASN-201 — ESS user cannot access Assign Leave page', async ({
    page, assignLeavePage,
  }) => {
    // Clear session cookies to log out the current admin user
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(essUser.username, essUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await page.goto(leave.routes.assignLeave, { waitUntil: 'domcontentloaded' });

    await expect(assignLeavePage.pageHeading).not.toBeVisible({ timeout: 5_000 });
  });

  // ── P1: TC-502 — Leave Balance updates once all required fields are filled ────

  test('TC-LVE-ASN-502 — Leave Balance updates after employee, leave type and dates are filled', async ({
    assignLeavePage,
  }) => {
    // Initially: balance shows 0.00
    const balanceInitial = await assignLeavePage.getLeaveBalance();
    expect(balanceInitial).toContain('0.00');

    // After all required fields: balance reflects actual entitlement (> 0)
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.balanceUpdate);
    await assignLeavePage.fillToDate(dates.balanceUpdate);
    // Wait for balance API to respond and update the DOM
    await expect(assignLeavePage.leaveBalanceText).not.toContainText('0.00', { timeout: 8_000 });
    expect(await assignLeavePage.getLeaveBalanceDays()).toBeGreaterThan(0);
  });

  // ── P1: TC-507 — Success toast appears after assign ───────────────────────

  test('TC-LVE-ASN-507 — Success toast appears after assign', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(assignFullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.successToast);
    await assignLeavePage.fillToDate(dates.successToast);
    await assignLeavePage.waitForDurationDropdown();

    await assignLeavePage.assignButton.click();
    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // P2 — Moderate Impact (secondary flows, edge cases). Uses the dedicated
  // `employees.p2` (Annual = 15, Casual = 3). Deferred: TC-307 (terminated
  // employee) and TC-403 (pending+approved escrow) — need new API infra.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── P2: TC-501 — Page renders correctly for Admin ─────────────────────────

  test('TC-LVE-ASN-501 — Assign Leave page renders all key controls for Admin', async ({
    assignLeavePage,
  }) => {
    await expect(assignLeavePage.pageHeading).toBeVisible();
    await expect(assignLeavePage.employeeNameInput).toBeVisible();
    await expect(assignLeavePage.leaveTypeDropdown).toBeVisible();
    await expect(assignLeavePage.fromDateInput).toBeVisible();
    await expect(assignLeavePage.toDateInput).toBeVisible();
    await expect(assignLeavePage.commentsTextarea).toBeVisible();
    await expect(assignLeavePage.assignButton).toBeVisible();
  });

  // ── P2: TC-508 — "Assign Leave" menu visible only for Admin/Supervisor ────

  test('TC-LVE-ASN-508 — Assign Leave menu shows for Admin but not for ESS', async ({
    page, assignLeavePage,
  }) => {
    const assignTab = page.locator('.oxd-topbar-body-nav-tab').filter({ hasText: 'Assign Leave' });
    // Admin (logged in via beforeEach) sees the Assign Leave tab
    await expect(assignTab).toBeVisible();

    // ESS user does not
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(essUser.username, essUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.goto('/web/index.php/leave/viewLeaveModule', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('.oxd-topbar-body-nav-tab').filter({ hasText: 'Assign Leave' }),
    ).toHaveCount(0);
  });

  // ── P2: TC-506 — Employee autocomplete shows suggestions on typing ────────

  test('TC-LVE-ASN-506 — Employee autocomplete shows suggestions while typing', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.typeEmployee(p2FullName);
    await expect(assignLeavePage.employeeOption(p2FullName)).toBeVisible({ timeout: 10_000 });
  });

  // ── P2: TC-503 — Duration dropdown shows the correct options ──────────────

  test('TC-LVE-ASN-503 — Duration dropdown lists all duration options', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2Single);
    await assignLeavePage.fillToDate(dates.p2Single);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.openDuration();

    for (const option of ['Full Day', 'Half Day - Morning', 'Half Day - Afternoon', 'Specify Time']) {
      await expect(assignLeavePage.durationOption(option)).toBeVisible();
    }
  });

  // ── P2: TC-504 — Time fields appear only when "Specify Time" is selected ──

  test('TC-LVE-ASN-504 — Time fields render only for Specify Time duration', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2Single);
    await assignLeavePage.fillToDate(dates.p2Single);
    await assignLeavePage.waitForDurationDropdown();

    // Default (Full Day) → no time fields
    await expect(assignLeavePage.fromTimeInput).toHaveCount(0);
    await expect(assignLeavePage.toTimeInput).toHaveCount(0);

    // Specify Time → both time fields appear
    await assignLeavePage.selectDuration(leave.duration.specifyTime);
    await expect(assignLeavePage.fromTimeInput).toBeVisible();
    await expect(assignLeavePage.toTimeInput).toBeVisible();
  });

  // ── P2: TC-006 — Admin assigns leave with a comment ───────────────────────

  test('TC-LVE-ASN-006 — Admin assigns leave with a comment', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2Comment);
    await assignLeavePage.fillToDate(dates.p2Comment);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.fillComment(leave.samples.assignComment);
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P2: TC-008 — Balance widget updates when leave type changes ───────────

  test('TC-LVE-ASN-008 — Leave Balance updates when the leave type changes', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2Single);
    await assignLeavePage.fillToDate(dates.p2Single);
    await expect(assignLeavePage.leaveBalanceText).not.toContainText('0.00', { timeout: 8_000 });
    const annualBalance = await assignLeavePage.getLeaveBalanceDays(); // ~15

    // Switch to Casual (entitlement 3) — the balance must change
    await assignLeavePage.selectLeaveType(leaveTypes.casual.label);
    await expect(async () => {
      expect(await assignLeavePage.getLeaveBalanceDays()).not.toBe(annualBalance);
    }).toPass({ timeout: 8_000 });
  });

  // ── P2: TC-505 — Balance widget updates when the date range changes ───────

  test('TC-LVE-ASN-505 — Leave Balance reflects the selected date range/period', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);

    // In-period date → balance reflects the entitlement (> 0 days)
    await assignLeavePage.fillFromDate(dates.p2Single);
    await assignLeavePage.fillToDate(dates.p2Single);
    await expect(assignLeavePage.leaveBalanceText).not.toContainText('0.00', { timeout: 8_000 });
    const inPeriodBalance = await assignLeavePage.getLeaveBalance();

    // Out-of-period date (2027, no entitlement) → the widget updates to reflect
    // the insufficient balance for that period (OrangeHRM shows "Balance not sufficient").
    await assignLeavePage.fillFromDate(dates.p2OutOfPeriod);
    await assignLeavePage.fillToDate(dates.p2OutOfPeriod);
    await expect(assignLeavePage.leaveBalanceText).toContainText(/Balance not sufficient|0\.00/i, {
      timeout: 8_000,
    });
    expect(await assignLeavePage.getLeaveBalance()).not.toBe(inPeriodBalance);
  });

  // ── P2: TC-108 — Half-day duration consumes 0.5 days ──────────────────────

  test('TC-LVE-ASN-108 — Half-day leave consumes 0.5 days from the balance', async ({
    assignLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    // The Assign Leave form shows the entitlement balance (not a live 0.50);
    // the half-day computation is verified by the balance it consumes on save.
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const balanceBefore = await entApi.getEntitlementBalance(p2EmpNumber, leaveTypes.annual.id);

    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2HalfDay);
    await assignLeavePage.fillToDate(dates.p2HalfDay);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.selectDuration(leave.duration.firstHalf);
    await assignLeavePage.assign();

    await expect(assignLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const balanceAfter = await entApi.getEntitlementBalance(p2EmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(0.5);
  });

  // ── P2: TC-306 — Weekend-only range results in 0 working days ─────────────

  test('TC-LVE-ASN-306 — Weekend-only date range consumes no working days', async ({
    assignLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const balanceBefore = await entApi.getEntitlementBalance(p2EmpNumber, leaveTypes.annual.id);

    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2WeekendFrom); // Sat
    await assignLeavePage.fillToDate(dates.p2WeekendTo); // Sun
    await assignLeavePage.assignButton.click();

    // Whether OrangeHRM blocks the assign or records 0 days, no working day is consumed.
    await Promise.race([
      assignLeavePage.successToast.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {}),
      assignLeavePage.errorToast.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {}),
    ]);
    const balanceAfter = await entApi.getEntitlementBalance(p2EmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(0);
  });

  // ── P2: TC-107 — Specify Time reveals required From/To time fields ────────

  test('TC-LVE-ASN-107 — Specify Time reveals the required From/To time fields', async ({
    assignLeavePage,
  }) => {
    await assignLeavePage.selectEmployee(p2FullName);
    await assignLeavePage.selectLeaveType(leaveTypes.annual.label);
    await assignLeavePage.fillFromDate(dates.p2Single);
    await assignLeavePage.fillToDate(dates.p2Single);
    await assignLeavePage.waitForDurationDropdown();
    await assignLeavePage.selectDuration(leave.duration.specifyTime);

    // Both required time inputs are present and pre-populated with a valid window
    await expect(assignLeavePage.fromTimeInput).toBeVisible();
    await expect(assignLeavePage.toTimeInput).toBeVisible();
    await expect(assignLeavePage.fromTimeInput).not.toHaveValue('');
    await expect(assignLeavePage.toTimeInput).not.toHaveValue('');
  });
});
