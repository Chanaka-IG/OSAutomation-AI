import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { leave } from '../../test-data/leave/frontend/leave';
import { applyLeaveData } from '../../test-data/leave/frontend/applyLeave';

/**
 * Leave → Apply Leave (ESS)
 * Implements P0 + P1 scenarios from docs/test-priority.md (Apply Leave ESS).
 *
 * Serial mode; a single dedicated ESS employee + entitlements is seeded once in
 * beforeAll. Tests use distinct, non-overlapping dates and are deleted in afterAll.
 *
 * Run:
 *   npx playwright test tests/leave/apply-leave.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-201 (P0) — Unauthenticated access redirects to login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-201 — Unauthenticated access', () => {
  test('TC-LVE-APL-201 — direct Apply Leave URL redirects to login', async ({ page }) => {
    await page.goto('/web/index.php/leave/applyLeave', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/auth\/login/i, { timeout: 10_000 });
    await expect(page).toHaveURL(/auth\/login/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite (ESS role)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Apply Leave (ESS)', () => {
  const { employee, essUser, leaveTypes, entitlements, dates, expectedConsumed } = applyLeaveData;

  let essEmpNumber = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext }) => {
    test.setTimeout(120_000);
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    await empApi.createIfAbsent(employee);
    const n = await empApi.getEmpNumberByFullName(employee.firstName, employee.lastName);
    if (n == null) throw new Error(`Setup: could not resolve empNumber for ${employee.firstName} ${employee.lastName}`);
    essEmpNumber = n;

    await entApi.createOrUpdateEntitlement({
      empNumber: essEmpNumber,
      leaveTypeId: leaveTypes.annual.id,
      entitlement: entitlements.annualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });
    await entApi.createOrUpdateEntitlement({
      empNumber: essEmpNumber,
      leaveTypeId: leaveTypes.casual.id,
      entitlement: entitlements.casualDays,
      fromDate: entitlements.fromDate,
      toDate: entitlements.toDate,
    });

    await usersApi.createIfAbsent({
      username: essUser.username,
      password: essUser.password,
      status: true,
      userRoleId: essUser.userRoleId,
      empNumber: essEmpNumber,
    });
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!essEmpNumber) return;
    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      const empApi = new EmployeesApi(apiCtx.request);
      await empApi.deleteEmployees([essEmpNumber]);
    } finally {
      await apiCtx.close();
    }
  });

  test.beforeEach(async ({ page, loginPage, applyLeavePage }) => {
    await loginPage.open();
    await loginPage.login(essUser.username, essUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await applyLeavePage.gotoApplyLeave();
  });

  // ── P0: TC-001 — Full-day happy path ─────────────────────────────────────

  test('TC-LVE-APL-001 — ESS applies a full-day Annual Leave with sufficient balance', async ({
    applyLeavePage,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.fullDay);
    await applyLeavePage.fillToDate(dates.fullDay);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();

    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P0: TC-202 — No employee selector for ESS (self-only) ────────────────

  test('TC-LVE-APL-202 — Apply Leave page has no employee selector for ESS', async ({
    applyLeavePage,
  }) => {
    await expect(applyLeavePage.pageHeading).toBeVisible();
    await expect(applyLeavePage.employeeNameInput).toHaveCount(0);
  });

  // ── P0: TC-105 — Applied leave status is Pending Approval ────────────────

  test('TC-LVE-APL-105 — Applied leave status is Pending Approval', async ({
    applyLeavePage, page,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.statusPending);
    await applyLeavePage.fillToDate(dates.statusPending);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    await page.goto('/web/index.php/leave/viewMyLeaveList', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('.oxd-table-card').filter({ hasText: /Pending Approval/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── P0: TC-304 — Overlapping leave request is rejected ───────────────────

  test('TC-LVE-APL-304 — Overlapping leave request is rejected', async ({
    applyLeavePage, page,
  }) => {
    // First application succeeds
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.overlap);
    await applyLeavePage.fillToDate(dates.overlap);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    // Re-applying the same date overlaps the existing request. OrangeHRM does NOT
    // accept it — it surfaces the conflicting leave in an overlapping-records table
    // (e.g. "(1) Record Found") instead of saving a duplicate.
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.overlap);
    await applyLeavePage.fillToDate(dates.overlap);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.applyButton.click();

    await expect(
      page.locator('.oxd-table-card').filter({ hasText: dates.overlap }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(applyLeavePage.successToast).toHaveCount(0);
  });

  // ── P1: TC-002 — Multi-day leave ─────────────────────────────────────────

  test('TC-LVE-APL-002 — ESS applies a multi-day Annual Leave (Mon–Wed)', async ({
    applyLeavePage,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.multiDayFrom);
    await applyLeavePage.fillToDate(dates.multiDayTo);
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.apply();

    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-003 — Half-day morning ────────────────────────────────────────

  test('TC-LVE-APL-003 — ESS applies First Half (morning) leave', async ({
    applyLeavePage,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.firstHalf);
    await applyLeavePage.fillToDate(dates.firstHalf);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.selectDuration(leave.duration.firstHalf);
    await applyLeavePage.apply();

    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-004 — Half-day afternoon ──────────────────────────────────────

  test('TC-LVE-APL-004 — ESS applies Second Half (afternoon) leave', async ({
    applyLeavePage,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.secondHalf);
    await applyLeavePage.fillToDate(dates.secondHalf);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.selectDuration(leave.duration.secondHalf);
    await applyLeavePage.apply();

    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-007 — Applied leave appears in My Leave as Pending ────────────

  test('TC-LVE-APL-007 — Applied leave appears in My Leave list', async ({
    applyLeavePage, page,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.pendingList);
    await applyLeavePage.fillToDate(dates.pendingList);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    await page.goto('/web/index.php/leave/viewMyLeaveList', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.oxd-table-card').first()).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-101 — Balance widget updates after type + dates ───────────────

  test('TC-LVE-APL-101 — Leave Balance updates after leave type and dates are filled', async ({
    applyLeavePage,
  }) => {
    const initial = await applyLeavePage.getLeaveBalance();
    expect(initial).toContain('0.00');

    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.balanceCheck);
    await applyLeavePage.fillToDate(dates.balanceCheck);
    await expect(applyLeavePage.leaveBalanceText).not.toContainText('0.00', { timeout: 8_000 });
    expect(await applyLeavePage.getLeaveBalanceDays()).toBeGreaterThan(0);
  });

  // ── P1: TC-102 — Pending leave is escrowed (balance drops on apply) ──────

  test('TC-LVE-APL-102 — Pending leave reduces the available balance (escrow)', async ({
    applyLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const balanceBefore = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.annual.id);

    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.escrow);
    await applyLeavePage.fillToDate(dates.escrow);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const balanceAfter = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(1);
  });

  // ── P1: TC-103 — Weekend excluded from working-day count ─────────────────

  test('TC-LVE-APL-103 — Leave spanning weekends counts only working days', async ({
    applyLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const balanceBefore = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.annual.id);

    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.weekendFrom); // Fri
    await applyLeavePage.fillToDate(dates.weekendTo); // Mon
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const balanceAfter = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.annual.id);
    expect(balanceBefore - balanceAfter).toBe(expectedConsumed.weekend);
  });

  // ── P1: TC-203 — ESS cannot reach Admin Assign Leave ─────────────────────

  test('TC-LVE-APL-203 — ESS cannot access the Admin Assign Leave page', async ({ page }) => {
    await page.goto('/web/index.php/leave/assignLeave', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Assign Leave', exact: true }),
    ).toHaveCount(0);
  });

  // ── P1: TC-303 — Zero-balance leave type is blocked ──────────────────────

  test('TC-LVE-APL-303 — A leave type with no entitlement is not offered to the ESS user', async ({
    applyLeavePage, page,
  }) => {
    // The ESS Apply dropdown lists only leave types the employee is entitled to.
    // Annual (entitled) is available; Sick Leave (no entitlement) is not selectable.
    await applyLeavePage.leaveTypeDropdown.click();
    await expect(
      page.getByRole('option', { name: leaveTypes.annual.label, exact: true }),
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole('option', { name: leaveTypes.sick.label, exact: true }),
    ).toHaveCount(0);
  });

  // ── P1: TC-305 — Applying more than the available balance is blocked ─────

  test('TC-LVE-APL-305 — Applying more than the available balance is blocked', async ({
    applyLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const balanceBefore = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.casual.id);

    // Casual balance is 2 days; request 3 working days (Mon–Wed). The over-request
    // is rejected — attempt Apply without hanging (the button may be disabled) and
    // confirm no balance was consumed and no success toast fired.
    await applyLeavePage.selectLeaveType(leaveTypes.casual.label);
    await applyLeavePage.fillFromDate(dates.casualOverFrom);
    await applyLeavePage.fillToDate(dates.casualOverTo);
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.applyButton.click({ timeout: 5_000 }).catch(() => {});
    await applyLeavePage.waitUntilFormLoaderDissapear();

    await expect(applyLeavePage.successToast).toHaveCount(0);
    const balanceAfter = await entApi.getEntitlementBalance(essEmpNumber, leaveTypes.casual.id);
    expect(balanceAfter).toBe(balanceBefore);
  });

  // ── P1: TC-401 — Apply exactly the remaining balance (boundary) ──────────

  test('TC-LVE-APL-401 — ESS applies exactly the remaining Casual balance (boundary)', async ({
    applyLeavePage,
  }) => {
    // Casual balance is 2 days; apply exactly 2 working days (Thu–Fri)
    await applyLeavePage.selectLeaveType(leaveTypes.casual.label);
    await applyLeavePage.fillFromDate(dates.casualExactFrom);
    await applyLeavePage.fillToDate(dates.casualExactTo);
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.apply();

    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-505 — Success toast appears after apply ───────────────────────

  test('TC-LVE-APL-505 — Success toast appears after a successful apply', async ({
    applyLeavePage,
  }) => {
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.successToast);
    await applyLeavePage.fillToDate(dates.successToast);
    await applyLeavePage.waitForDurationDropdown();

    await applyLeavePage.applyButton.click();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });
  });
});
