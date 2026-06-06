import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { LeaveRequestsApi } from '../../src/api/orangehrmOSAPI/LeaveRequestsApi';
import { LeaveTypesApi } from '../../src/api/orangehrmOSAPI/LeaveTypesApi';
import { SubunitsApi } from '../../src/api/orangehrmOSAPI/SubunitsApi';
import { AuthApi } from '../../src/api/orangehrmOSAPI/AuthApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { leaveE2eData } from '../../test-data/leave/frontend/leaveE2eLifecycle';

/**
 * Leave E2E lifecycle:
 *   Admin adds a leave entitlement → ESS sees it and applies leave →
 *   Admin / Supervisor actions the request (Approve / Reject / Cancel).
 *
 * Implements the P0 + P1 scenarios from
 * docs/test-priority_E2E test for Leave. Add Leave entitlement -> Assign entitlement
 * for ESS -> Apply leave as ESS -> Leave actions as Admin or supervisor.md
 *
 * Serial mode. Three dedicated employees + ESS users are seeded once in beforeAll
 * (the golden-path employee deliberately gets NO Annual entitlement — TC-001 creates
 * it through the UI). Employees are deleted in afterAll (which clears their requests).
 *
 * Run:
 *   npx playwright test tests/leave/leave-e2e-lifecycle.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 240_000 });

const {
  employees, essUser, subordinateUser, supervisorUser, reportingMethodId,
  leaveTypes, bulkSubUnit, entitlements, statusCode, statusLabel, dates,
  goldenDays, routes, urlPatterns,
} = leaveE2eData;

const essName = `${employees.ess.firstName} ${employees.ess.lastName}`;
const subName = `${employees.subordinate.firstName} ${employees.subordinate.lastName}`;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

test.describe('Leave E2E lifecycle (entitle → apply → action)', () => {
  let essEmp = 0;
  let subEmp = 0;
  let supEmp = 0;
  // Leave type ids are resolved by NAME at runtime — they differ between instances.
  let annualId = 0;
  let casualId = 0;
  // Sub unit for the bulk-assign test, also resolved at runtime (master data drifts).
  let bulkSubUnitId = 0;
  let bulkSubUnitName = '';

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext, playwright }) => {
    test.setTimeout(180_000);
    await orangehrmAdminApi.loginAsAdmin();

    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    // Resolve leave type ids by name (ids are instance-specific).
    const types = await new LeaveTypesApi(orangehrmApiContext).getAll();
    const idOf = (name: string): number => {
      const match = types.find((t) => t.name === name);
      if (!match) throw new Error(`Setup: leave type "${name}" not found on the instance`);
      return match.id;
    };
    annualId = idOf(leaveTypes.annual.label);
    casualId = idOf(leaveTypes.casual.label);

    // Suite-owned sub unit for the bulk assign — created if absent so the bulk
    // entitlement only ever reaches this suite's employees.
    const subunitsApi = new SubunitsApi(orangehrmApiContext);
    await subunitsApi.createIfAbsent({
      parentId: bulkSubUnit.parentId, unitId: bulkSubUnit.unitId,
      name: bulkSubUnit.label, description: 'Leave E2E lifecycle suite',
    });
    const subunitId = await subunitsApi.getIdByName(bulkSubUnit.label);
    if (!subunitId) throw new Error(`Setup: could not create/resolve subunit "${bulkSubUnit.label}"`);
    bulkSubUnitId = subunitId;
    bulkSubUnitName = bulkSubUnit.label;

    // 0. Clean slate — a surviving employee keeps its old leave requests, so re-seeding
    //    the same dates would fail with "Overlapping leave requests found".
    const stale: number[] = [];
    for (const e of [employees.ess, employees.subordinate, employees.supervisor]) {
      const n = await empApi.getEmpNumberByEmployeeId(e.employeeId);
      if (n != null) stale.push(n);
    }
    if (stale.length) await empApi.deleteEmployees(stale);

    // 1. Employees
    await empApi.createIfAbsent(employees.ess);
    await empApi.createIfAbsent(employees.subordinate);
    await empApi.createIfAbsent(employees.supervisor);

    const n1 = await empApi.getEmpNumberByFullName(employees.ess.firstName, employees.ess.lastName);
    const n2 = await empApi.getEmpNumberByFullName(employees.subordinate.firstName, employees.subordinate.lastName);
    const n3 = await empApi.getEmpNumberByFullName(employees.supervisor.firstName, employees.supervisor.lastName);
    if (n1 == null || n2 == null || n3 == null) {
      throw new Error('Setup: could not resolve empNumbers for the seeded employees');
    }
    essEmp = n1;
    subEmp = n2;
    supEmp = n3;

    // 2. Sub unit for the bulk-assign test (isolates TC-008 to test employees)
    await empApi.updateJobDetails(essEmp, { subunitId: bulkSubUnitId });
    await empApi.updateJobDetails(subEmp, { subunitId: bulkSubUnitId });

    // 3. Entitlements. The golden-path employee gets NO Annual on purpose (TC-001 adds
    //    it via the UI); Casual (2 days) backs the over-balance test. Subordinate and
    //    supervisor get Annual via API so they can self-apply pending requests.
    await entApi.createOrUpdateEntitlement({
      empNumber: essEmp, leaveTypeId: casualId,
      entitlement: entitlements.casualDays,
      fromDate: entitlements.fromDate, toDate: entitlements.toDate,
    });
    for (const empNumber of [subEmp, supEmp]) {
      await entApi.createOrUpdateEntitlement({
        empNumber, leaveTypeId: annualId,
        entitlement: entitlements.subAnnualDays,
        fromDate: entitlements.fromDate, toDate: entitlements.toDate,
      });
    }

    // 4. ESS users
    await usersApi.createIfAbsent({
      username: essUser.username, password: essUser.password,
      status: true, userRoleId: essUser.userRoleId, empNumber: essEmp,
    });
    await usersApi.createIfAbsent({
      username: subordinateUser.username, password: subordinateUser.password,
      status: true, userRoleId: subordinateUser.userRoleId, empNumber: subEmp,
    });
    await usersApi.createIfAbsent({
      username: supervisorUser.username, password: supervisorUser.password,
      status: true, userRoleId: supervisorUser.userRoleId, empNumber: supEmp,
    });

    // 5. subordinate → reports to supervisor (Direct)
    await empApi.addSupervisorIfAbsent(subEmp, supEmp, reportingMethodId);

    // 6. Pending requests for the action tests, self-applied in each user's own session.
    const applyAs = async (username: string, password: string, requestDates: string[]) => {
      const ctx = await playwright.request.newContext({
        baseURL: env.baseURL || undefined,
        extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      try {
        await new AuthApi(ctx).login(username, password);
        const leaveApi = new LeaveRequestsApi(ctx);
        for (const d of requestDates) {
          await leaveApi.apply({ leaveTypeId: annualId, fromDate: d, toDate: d, comment: `seed ${d}` });
        }
      } finally {
        await ctx.dispose();
      }
    };
    await applyAs(subordinateUser.username, subordinateUser.password, [
      dates.supApprove, dates.supReject, dates.selfCancel,
    ]);
    await applyAs(supervisorUser.username, supervisorUser.password, [dates.supSelf]);
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!essEmp && !subEmp && !supEmp) return;
    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      const empApi = new EmployeesApi(apiCtx.request);
      await empApi.deleteEmployees([essEmp, subEmp, supEmp].filter(Boolean));
    } finally {
      await apiCtx.close();
    }
  });

  // Session switching uses BasePage.loginWithCredentials / loginAs via the loginPage
  // fixture — both clear cookies first and wait until the app leaves the login page.

  // ── P0: TC-001 — Golden path: Admin entitles → ESS applies → Admin approves ──
  test('TC-LVE-E2E-001 — entitlement added via UI, ESS applies, Admin approves (→ Scheduled)', async ({
    loginPage, page, leaveEntitlementsPage, leaveEntitlementListPage, applyLeavePage, myLeavePage,
    leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    // Stage 1 — Admin adds the Annual entitlement through the Add Entitlement form.
    await loginPage.loginAs('admin');
    await leaveEntitlementsPage.gotoAddEntitlement();
    await leaveEntitlementsPage.selectEmployee(essName);
    await leaveEntitlementsPage.selectLeaveType(leaveTypes.annual.label);
    await leaveEntitlementsPage.fillEntitlement(entitlements.annualUiDays);
    await leaveEntitlementsPage.save();
    // OrangeHRM confirms with an "Updating Entitlement" dialog (0.00 → 15.00).
    await leaveEntitlementsPage.confirmModal();
    await page.waitForURL(urlPatterns.entitlementList, { timeout: 15_000 });
    await expect(leaveEntitlementListPage.getDaysCell(leaveTypes.annual.label))
      .toContainText(entitlements.annualUiDays);

    // Stage 2 — ESS sees the entitlement on Apply Leave and applies 2 working days.
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.goldenFrom);
    await applyLeavePage.fillToDate(dates.goldenTo);
    // Folded TC-500 — the balance widget reflects the new entitlement.
    await expect(applyLeavePage.leaveBalanceText).not.toContainText('0.00', { timeout: 8_000 });
    expect(await applyLeavePage.getLeaveBalanceDays()).toBeGreaterThan(0);
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.apply();
    // Folded TC-501 — success toast (never the page heading) confirms the apply.
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    // Stage 3 — the request shows in My Leave as Pending Approval.
    await myLeavePage.gotoMyLeaveList();
    await expect(
      myLeavePage.rowByText(dates.goldenFrom).filter({ hasText: statusLabel.pending }),
    ).toBeVisible({ timeout: 10_000 });

    // Stage 4 — Admin approves from the Leave List (auto-loads the Pending filter —
    // folded TC-502) and the approved row leaves the Pending grid (folded TC-503).
    await loginPage.loginAs('admin');
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(essName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.goldenFrom);
    await expect(leaveListPage.rowByText(dates.goldenFrom)).toHaveCount(0);

    // The request is now Scheduled under the Scheduled filter.
    await leaveListPage.gotoLeaveList();
    await leaveListPage.filterBy(essName, statusLabel.scheduled);
    await expect(leaveListPage.rowByText(dates.goldenFrom)).toBeVisible({ timeout: 10_000 });

    // Folded TC-504 — escrow retained on approval: balance = 15 − 2 = 13.
    await orangehrmAdminApi.loginAsAdmin();
    const balance = await new LeaveEntitlementsApi(orangehrmApiContext)
      .getEntitlementBalance(essEmp, annualId);
    expect(balance).toBe(Number(entitlements.annualUiDays) - goldenDays);
  });

  // ── P0: TC-304 — Overlapping re-apply shows the conflict panel, saves nothing ──
  // Chain dependency: requires TC-001 (the goldenFrom request must already exist).
  test('TC-LVE-E2E-304 — overlapping application surfaces the conflict panel (no duplicate)', async ({
    loginPage, applyLeavePage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.goldenFrom);
    await applyLeavePage.fillToDate(dates.goldenFrom);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.attemptApply();

    // The conflicting (now Scheduled) request is listed inline — no toast, no save.
    await expect(
      applyLeavePage.overlapConflictRow(dates.goldenFrom).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(applyLeavePage.successToast).toHaveCount(0);
  });

  // ── P0: TC-002 — ESS applies, Admin rejects → Rejected; escrow released ──────
  test('TC-LVE-E2E-002 — ESS applies and Admin rejects (→ Rejected, balance released)', async ({
    loginPage, applyLeavePage, leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    // ESS applies one day through the UI.
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.rejectPath);
    await applyLeavePage.fillToDate(dates.rejectPath);
    await applyLeavePage.waitForDurationDropdown();
    await applyLeavePage.apply();
    await expect(applyLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(essEmp, annualId);

    // Admin rejects from the Leave List.
    await loginPage.loginAs('admin');
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(essName);
    await leaveListPage.search();
    await leaveListPage.rejectRow(dates.rejectPath);

    const rejected = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(essEmp, dates.rejectPath, dates.rejectPath, statusCode.rejected);
    expect(rejected.some((r) => /Rejected/i.test(r.status))).toBe(true);
    expect(await entApi.getEntitlementBalance(essEmp, annualId) - before).toBe(1);
  });

  // ── P0: TC-003 — Admin cancels a pending request → Cancelled; escrow released ─
  test('TC-LVE-E2E-003 — Admin cancels a pending request (→ Cancelled, balance released)', async ({
    loginPage, leaveListPage, orangehrmAdminApi, orangehrmApiContext, playwright,
  }) => {
    // Seed the pending request by self-applying in the ESS user's own API session
    // (the UI apply path is already proven by TC-001/TC-002).
    const ctx = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      await new AuthApi(ctx).login(essUser.username, essUser.password);
      await new LeaveRequestsApi(ctx).apply({
        leaveTypeId: annualId, fromDate: dates.cancelPath, toDate: dates.cancelPath,
      });
    } finally {
      await ctx.dispose();
    }

    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(essEmp, annualId);

    await loginPage.loginAs('admin');
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(essName);
    await leaveListPage.search();
    await leaveListPage.cancelRow(dates.cancelPath);

    const cancelled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(essEmp, dates.cancelPath, dates.cancelPath, statusCode.cancelled);
    expect(cancelled.some((r) => /Cancelled/i.test(r.status))).toBe(true);
    expect(await entApi.getEntitlementBalance(essEmp, annualId) - before).toBe(1);
  });

  // ── P0: TC-004 — Supervisor approves a subordinate's pending request ─────────
  test('TC-LVE-E2E-004 — Supervisor approves a subordinate pending request (→ Scheduled)', async ({
    loginPage, leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await loginPage.loginWithCredentials(supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.approveRow(dates.supApprove);

    await orangehrmAdminApi.loginAsAdmin();
    const scheduled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.supApprove, dates.supApprove, statusCode.scheduled);
    expect(scheduled.some((r) => /Scheduled/i.test(r.status))).toBe(true);
  });

  // ── P0: TC-100 — Apply dropdown lists only entitled leave types ──────────────
  // Chain dependency: requires TC-001 (Annual entitlement created through the UI).
  test('TC-LVE-E2E-100 — a leave type with no entitlement is absent from the ESS dropdown', async ({
    loginPage, applyLeavePage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.openLeaveTypeDropdown();
    // Annual (entitled in TC-001) is offered; Sick (never entitled) is not an option.
    await expect(applyLeavePage.leaveTypeOption(leaveTypes.annual.label))
      .toBeVisible({ timeout: 8_000 });
    await expect(applyLeavePage.leaveTypeOption(leaveTypes.sick.label)).toHaveCount(0);
  });

  // ── P0: TC-104 — Applying beyond the available balance is blocked ────────────
  test('TC-LVE-E2E-104 — over-balance application is blocked (no request created)', async ({
    loginPage, applyLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(essEmp, casualId);

    // Casual balance is 2 days; request 3 working days. The balance widget is flaky
    // ("Balance not sufficient" vs "2.00 Day(s)") — assert the block via the API delta.
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.casual.label);
    await applyLeavePage.fillFromDate(dates.overFrom);
    await applyLeavePage.fillToDate(dates.overTo);
    await applyLeavePage.waitForFormReady();
    await applyLeavePage.attemptApply();

    await expect(applyLeavePage.successToast).toHaveCount(0);
    expect(await entApi.getEntitlementBalance(essEmp, casualId)).toBe(before);
  });

  // ── P0: TC-200 — ESS cannot reach the Add Entitlement page ───────────────────
  test('TC-LVE-E2E-200 — ESS user cannot access Add Leave Entitlement', async ({
    loginPage, page, leaveEntitlementsPage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await page.goto(routes.addEntitlement, { waitUntil: 'domcontentloaded' });
    await expect(leaveEntitlementsPage.pageHeading).not.toBeVisible({ timeout: 5_000 });
  });

  // ── P1: TC-005 — Supervisor rejects a subordinate's pending request ──────────
  test('TC-LVE-E2E-005 — Supervisor rejects a subordinate pending request (→ Rejected)', async ({
    loginPage, leaveListPage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await loginPage.loginWithCredentials(supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    await leaveListPage.searchByEmployee(subName);
    await leaveListPage.search();
    await leaveListPage.rejectRow(dates.supReject);

    await orangehrmAdminApi.loginAsAdmin();
    const rejected = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.supReject, dates.supReject, statusCode.rejected);
    expect(rejected.some((r) => /Rejected/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-108 — Self-approval is blocked for the supervisor's own leave ─────
  test('TC-LVE-E2E-108 — Supervisor cannot approve their own pending request', async ({
    loginPage, leaveListPage, playwright,
  }) => {
    await loginPage.loginWithCredentials(supervisorUser.username, supervisorUser.password);
    await leaveListPage.gotoLeaveList();
    // The supervisor's own pending request is not approvable from the approval grid.
    await expect(leaveListPage.approveButton(dates.supSelf)).toHaveCount(0);

    // Authoritative check from the supervisor's own session: the request exists,
    // is Pending, but APPROVE is not among its allowed actions.
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

  // ── P1: TC-006 — ESS cancels their own pending request from My Leave ─────────
  test('TC-LVE-E2E-006 — employee cancels own pending request from My Leave (→ Cancelled)', async ({
    loginPage, myLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await loginPage.loginWithCredentials(subordinateUser.username, subordinateUser.password);
    await myLeavePage.gotoMyLeaveList();
    await myLeavePage.cancelRow(dates.selfCancel);

    await orangehrmAdminApi.loginAsAdmin();
    const cancelled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(subEmp, dates.selfCancel, dates.selfCancel, statusCode.cancelled);
    expect(cancelled.some((r) => /Cancelled/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-302 — To Date before From Date is rejected inline ─────────────────
  test('TC-LVE-E2E-302 — To Date earlier than From Date shows a validation error', async ({
    loginPage, applyLeavePage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await applyLeavePage.gotoApplyLeave();
    await applyLeavePage.selectLeaveType(leaveTypes.annual.label);
    await applyLeavePage.fillFromDate(dates.badOrderFrom);
    await applyLeavePage.fillToDate(dates.badOrderTo);
    await applyLeavePage.attemptApply();

    await expect(applyLeavePage.validationErrors.first()).toBeVisible({ timeout: 8_000 });
    await expect(applyLeavePage.successToast).toHaveCount(0);
  });

  // ── P1: TC-007 — Updating an existing entitlement asks for confirmation ──────
  // Chain dependency: expects the subordinate's API-seeded 10-day Annual entitlement.
  test('TC-LVE-E2E-007 — updating an entitlement shows the confirmation dialog and saves', async ({
    loginPage, page, leaveEntitlementsPage, leaveEntitlementListPage,
  }) => {
    await loginPage.loginAs('admin');
    await leaveEntitlementsPage.gotoAddEntitlement();
    await leaveEntitlementsPage.selectEmployee(subName);
    await leaveEntitlementsPage.selectLeaveType(leaveTypes.annual.label);
    await leaveEntitlementsPage.fillEntitlement(entitlements.annualUpdatedDays);
    await leaveEntitlementsPage.save();

    // Updating an existing entitlement requires explicit confirmation. The update is
    // ADDITIVE: 10.00 existing + 12.00 entered → the dialog announces the 22.00 total.
    const modal = leaveEntitlementsPage.getConfirmModal();
    await expect(modal).toBeVisible({ timeout: 8_000 });
    await expect(modal).toContainText(/entitlement/i);
    await expect(modal).toContainText(entitlements.annualUpdatedTotal);
    await leaveEntitlementsPage.confirmModal();

    await page.waitForURL(urlPatterns.entitlementList, { timeout: 15_000 });
    await expect(leaveEntitlementListPage.getDaysCell(leaveTypes.annual.label))
      .toContainText(entitlements.annualUpdatedTotal);
  });

  // ── P1: TC-008 — Bulk-assign an entitlement to multiple employees ────────────
  test('TC-LVE-E2E-008 — bulk-assign entitlement by Sub Unit (Multiple Employees mode)', async ({
    loginPage, page, leaveEntitlementsPage, leaveEntitlementListPage,
  }) => {
    await loginPage.loginAs('admin');
    await leaveEntitlementsPage.gotoAddEntitlement();
    await leaveEntitlementsPage.selectMultipleMode();
    await leaveEntitlementsPage.selectSubUnit(bulkSubUnitName);
    // The matched-employee count loads asynchronously — saving before it resolves
    // races the confirmation-modal logic. Wait for the "matches (N) employees" hint.
    await expect(leaveEntitlementsPage.matchCountText).toBeVisible({ timeout: 10_000 });
    await leaveEntitlementsPage.selectLeaveType(leaveTypes.inLieu.label);
    await leaveEntitlementsPage.fillEntitlement(entitlements.bulkDays);
    await leaveEntitlementsPage.save();

    // Confirmation modal (mentions the affected employees) must precede the save.
    const modal = leaveEntitlementsPage.getConfirmModal();
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal).toContainText(/employee/i);
    await leaveEntitlementsPage.confirmModal();
    await page.waitForURL(urlPatterns.entitlementList, { timeout: 15_000 });

    // Each employee in the sub unit received the entitlement.
    await leaveEntitlementListPage.gotoEntitlementList();
    await leaveEntitlementListPage.searchByEmployee(essName);
    await expect(leaveEntitlementListPage.getDaysCell(leaveTypes.inLieu.label))
      .toContainText(entitlements.bulkDays);
  });
});
