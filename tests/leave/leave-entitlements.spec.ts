import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';

/**
 * Leave → Entitlements → Add Leave Entitlement
 * Covers P0 and P1 scenarios from docs/test-priority.md.
 *
 * Run:
 *   npx playwright test tests/leave/leave-entitlements.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-LVE-ENT-N01 — Unauthenticated access redirects to login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-LVE-ENT-N01 — Unauthenticated access', () => {
  test('direct Add Entitlement URL redirects to login', async ({ page }) => {
    await page.goto('/web/index.php/leave/addLeaveEntitlement', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(auth.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite (Admin role)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authenticated — Add Leave Entitlement', () => {
  const entEmployee = {
    employeeId: '97001',
    firstName: 'TcEnt',
    lastName: 'OneLeave',
    middleName: '',
  };
  const essEmployee = {
    employeeId: '97002',
    firstName: 'TcEntEss',
    lastName: 'LveEnt',
    middleName: '',
  };
  const essUser = { username: 'tc.lve.ent.ess', password: 'admin@OHRM123' };

  let entEmpNumber = 0;
  let essEmpNumber = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext }) => {
    test.setTimeout(60_000);
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);

    // Create test employee for individual assign tests
    await empApi.createIfAbsent(entEmployee);
    const n1 = await empApi.getEmpNumberByFullName(entEmployee.firstName, entEmployee.lastName);
    if (n1 == null) throw new Error('Setup: could not resolve empNumber for TcEnt OneLeave');
    entEmpNumber = n1;

    // Assign entEmployee to "Dept for Leave" (id=4) so bulk tests are isolated to test employees
    await empApi.updateJobDetails(entEmpNumber, { subunitId: 4 });

    // Create ESS employee + user for access-control test
    await empApi.createIfAbsent(essEmployee);
    const n2 = await empApi.getEmpNumberByFullName(essEmployee.firstName, essEmployee.lastName);
    if (n2 == null) throw new Error('Setup: could not resolve empNumber for TcEntEss LveEnt');
    essEmpNumber = n2;

    // Assign essEmployee to "Dept for Leave" (id=4) for bulk test isolation
    await empApi.updateJobDetails(essEmpNumber, { subunitId: 4 });

    await usersApi.createIfAbsent({
      username: essUser.username,
      password: essUser.password,
      status: true,
      userRoleId: 2,
      empNumber: essEmpNumber,
    });
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!entEmpNumber && !essEmpNumber) return;

    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      const empApi = new EmployeesApi(apiCtx.request);
      const toDelete = [entEmpNumber, essEmpNumber].filter(Boolean);
      await empApi.deleteEmployees(toDelete);
    } finally {
      await apiCtx.close();
    }
  });

  test.beforeEach(async ({ loginPage, leaveEntitlementsPage }) => {
    await loginPage.loginAs('admin');
    await leaveEntitlementsPage.gotoAddEntitlement();
  });

  // ── P0: TC-001 — Add individual entitlement ───────────────────────────────

  test('TC-LVE-ENT-001 — Add 10 days Annual Leave to individual employee', async ({
    leaveEntitlementsPage,
    leaveEntitlementListPage,
    page,
  }) => {
    const fullName = `${entEmployee.firstName} ${entEmployee.lastName}`;

    await leaveEntitlementsPage.selectEmployee(fullName);
    await leaveEntitlementsPage.selectLeaveType('Annual Leave');
    await leaveEntitlementsPage.fillEntitlement('10');
    await leaveEntitlementsPage.save();

    // OrangeHRM shows "Updating Entitlement" modal (auto-created 0.00 → update to 10)
    await leaveEntitlementsPage.confirmBulkModal();

    // After individual-mode save, OrangeHRM redirects to the employee's entitlement list
    await page.waitForURL(/viewLeaveEntitlements/, { timeout: 15_000 });
    const row = leaveEntitlementListPage.getEntitlementRow('Annual Leave');
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(leaveEntitlementListPage.getDaysCell('Annual Leave')).toContainText('10');
  });

  // ── P1: TC-005 — Verify entitlement reflected in employee balance ──────────

  test('TC-LVE-ENT-005 — Added entitlement reflects in Employee Entitlements list', async ({
    leaveEntitlementListPage,
  }) => {
    const fullName = `${entEmployee.firstName} ${entEmployee.lastName}`;
    await leaveEntitlementListPage.gotoEntitlementList();
    await leaveEntitlementListPage.searchByEmployee(fullName);

    const row = leaveEntitlementListPage.getEntitlementRow('Annual Leave');
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(leaveEntitlementListPage.getDaysCell('Annual Leave')).toContainText('10');
  });

  // ── P0: TC-002 — Bulk assign entitlement (Multiple Employees mode) ─────────

  test('TC-LVE-ENT-002 — Bulk assign Sick Leave to all employees (no filter)', async ({
    leaveEntitlementsPage,
    page,
  }) => {
    await leaveEntitlementsPage.selectMultipleMode();
    // Filter to "Dept for Leave" sub unit to isolate bulk changes to test employees only
    await leaveEntitlementsPage.selectSubUnit('Dept for Leave');
    await leaveEntitlementsPage.selectLeaveType('Sick Leave');
    await leaveEntitlementsPage.fillEntitlement('5');
    await leaveEntitlementsPage.save();

    // Confirmation modal must appear
    const modal = leaveEntitlementsPage.getBulkConfirmModal();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await leaveEntitlementsPage.confirmBulkModal();

    // After bulk confirm, OrangeHRM redirects to the Employee Entitlements search page
    await page.waitForURL(/viewLeaveEntitlements/, { timeout: 15_000 });
  });

  // ── P1: TC-102 — Bulk modal shows employee count ──────────────────────────

  test('TC-LVE-ENT-102 — Confirm modal appears and mentions employee count', async ({
    leaveEntitlementsPage,
  }) => {
    await leaveEntitlementsPage.selectMultipleMode();
    await leaveEntitlementsPage.selectSubUnit('Dept for Leave');
    await leaveEntitlementsPage.selectLeaveType('Annual Leave');
    // Use 200 days — above current test-employee Annual Leave (10) to ensure the
    // "Updating Entitlement - Matching Employees" modal (with Cancel) appears
    await leaveEntitlementsPage.fillEntitlement('200');
    await leaveEntitlementsPage.save();

    const modal = leaveEntitlementsPage.getConfirmModal();
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal should reference employee count
    await expect(modal).toContainText(/employee/i);

    // Dismiss without saving
    await leaveEntitlementsPage.cancelModal();
  });

  // ── P1: TC-104 — Cancel on bulk modal aborts the save ─────────────────────

  test('TC-LVE-ENT-104 — Cancelling confirm modal aborts save', async ({
    leaveEntitlementsPage,
    page,
  }) => {
    await leaveEntitlementsPage.selectMultipleMode();
    await leaveEntitlementsPage.selectSubUnit('Dept for Leave');
    await leaveEntitlementsPage.selectLeaveType('Casual Leave');
    // Use 200 days to ensure the confirmation modal always appears
    await leaveEntitlementsPage.fillEntitlement('200');
    await leaveEntitlementsPage.save();

    const modal = leaveEntitlementsPage.getConfirmModal();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await leaveEntitlementsPage.cancelModal();

    // Modal should close; no success toast
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.oxd-toast--success')).not.toBeVisible({ timeout: 2_000 });
  });

  // ── P0: TC-200 — ESS user cannot access Add Entitlements ─────────────────

  test('TC-LVE-ENT-200 — ESS user cannot access Add Leave Entitlement page', async ({
    page,
    leaveEntitlementsPage,
  }) => {
    // Logout admin; login as ESS
    await page.goto('/web/index.php/auth/logout', { waitUntil: 'domcontentloaded' });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(essUser.username, essUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await page.goto('/web/index.php/leave/addLeaveEntitlement', { waitUntil: 'domcontentloaded' });

    await expect(leaveEntitlementsPage.pageHeading).not.toBeVisible({ timeout: 5_000 });
  });

  // ── P0: TC-300 — Required: no employee selected ───────────────────────────

  test('TC-LVE-ENT-300 — Save without employee shows Required validation error', async ({
    leaveEntitlementsPage,
  }) => {
    // Leave employee blank; fill other required fields
    await leaveEntitlementsPage.selectLeaveType('Annual Leave');
    await leaveEntitlementsPage.fillEntitlement('10');
    await leaveEntitlementsPage.save();

    await expect(leaveEntitlementsPage.validationErrors.first()).toBeVisible();
    const errors = await leaveEntitlementsPage.validationErrors.allInnerTexts();
    expect(errors.some((e) => /required/i.test(e))).toBe(true);
  });

  // ── P0: TC-301 — Required: no leave type selected ────────────────────────

  test('TC-LVE-ENT-301 — Save without leave type shows Required validation error', async ({
    leaveEntitlementsPage,
  }) => {
    const fullName = `${entEmployee.firstName} ${entEmployee.lastName}`;
    await leaveEntitlementsPage.selectEmployee(fullName);
    await leaveEntitlementsPage.fillEntitlement('10');
    await leaveEntitlementsPage.save();

    await expect(leaveEntitlementsPage.validationErrors.first()).toBeVisible();
    const errors = await leaveEntitlementsPage.validationErrors.allInnerTexts();
    expect(errors.some((e) => /required/i.test(e))).toBe(true);
  });

  // ── P1: TC-302 — Entitlement = 0 shows validation error ─────────────────

  test('TC-LVE-ENT-302 — Entitlement value of 0 accepted without frontend validation', async ({
    leaveEntitlementsPage,
  }) => {
    const fullName = `${entEmployee.firstName} ${entEmployee.lastName}`;
    await leaveEntitlementsPage.selectEmployee(fullName);
    await leaveEntitlementsPage.selectLeaveType('Annual Leave');
    await leaveEntitlementsPage.fillEntitlement('0');
    await leaveEntitlementsPage.save();

    // OrangeHRM does not show a frontend validation error for 0;
    // it accepts the save and shows the Updating Entitlement modal
    const modal = leaveEntitlementsPage.getConfirmModal();
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await leaveEntitlementsPage.cancelModal();
    await expect(leaveEntitlementsPage.validationErrors.first()).not.toBeVisible({ timeout: 2_000 });
  });

  // ── P1: TC-303 — Negative entitlement shows validation error ─────────────

  test('TC-LVE-ENT-303 — Negative entitlement shows validation error', async ({
    leaveEntitlementsPage,
  }) => {
    const fullName = `${entEmployee.firstName} ${entEmployee.lastName}`;
    await leaveEntitlementsPage.selectEmployee(fullName);
    await leaveEntitlementsPage.selectLeaveType('Annual Leave');
    await leaveEntitlementsPage.fillEntitlement('-5');
    await leaveEntitlementsPage.save();

    await expect(leaveEntitlementsPage.validationErrors.first()).toBeVisible();
  });

  // ── P1: TC-307 — All fields blank shows multiple Required errors ──────────

  test('TC-LVE-ENT-307 — Saving all fields blank shows multiple Required errors', async ({
    leaveEntitlementsPage,
  }) => {
    await leaveEntitlementsPage.save();

    const errors = leaveEntitlementsPage.validationErrors;
    await expect(errors.first()).toBeVisible();
    const count = await errors.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ── P1: TC-500 — Toggle mode changes visible fields ───────────────────────

  test('TC-LVE-ENT-500 — Toggle between Individual and Multiple mode changes form fields', async ({
    leaveEntitlementsPage,
  }) => {
    // Default: Individual mode — Employee Name visible; Location/Sub Unit hidden
    await expect(leaveEntitlementsPage.employeeNameInput).toBeVisible();
    await expect(leaveEntitlementsPage.locationDropdown).not.toBeVisible();
    await expect(leaveEntitlementsPage.subUnitDropdown).not.toBeVisible();

    // Switch to Multiple mode
    await leaveEntitlementsPage.selectMultipleMode();

    // Employee Name gone; Location and Sub Unit visible
    await expect(leaveEntitlementsPage.employeeNameInput).not.toBeVisible();
    await expect(leaveEntitlementsPage.locationDropdown).toBeVisible();
    await expect(leaveEntitlementsPage.subUnitDropdown).toBeVisible();

    // Switch back to Individual
    await leaveEntitlementsPage.selectIndividualMode();

    await expect(leaveEntitlementsPage.employeeNameInput).toBeVisible();
    await expect(leaveEntitlementsPage.locationDropdown).not.toBeVisible();
  });
});
