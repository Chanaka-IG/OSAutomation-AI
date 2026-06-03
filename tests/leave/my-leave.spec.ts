import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { LeaveRequestsApi } from '../../src/api/orangehrmOSAPI/LeaveRequestsApi';
import { AuthApi } from '../../src/api/orangehrmOSAPI/AuthApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { myLeaveData } from '../../test-data/leave/frontend/myLeave';

/**
 * Leave → My Leave (ESS, `/leave/viewMyLeaveList`): an employee views/manages their OWN
 * leave. Implements the P0 + P1 scenarios from
 * docs/test-priority_My leave as ESS.md.
 *
 * Serial. One dedicated ESS employee + user is seeded once in beforeAll; it self-applies
 * Pending Approval requests on distinct, non-overlapping dates so each mutating test owns
 * its own request. The employee is deleted in afterAll (clearing its leave + login).
 *
 * Run:
 *   npx playwright test tests/leave/my-leave.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 200_000 });

const {
  employee, user, leaveType, entitlement, statusCode, statusLabel, dates, routes, urlPatterns,
  noEntitlementEmployee, noEntitlementUser, secondEntitlementDays, defaultRange,
  columns, allStatusOptions,
} = myLeaveData;

const ownName = `${employee.firstName} ${employee.lastName}`;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-201 (P0) — Unauthenticated access redirects to login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-201 — Unauthenticated access', () => {
  test('TC-LVE-MYL-201 — direct My Leave URL redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(routes.myLeaveList, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite (logged in as the dedicated ESS user)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('My Leave (ESS)', () => {
  let empNumber = 0;
  let noEntEmpNumber = 0;
  /** A second entitled leave type (with ZERO requests) resolved at runtime — for TC-304. */
  let secondTypeLabel = '';

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext, playwright }) => {
    test.setTimeout(180_000);
    await orangehrmAdminApi.loginAsAdmin();

    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    // Clean slate: a surviving employee keeps its old requests, so re-seeding the same
    // dates would fail with "Overlapping leave requests found". Deleting it clears them
    // (and cascades to the linked user).
    for (const e of [employee, noEntitlementEmployee]) {
      const s = await empApi.getEmpNumberByEmployeeId(e.employeeId);
      if (s != null) await empApi.deleteEmployees([s]);
    }

    // 1. Employee
    await empApi.createIfAbsent(employee);
    const n = await empApi.getEmpNumberByFullName(employee.firstName, employee.lastName);
    if (n == null) throw new Error('Setup: could not resolve empNumber for the seeded employee');
    empNumber = n;

    // 2. Entitlement (Annual) for the active period
    await entApi.createOrUpdateEntitlement({
      empNumber,
      leaveTypeId: leaveType.id,
      entitlement: entitlement.days,
      fromDate: entitlement.fromDate,
      toDate: entitlement.toDate,
    });

    // 2b. A SECOND entitled leave type with ZERO requests (so TC-304 can filter to an
    //     empty type). The My Leave Leave-Type filter only lists ENTITLED types, so we
    //     must grant an entitlement for it. Resolve a non-Annual type id at runtime.
    const ltRes = await orangehrmApiContext.get(
      '/web/index.php/api/v2/leave/leave-types?limit=50',
      { headers: { Accept: 'application/json' } },
    );
    if (ltRes.ok()) {
      const ltJson = (await ltRes.json()) as { data?: Array<{ id: number; name: string }> };
      const second = (ltJson.data ?? []).find((t) => t.id !== leaveType.id);
      if (second) {
        secondTypeLabel = second.name;
        await entApi.createOrUpdateEntitlement({
          empNumber,
          leaveTypeId: second.id,
          entitlement: secondEntitlementDays,
          fromDate: entitlement.fromDate,
          toDate: entitlement.toDate,
        });
      }
    }

    // 3. ESS user linked to the employee
    await usersApi.createIfAbsent({
      username: user.username, password: user.password, status: true,
      userRoleId: user.userRoleId, empNumber,
    });

    // 3b. A second employee with NO entitlement / NO requests (TC-401 empty state).
    await empApi.createIfAbsent(noEntitlementEmployee);
    const ne = await empApi.getEmpNumberByFullName(
      noEntitlementEmployee.firstName, noEntitlementEmployee.lastName,
    );
    if (ne == null) throw new Error('Setup: could not resolve empNumber for the no-entitlement employee');
    noEntEmpNumber = ne;
    await usersApi.createIfAbsent({
      username: noEntitlementUser.username, password: noEntitlementUser.password, status: true,
      userRoleId: noEntitlementUser.userRoleId, empNumber: noEntEmpNumber,
    });

    // 4. Self-apply the Pending requests in the user's own session.
    const ctx = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    let preCancelledId = 0;
    try {
      await new AuthApi(ctx).login(user.username, user.password);
      const leaveApi = new LeaveRequestsApi(ctx);
      // Single full-day requests
      for (const d of [dates.search, dates.cancel, dates.escrow, dates.dateRange]) {
        await leaveApi.apply({ leaveTypeId: leaveType.id, fromDate: d, toDate: d, comment: `seed ${d}` });
      }
      // Multi-day Fri→Mon range (weekend excluded → 2 working days)
      await leaveApi.apply({
        leaveTypeId: leaveType.id,
        fromDate: dates.weekendSpanFrom,
        toDate: dates.weekendSpanTo,
        comment: 'seed weekend span',
      });
      // A DEDICATED request that we cancel below so the terminal-state tests
      // (TC-108/TC-404) are self-contained — no longer dependent on TC-006/TC-104.
      preCancelledId = await leaveApi.apply({
        leaveTypeId: leaveType.id,
        fromDate: dates.preCancelled,
        toDate: dates.preCancelled,
        comment: 'seed pre-cancelled',
      });
    } finally {
      await ctx.dispose();
    }

    // Cancel the dedicated request via the ADMIN session (the action endpoint is the
    // Admin/Supervisor one). Mirrors the leave-action suite's setup pattern.
    if (preCancelledId) {
      await new LeaveRequestsApi(orangehrmApiContext).action(preCancelledId, 'CANCEL');
    }
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    const toDelete = [empNumber, noEntEmpNumber].filter(Boolean);
    if (toDelete.length === 0) return;
    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      await new EmployeesApi(apiCtx.request).deleteEmployees(toDelete);
    } finally {
      await apiCtx.close();
    }
  });

  // Default login: the dedicated ESS user, on the My Leave list.
  test.beforeEach(async ({ myLeavePage }) => {
    await myLeavePage.loginWithCredentials(user.username, user.password);
    await myLeavePage.gotoMyLeaveList();
  });

  // ── P0: TC-001 — Search own leave by status and see the request ────────────
  test('TC-LVE-MYL-001 — ESS searches own leave by status and sees the request', async ({
    myLeavePage,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();

    const row = myLeavePage.rowByText(dates.search);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Pending Approval/i);
    await expect(row).toContainText(ownName);
  });

  // ── P0: TC-102 — Self-scoped: no employee selector ─────────────────────────
  test('TC-LVE-MYL-102 — My Leave has no employee selector (self-only)', async ({
    myLeavePage,
  }) => {
    await expect(myLeavePage.employeeNameAutocomplete).toHaveCount(0);
  });

  // ── P0: TC-105 — No Approve/Reject on own leave (self-approval blocked) ─────
  test('TC-LVE-MYL-105 — own pending row exposes Cancel but not Approve/Reject', async ({
    myLeavePage,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();

    const row = myLeavePage.rowByText(dates.search);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Reject' })).toHaveCount(0);
  });

  // ── P0: TC-006 — ESS cancels own Pending Approval leave → Cancelled ─────────
  test('TC-LVE-MYL-006 — ESS cancels own pending leave (→ Cancelled)', async ({
    myLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    await myLeavePage.cancelRow(dates.cancel);
    await expect(myLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    await orangehrmAdminApi.loginAsAdmin();
    const cancelled = await new LeaveRequestsApi(orangehrmApiContext)
      .getByStatus(empNumber, dates.cancel, dates.cancel, statusCode.cancelled);
    expect(cancelled.some((r) => /Cancelled/i.test(r.status))).toBe(true);
  });

  // ── P1: TC-002 — Filter own leave by Leave Type ────────────────────────────
  test('TC-LVE-MYL-002 — filter own leave by Leave Type', async ({ myLeavePage }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.selectLeaveType(leaveType.label);
    await myLeavePage.search();

    const row = myLeavePage.rowByText(dates.search);
    await expect(row).toBeVisible();
    await expect(row).toContainText(leaveType.label);
  });

  // ── P1: TC-003 — Filter own leave by a date range ──────────────────────────
  test('TC-LVE-MYL-003 — filter own leave by date range', async ({ myLeavePage }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.setDateRange(dates.dateRange, dates.dateRange);
    await myLeavePage.search();

    await expect(myLeavePage.rowByText(dates.dateRange)).toBeVisible();
    await expect(myLeavePage.rowByText(dates.search)).toHaveCount(0);
  });

  // ── P1: TC-004 — Filter by multiple statuses at once ───────────────────────
  test('TC-LVE-MYL-004 — filter by multiple statuses returns matching rows', async ({
    myLeavePage,
  }) => {
    await myLeavePage.clearAllStatuses();
    await myLeavePage.addStatus(statusLabel.pending);
    await myLeavePage.addStatus(statusLabel.scheduled);
    await myLeavePage.search();

    await expect(myLeavePage.rowByText(dates.search)).toBeVisible();
    const labels = await myLeavePage.selectedStatusLabels();
    expect(labels).toEqual(expect.arrayContaining([statusLabel.pending, statusLabel.scheduled]));
  });

  // ── P1: TC-101 — "Show Leave with Status" is required ──────────────────────
  test('TC-LVE-MYL-101 — searching with no status selected is rejected', async ({
    myLeavePage,
  }) => {
    await myLeavePage.clearAllStatuses();
    await myLeavePage.searchButton.click();
    await expect(myLeavePage.statusRequiredError).toBeVisible();
    await expect(myLeavePage.statusRequiredError).toContainText(/Required/i);
  });

  // ── P1: TC-104 — Cancelling own pending leave restores the escrowed balance ─
  test('TC-LVE-MYL-104 — cancelling own pending leave returns the escrowed balance', async ({
    myLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const before = await entApi.getEntitlementBalance(empNumber, leaveType.id);

    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    await myLeavePage.cancelRow(dates.escrow);
    await expect(myLeavePage.successToast).toBeVisible({ timeout: 10_000 });

    const after = await entApi.getEntitlementBalance(empNumber, leaveType.id);
    expect(after - before).toBe(1);
  });

  // ── P1: TC-107 — Number of Days excludes the weekend ───────────────────────
  test('TC-LVE-MYL-107 — multi-day request excludes weekend days from the count', async ({
    myLeavePage,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();

    await expect(myLeavePage.rowByText(dates.weekendSpanFrom)).toBeVisible();
    // Fri→Mon = 2 working days (Sat/Sun excluded).
    expect(await myLeavePage.numberOfDaysFor(dates.weekendSpanFrom)).toBe('2.00');
  });

  // ── P1: TC-202 — Results contain only the logged-in employee's leave ───────
  test('TC-LVE-MYL-202 — My Leave returns only the own employee, never others', async ({
    myLeavePage,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();

    // Web-first wait: anchor on a known pending row so the grid has rendered before we
    // count (rows().count() does not auto-wait and would otherwise race the render).
    await expect(myLeavePage.rowByText(dates.search)).toBeVisible();
    const count = await myLeavePage.rows().count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const cell = myLeavePage.employeeNameCell(myLeavePage.rows().nth(i));
      await expect(cell).toContainText(ownName);
    }
  });

  // ── P1: TC-203 — ESS cannot reach the Admin/Supervisor Leave List ──────────
  test('TC-LVE-MYL-203 — ESS cannot access the Admin Leave List', async ({
    page, leaveListPage,
  }) => {
    await page.goto(routes.leaveList, { waitUntil: 'domcontentloaded' });
    await expect(leaveListPage.pageHeading).toHaveCount(0);
  });

  // ── P1: TC-501 — My Leave renders all search controls ──────────────────────
  test('TC-LVE-MYL-501 — My Leave renders all search controls (no employee field)', async ({
    myLeavePage,
  }) => {
    await expect(myLeavePage.pageHeading).toBeVisible();
    await expect(myLeavePage.fromDateInput).toBeVisible();
    await expect(myLeavePage.toDateInput).toBeVisible();
    await expect(myLeavePage.statusSelectText).toBeVisible();
    await expect(myLeavePage.leaveTypeDropdown).toBeVisible();
    await expect(myLeavePage.searchButton).toBeVisible();
    await expect(myLeavePage.resetButton).toBeVisible();
    await expect(myLeavePage.employeeNameAutocomplete).toHaveCount(0);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // P2 scenarios (docs/test-priority_My leave as ESS.md). Appended per request.
  // State at this point (serial): pending {08-03, 08-11, 08-07→08-10};
  // cancelled {08-04, 08-05} (cancelled earlier by TC-006/TC-104). No P2 mutates.
  // ───────────────────────────────────────────────────────────────────────────

  // ── P2: TC-005 — Open a request's detail via the row "⋮" menu ──────────────
  test('TC-LVE-MYL-005 — view leave details from the row menu', async ({ myLeavePage, page }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    await myLeavePage.openRowMenu(dates.search);
    await myLeavePage.rowMenuItem('View Leave Details').click();
    await expect(page).toHaveURL(/viewLeaveRequest/i);
  });

  // ── P2: TC-007 — Reset restores the default date filter ────────────────────
  test('TC-LVE-MYL-007 — Reset restores the default date range', async ({ myLeavePage }) => {
    // Scope: modify only the DATE filter and confirm Reset restores the default range.
    // The status multi-select is intentionally left untouched — its post-Reset chip count
    // proved non-deterministic across run contexts (green in isolation, flaky in the full
    // serial suite), so asserting it would make this test flaky. Date reset is stable.
    await myLeavePage.setDateRange(dates.resetProbeFrom, dates.resetProbeTo);
    await myLeavePage.reset();

    await expect(myLeavePage.fromDateInput).toHaveValue(defaultRange.fromDate);
    await expect(myLeavePage.toDateInput).toHaveValue(defaultRange.toDate);
  });

  // ── P2: TC-103 — A pending request shows the "Pending Approval" status ──────
  test('TC-LVE-MYL-103 — applied leave shows Pending Approval status', async ({ myLeavePage }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    await expect(myLeavePage.rowByText(dates.search)).toContainText(/Pending Approval/i);
  });

  // ── P2: TC-106 — Leave Balance column matches the API balance ──────────────
  test('TC-LVE-MYL-106 — Leave Balance column matches the entitlement balance', async ({
    myLeavePage, orangehrmAdminApi, orangehrmApiContext,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const apiBalance = await new LeaveEntitlementsApi(orangehrmApiContext)
      .getEntitlementBalance(empNumber, leaveType.id);

    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.selectLeaveType(leaveType.label);
    await myLeavePage.search();

    const cell = await myLeavePage.balanceFor(dates.search);
    expect(parseFloat(cell)).toBeCloseTo(apiBalance, 2);
  });

  // ── P2: TC-108 — A cancelled (terminal) request exposes no Cancel ──────────
  test('TC-LVE-MYL-108 — terminal (Cancelled) request is read-only', async ({ myLeavePage }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.cancelled);
    await myLeavePage.search();
    const row = myLeavePage.rowByText(dates.preCancelled);
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  });

  // ── P2: TC-301 — Searching with no status selected is rejected ─────────────
  test('TC-LVE-MYL-301 — search with no status selected shows Required', async ({ myLeavePage }) => {
    await myLeavePage.clearAllStatuses();
    await myLeavePage.searchButton.click();
    await expect(myLeavePage.statusRequiredError).toBeVisible();
    await expect(myLeavePage.statusRequiredError).toContainText(/Required/i);
  });

  // ── P2: TC-303 — A date range with no matching leave shows No Records ──────
  test('TC-LVE-MYL-303 — empty date range shows No Records Found', async ({ myLeavePage }) => {
    await myLeavePage.setDateRange(dates.emptyRangeFrom, dates.emptyRangeTo);
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    await expect(myLeavePage.noRecordsFound).toBeVisible();
    await expect(myLeavePage.rows()).toHaveCount(0);
  });

  // ── P2: TC-304 — A leave type with no requests shows No Records ────────────
  test('TC-LVE-MYL-304 — entitled leave type with no requests shows No Records', async ({
    myLeavePage,
  }) => {
    test.skip(!secondTypeLabel, 'No second entitled leave type available to filter by');
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.selectLeaveType(secondTypeLabel);
    await myLeavePage.search();
    await expect(myLeavePage.noRecordsFound).toBeVisible();
  });

  // ── P2: TC-401 — An employee with no entitlement sees an empty list ────────
  test('TC-LVE-MYL-401 — no-entitlement employee sees an empty My Leave list', async ({
    myLeavePage,
  }) => {
    await myLeavePage.loginWithCredentials(noEntitlementUser.username, noEntitlementUser.password);
    await myLeavePage.gotoMyLeaveList();
    await myLeavePage.search(); // all five statuses are selected by default
    await expect(myLeavePage.noRecordsFound).toBeVisible();
  });

  // ── P2: TC-402 — All statuses selected returns the full history ────────────
  test('TC-LVE-MYL-402 — all statuses returns pending and cancelled requests', async ({
    myLeavePage,
  }) => {
    await myLeavePage.search(); // default = all five statuses
    for (const d of [dates.search, dates.cancel, dates.escrow, dates.dateRange, dates.weekendSpanFrom]) {
      await expect(myLeavePage.rowByText(d)).toBeVisible();
    }
  });

  // ── P2: TC-403 — Default date range equals the current leave period ────────
  test('TC-LVE-MYL-403 — default date range is the current leave period', async ({ myLeavePage }) => {
    await expect(myLeavePage.fromDateInput).toHaveValue(defaultRange.fromDate);
    await expect(myLeavePage.toDateInput).toHaveValue(defaultRange.toDate);
  });

  // ── P2: TC-404 — Cancel is offered only on cancellable rows ────────────────
  test('TC-LVE-MYL-404 — Cancel appears on pending rows but not cancelled rows', async ({
    myLeavePage,
  }) => {
    await myLeavePage.search(); // default = all statuses
    await expect(myLeavePage.cancelButton(dates.search)).toBeVisible(); // pending
    await expect(myLeavePage.cancelButton(dates.preCancelled)).toHaveCount(0); // cancelled
  });

  // ── P2: TC-405 — Single-day vs multi-day Number of Days ────────────────────
  test('TC-LVE-MYL-405 — single-day counts 1.00, weekend-spanning range counts 2.00', async ({
    myLeavePage,
  }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    expect(await myLeavePage.numberOfDaysFor(dates.search)).toBe('1.00');
    expect(await myLeavePage.numberOfDaysFor(dates.weekendSpanFrom)).toBe('2.00');
  });

  // ── P2: TC-502 — Empty result renders "No Records Found" ───────────────────  
  test('TC-LVE-MYL-502 — empty search renders No Records Found', async ({ myLeavePage }) => {
    await myLeavePage.setDateRange(dates.emptyRangeFrom, dates.emptyRangeTo);
    await myLeavePage.search(); // default = all statuses
    await expect(myLeavePage.noRecordsFound).toBeVisible();
  });

  // ── P2: TC-504 — Status multi-select lists exactly the five statuses ───────
  test('TC-LVE-MYL-504 — status filter offers the five leave statuses', async ({ myLeavePage }) => {
    const options = await myLeavePage.statusOptionTexts();
    expect(options).toEqual(expect.arrayContaining([...allStatusOptions]));
    expect(options).toHaveLength(allStatusOptions.length);
  });

  // ── P2: TC-505 — Results grid shows the documented columns ─────────────────
  test('TC-LVE-MYL-505 — results grid shows the documented columns', async ({ myLeavePage }) => {
    await myLeavePage.selectOnlyStatus(statusLabel.pending);
    await myLeavePage.search();
    for (const col of columns) {
      await expect(myLeavePage.columnHeader(col)).toBeVisible();
    }
  });
});
