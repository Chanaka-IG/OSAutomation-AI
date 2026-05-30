import type { Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { LeaveRequestsApi } from '../../src/api/orangehrmOSAPI/LeaveRequestsApi';
import { AuthApi } from '../../src/api/orangehrmOSAPI/AuthApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { leaveActionData } from '../../test-data/leave/frontend/leaveAction';

/**
 * Leave → Leave List: Approve / Reject / Cancel actions on already-applied leave
 * (Admin & Supervisor). Implements P0 + P1 scenarios from
 * docs/test-priority_leave action on already applied leave as Supervisor or Admin.md.
 *
 * Serial mode. Three dedicated employees + ESS users are seeded once in beforeAll;
 * the employees self-apply Pending Approval requests (via their own API session) on
 * distinct, non-overlapping dates, so each test acts on its own request. Employees are
 * deleted in afterAll (which clears their leave requests).
 *
 * Run:
 *   npx playwright test tests/leave/leave-action.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 200_000 });

const {
  employees, subordinateUser, supervisorUser, otherUser, reportingMethodId,
  leaveTypes, entitlements, statusCode, statusLabel, dates, routes, urlPatterns,
} = leaveActionData;

const subName = `${employees.subordinate.firstName} ${employees.subordinate.lastName}`;
const supName = `${employees.supervisor.firstName} ${employees.supervisor.lastName}`;
const othName = `${employees.other.firstName} ${employees.other.lastName}`;

const annual = leaveTypes.annual;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-201 (P0) — Unauthenticated access redirects to login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-201 — Unauthenticated access', () => {
  test('TC-LVE-ACT-201 — direct Leave List URL redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(routes.leaveList, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Leave Action (Admin & Supervisor)', () => {
  let subEmp = 0;
  let supEmp = 0;
  let othEmp = 0;
  let cancelScheduledId = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext, playwright }) => {
    test.setTimeout(180_000);
    await orangehrmAdminApi.loginAsAdmin();

    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    // 0. Clean slate: drop any leftovers from a crashed prior run. A surviving employee
    //    keeps its old leave requests, so re-seeding the same dates would otherwise fail
    //    with "Overlapping leave requests found". Deleting the employee clears its requests.
    const stale: number[] = [];
    for (const e of [employees.subordinate, employees.supervisor, employees.other]) {
      const n = await empApi.getEmpNumberByEmployeeId(e.employeeId);
      if (n != null) stale.push(n);
    }
    if (stale.length) await empApi.deleteEmployees(stale);

    // 1. Employees
    await empApi.createIfAbsent(employees.subordinate);
    await empApi.createIfAbsent(employees.supervisor);
    await empApi.createIfAbsent(employees.other);

    const n1 = await empApi.getEmpNumberByFullName(employees.subordinate.firstName, employees.subordinate.lastName);
    const n2 = await empApi.getEmpNumberByFullName(employees.supervisor.firstName, employees.supervisor.lastName);
    const n3 = await empApi.getEmpNumberByFullName(employees.other.firstName, employees.other.lastName);
    if (n1 == null || n2 == null || n3 == null) {
      throw new Error('Setup: could not resolve empNumbers for the seeded employees');
    }
    subEmp = n1;
    supEmp = n2;
    othEmp = n3;

    // 2. Entitlements (Annual) for all three
    for (const empNumber of [subEmp, supEmp, othEmp]) {
      await entApi.createOrUpdateEntitlement({
        empNumber,
        leaveTypeId: annual.id,
        entitlement: entitlements.annualDays,
        fromDate: entitlements.fromDate,
        toDate: entitlements.toDate,
      });
    }

    // 3. ESS users (so each employee can self-apply → Pending Approval)
    await usersApi.createIfAbsent({
      username: subordinateUser.username, password: subordinateUser.password,
      status: true, userRoleId: subordinateUser.userRoleId, empNumber: subEmp,
    });
    await usersApi.createIfAbsent({
      username: supervisorUser.username, password: supervisorUser.password,
      status: true, userRoleId: supervisorUser.userRoleId, empNumber: supEmp,
    });
    await usersApi.createIfAbsent({
      username: otherUser.username, password: otherUser.password,
      status: true, userRoleId: otherUser.userRoleId, empNumber: othEmp,
    });

    // 4. subordinate → reports to supervisor (Direct)
    await empApi.addSupervisorIfAbsent(subEmp, supEmp, reportingMethodId);

    // 5. Seed Pending Approval requests by self-applying in each user's own session.
    const applyAs = async (
      username: string,
      password: string,
      requestDates: string[],
    ): Promise<Record<string, number>> => {
      const ctx = await playwright.request.newContext({
        baseURL: env.baseURL || undefined,
        extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      const map: Record<string, number> = {};
      try {
        await new AuthApi(ctx).login(username, password);
        const leaveApi = new LeaveRequestsApi(ctx);
        for (const d of requestDates) {
          map[d] = await leaveApi.apply({
            leaveTypeId: annual.id, fromDate: d, toDate: d, comment: `seed ${d}`,
          });
        }
      } finally {
        await ctx.dispose();
      }
      return map;
    };

    const subDates = [
      dates.approve, dates.reject, dates.cancel,
      dates.approveBalance, dates.rejectBalance, dates.cancelBalance,
      dates.actionsVisible, dates.toast, dates.statusUpdates,
      dates.cancelScheduled, dates.supApprove, dates.supReject,
    ];
    const subIds = await applyAs(subordinateUser.username, subordinateUser.password, subDates);
    cancelScheduledId = subIds[dates.cancelScheduled];

    await applyAs(supervisorUser.username, supervisorUser.password, [dates.supSelf]);
    await applyAs(otherUser.username, otherUser.password, [dates.otherPending]);

    // 6. TC-006 precondition: approve the cancel-scheduled request so it is "Scheduled".
    await new LeaveRequestsApi(orangehrmApiContext).action(cancelScheduledId, 'APPROVE');
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!subEmp && !supEmp && !othEmp) return;
    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      const empApi = new EmployeesApi(apiCtx.request);
      await empApi.deleteEmployees([subEmp, supEmp, othEmp].filter(Boolean));
    } finally {
      await apiCtx.close();
    }
  });

  // Default login: Admin, on the Leave List (auto-loads "Pending Approval").
  test.beforeEach(async ({ loginPage, leaveListPage }) => {
    await loginPage.loginAs('admin');
    await leaveListPage.gotoLeaveList();
  });

  /** Re-authenticate the browser as a non-admin user and land on the Leave List. */
  async function loginThen(page: Page, username: string, password: string): Promise<void> {
    await page.context().clearCookies();
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(username, password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  }

  // ── P0: TC-001 — Admin approves a Pending request → Scheduled ──────────────
  test('TC-LVE-ACT-001 — Admin approves a pending leave request (→ Scheduled)', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.approve);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const scheduled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.approve, dates.approve, statusCode.scheduled);
    expect(scheduled.some((r) => /Scheduled/i.test(r.status))).toBe(true);
  });

  // ── P0: TC-002 — Admin rejects a Pending request → Rejected ────────────────
  test('TC-LVE-ACT-002 — Admin rejects a pending leave request (→ Rejected)', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.rejectRow(dates.reject);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const rejected = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.reject, dates.reject, statusCode.rejected);
    expect(rejected.some((r) => /Rejected/i.test(r.status))).toBe(true);
  });

  // ── P0: TC-101 — Reject returns the escrowed balance ───────────────────────
  test('TC-LVE-ACT-101 — Rejecting a pending request returns the escrowed balance', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(subEmp, annual.id);

    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.rejectRow(dates.rejectBalance);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    const after = await entApi.getEntitlementBalance(subEmp, annual.id);
    expect(after - before).toBe(1);
  });

  // ── P0: TC-106 — Supervisor cannot self-approve own leave ──────────────────
  test('TC-LVE-ACT-106 — Supervisor cannot approve their own leave request', async ({
    page, leaveListPage, playwright,
  }) => {
    await loginThen(page, supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    // UI: the supervisor's own pending request is not approvable from the approval grid.
    await expect(leaveListPage.approveButton(dates.supSelf)).toHaveCount(0);

    // Authoritative check from the supervisor's own session: the request EXISTS and is
    // Pending, but APPROVE is not among its allowed actions (self-approval is blocked).
    const supCtx = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      await new AuthApi(supCtx).login(supervisorUser.username, supervisorUser.password);
      const own = await new LeaveRequestsApi(supCtx)
        .getByStatus(supEmp, dates.supSelf, dates.supSelf, statusCode.pending);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((r) => !r.allowedActions.includes('APPROVE'))).toBe(true);
    } finally {
      await supCtx.dispose();
    }
  });

  // ── P0: TC-200 — ESS user cannot access the Leave List ─────────────────────
  test('TC-LVE-ACT-200 — ESS user cannot access the Leave List', async ({
    page, leaveListPage,
  }) => {
    await loginThen(page, subordinateUser.username, subordinateUser.password);
    await page.goto(routes.leaveList, { waitUntil: 'domcontentloaded' });
    await expect(leaveListPage.pageHeading).toHaveCount(0);
  });

  // ── P1: TC-003 — Admin cancels a Pending request → Cancelled ───────────────
  test('TC-LVE-ACT-003 — Admin cancels a pending leave request (→ Cancelled)', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.cancelRow(dates.cancel);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const cancelled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.cancel, dates.cancel, statusCode.cancelled);
    expect(cancelled.some((r) => /Cancelled/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-006 — Admin cancels an approved (Scheduled) request → Cancelled ─
  test('TC-LVE-ACT-006 — Admin cancels an approved (Scheduled) leave request', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await leaveListPage.filterBy(subName, statusLabel.scheduled);
    await leaveListPage.cancelRow(dates.cancelScheduled);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const cancelled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.cancelScheduled, dates.cancelScheduled, statusCode.cancelled);
    expect(cancelled.some((r) => /Cancelled/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-004 — Supervisor approves a subordinate's pending request ───────
  test('TC-LVE-ACT-004 — Supervisor approves a subordinate pending request', async ({
    page, leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await loginThen(page, supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.supApprove);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const scheduled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.supApprove, dates.supApprove, statusCode.scheduled);
    expect(scheduled.some((r) => /Scheduled/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-005 — Supervisor rejects a subordinate's pending request ────────
  test('TC-LVE-ACT-005 — Supervisor rejects a subordinate pending request', async ({
    page, leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await loginThen(page, supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.rejectRow(dates.supReject);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const rejected = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.supReject, dates.supReject, statusCode.rejected);
    expect(rejected.some((r) => /Rejected/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-100 — Approving keeps the balance consumed (no re-deduct) ───────
  test('TC-LVE-ACT-100 — Approving a pending request leaves the balance consumed', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(subEmp, annual.id);

    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.approveBalance);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    const after = await entApi.getEntitlementBalance(subEmp, annual.id);
    expect(after - before).toBe(0);
  });

  // ── P1: TC-102 — Cancelling a pending request returns the escrowed balance ─
  test('TC-LVE-ACT-102 — Cancelling a pending request returns the escrowed balance', async ({
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(subEmp, annual.id);

    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.cancelRow(dates.cancelBalance);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    const after = await entApi.getEntitlementBalance(subEmp, annual.id);
    expect(after - before).toBe(1);
  });

  // ── P1: TC-202 — Supervisor cannot action a non-subordinate's request ──────
  test('TC-LVE-ACT-202 — Supervisor cannot see/action a non-subordinate leave request', async ({
    page, leaveListPage,
  }) => {
    await loginThen(page, supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    // The non-subordinate's pending request is outside the supervisor's scope — no row.
    await expect(leaveListPage.rowByText(othName)).toHaveCount(0);
  });

  // ── P1: TC-500 — Pending row exposes Approve / Reject / Cancel ─────────────
  test('TC-LVE-ACT-500 — Pending row exposes Approve, Reject and Cancel actions', async ({
    leaveListPage,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await expect(leaveListPage.approveButton(dates.actionsVisible)).toBeVisible();
    await expect(leaveListPage.rejectButton(dates.actionsVisible)).toBeVisible();

    await leaveListPage.openRowMenu(dates.actionsVisible);
    await expect(leaveListPage.cancelMenuItem(dates.actionsVisible)).toBeVisible();
  });

  // ── P1: TC-502 — Success toast appears after an action ─────────────────────
  test('TC-LVE-ACT-502 — Success toast appears after approving a request', async ({
    leaveListPage,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveButton(dates.toast).click();
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });
  });

  // ── P1: TC-503 — Row status label updates after the action ─────────────────
  test('TC-LVE-ACT-503 — Approved request moves to the Scheduled status in the list', async ({
    leaveListPage,
  }) => {
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.statusUpdates);
    await expect(leaveListPage.successToast).toBeVisible({ timeout: 10_000 });

    // Re-query the list filtered by the new status — the request now shows as Scheduled.
    await leaveListPage.gotoLeaveList();
    await leaveListPage.filterBy(subName, statusLabel.scheduled);
    await expect(leaveListPage.rowByText(dates.statusUpdates)).toBeVisible({ timeout: 10_000 });
  });
});
