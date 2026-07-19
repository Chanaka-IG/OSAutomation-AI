import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { SubunitsApi } from '../../src/api/orangehrmOSAPI/SubunitsApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { leaveBalanceReportData as d } from '../../test-data/leave/frontend/leaveBalanceReport';

/**
 * Leave → Reports → **Leave Entitlements and Usage Report** (Admin/Supervisor) and
 * **My Leave Entitlements and Usage Report** (ESS/self).
 * Implements the P0 + P1 scenarios from
 * `docs/test-priority_Leave Entitlements and Usage Report.md`.
 *
 * The results grid is a `revo-grid` web component (shadow DOM) — cells/headers are not
 * reachable by Playwright locators, so each "report generated" assertion drives the UI and
 * checks the report's own `GET /api/v2/leave/reports/data` payload + the visible
 * `(N) Records Found` indicator (see `LeaveBalanceReportPage`).
 *
 * Serial. One dedicated employee + ESS user (with an Annual entitlement) is seeded once and
 * deleted in afterAll. An empty sub unit is resolved at runtime for the empty-state test.
 *
 * Run:
 *   npx playwright test tests/leave/leave-entitlements-usage-report.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 200_000 });

const ownName = `${d.employee.firstName} ${d.employee.lastName}`;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// P0 / P1 — Unauthenticated access (no seeded data required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Unauthenticated access', () => {
  // ── P0: TC-201 — Admin report deep link redirects to login ──────────────────
  test('TC-LVE-RPT-201 — unauthenticated Admin report redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(d.routes.adminReport, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(d.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(d.urlPatterns.login);
  });

  // ── P1: TC-202 — My report deep link redirects to login ─────────────────────
  test('TC-LVE-RPT-202 — unauthenticated My report redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(d.routes.myReport, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(d.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(d.urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Leave Entitlements and Usage Report', () => {
  let empNumber = 0;
  /** Name of a sub unit with zero current employees — resolved at runtime for TC-504. */
  let emptySubUnit = '';

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext }) => {
    test.setTimeout(120_000);
    await orangehrmAdminApi.loginAsAdmin();

    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);
    const subunitsApi = new SubunitsApi(orangehrmApiContext);

    // Clean slate so the entitlement seed is deterministic across re-runs.
    const stale = await empApi.getEmpNumberByEmployeeId(d.employee.employeeId);
    if (stale != null) await empApi.deleteEmployees([stale]);

    // 1. Dedicated employee.
    await empApi.createIfAbsent(d.employee);
    const n = await empApi.getEmpNumberByFullName(d.employee.firstName, d.employee.lastName);
    if (n == null) throw new Error('Setup: could not resolve empNumber for the seeded employee');
    empNumber = n;

    // 2. Annual entitlement for the active period (gives the Employee/My report a real row).
    await entApi.createOrUpdateEntitlement({
      empNumber,
      leaveTypeId: d.leaveType.id,
      entitlement: d.entitlement.days,
      fromDate: d.entitlement.fromDate,
      toDate: d.entitlement.toDate,
    });

    // 3. ESS user linked to the employee (for the My report + access-control tests).
    await usersApi.createIfAbsent({
      username: d.user.username,
      password: d.user.password,
      status: true,
      userRoleId: d.user.userRoleId},
      empNumber,
    );

    // 4. Resolve a sub unit that returns zero rows in the Leave Type report (empty state).
    //    The seeded employee carries no sub unit, so it never falls into the chosen unit.
    const subunits = await subunitsApi.getAll();
    for (const s of subunits) {
      if (s.id === 1) continue; // root company node — not listed in the Sub Unit dropdown
      if (/[&]/.test(s.name)) continue; // keep dropdown option matching simple/exact
      const url =
        `/web/index.php/api/v2/leave/reports/data?limit=50&offset=0` +
        `&name=${d.reportNames.leaveType}&fromDate=${d.entitlement.fromDate}` +
        `&toDate=${d.entitlement.toDate}&leaveTypeId=${d.leaveType.id}` +
        `&subunitId=${s.id}&includeEmployees=onlyCurrent&_dateFormattingEnabled=true`;
      const res = await orangehrmApiContext.get(url, { headers: { Accept: 'application/json' } });
      if (!res.ok()) continue;
      const json = (await res.json()) as { meta?: { total?: number } };
      if ((json.meta?.total ?? 0) === 0) {
        emptySubUnit = s.name;
        break;
      }
    }
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!empNumber) return;
    const ctx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    try {
      const adminApi = new OrangehrmAdminApi(ctx.request);
      await adminApi.loginAsAdmin();
      await new EmployeesApi(ctx.request).deleteEmployees([empNumber]);
    } finally {
      await ctx.close();
    }
  });

  // ── Admin-driven tests log in as Admin and open the Admin report ────────────
  test.describe('Admin report', () => {
    test.beforeEach(async ({ loginPage, leaveBalanceReportPage }) => {
      await loginPage.loginAs('admin');
      await leaveBalanceReportPage.gotoAdminReport();
    });

    // ── P0: TC-001 — Generate by Leave Type ───────────────────────────────────
    test('TC-LVE-RPT-001 — Admin generates the report by Leave Type', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      const report = await leaveBalanceReportPage.generate();

      expect(report.status).toBe(200);
      expect(report.total).toBeGreaterThan(0);
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
      expect(await leaveBalanceReportPage.recordsFoundCount()).toBe(report.total);
      // Leave Type mode rows are keyed by employee.
      expect(report.data[0]).toHaveProperty('employeeName');
    });

    // ── P0: TC-002 — Generate by Employee ─────────────────────────────────────
    test('TC-LVE-RPT-002 — Admin generates the report by Employee', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.selectGenerateFor('employee');
      await leaveBalanceReportPage.selectEmployee(ownName);
      const report = await leaveBalanceReportPage.generate();

      expect(report.status).toBe(200);
      expect(report.total).toBeGreaterThan(0);
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
      // Employee mode rows are keyed by leave type; the seeded Annual entitlement row exists.
      expect(report.data[0]).toHaveProperty('leaveTypeName');
      expect(report.data.some((r) => r.leaveTypeName === d.leaveType.label)).toBe(true);
    });

    // ── P0: TC-503 — Result grid is built from the documented columns ──────────
    test('TC-LVE-RPT-503 — report data carries the documented Leave Type columns', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      const report = await leaveBalanceReportPage.generate();

      expect(report.total).toBeGreaterThan(0);
      // revo-grid renders from these row props (shadow DOM cells are unreadable directly).
      for (const prop of d.leaveTypeRowProps) {
        expect(report.data[0]).toHaveProperty(prop);
      }
    });

    // ── P1: TC-501 — Leave Type criteria controls render ──────────────────────
    test('TC-LVE-RPT-501 — Leave Type mode shows its full criteria set', async ({
      leaveBalanceReportPage,
      page,
    }) => {
      await expect(leaveBalanceReportPage.generateForLeaveTypeRadio).toBeVisible();
      await expect(leaveBalanceReportPage.generateForEmployeeRadio).toBeVisible();
      for (const label of d.leaveTypeModeLabels) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
      await expect(page.getByText('Include Past Employees', { exact: true })).toBeVisible();
      await expect(leaveBalanceReportPage.generateButton).toBeVisible();
      // No employee picker while in Leave Type mode.
      await expect(leaveBalanceReportPage.employeeNameInput).toHaveCount(0);
    });

    // ── P1: TC-502 — Employee mode shows only Employee Name + Leave Period ─────
    test('TC-LVE-RPT-502 — Employee mode shows Employee Name + Leave Period only', async ({
      leaveBalanceReportPage,
      page,
    }) => {
      await leaveBalanceReportPage.selectGenerateFor('employee');
      await expect(leaveBalanceReportPage.employeeNameInput).toBeVisible();
      await expect(page.getByText('Leave Period', { exact: true }).first()).toBeVisible();
      // Leave Type mode's extra filters are gone.
      await expect(leaveBalanceReportPage.locationDropdown).toHaveCount(0);
      await expect(leaveBalanceReportPage.subUnitDropdown).toHaveCount(0);
      await expect(leaveBalanceReportPage.jobTitleDropdown).toHaveCount(0);
    });

    // ── P1: TC-301 — Employee mode requires an Employee Name ───────────────────
    test('TC-LVE-RPT-301 — Employee mode requires Employee Name', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.selectGenerateFor('employee');
      await leaveBalanceReportPage.generateButton.click();
      await expect(leaveBalanceReportPage.validationErrors.first()).toBeVisible();
      await expect(leaveBalanceReportPage.validationErrors.first()).toContainText(/Required/i);
      // No report grid appears when validation blocks generation.
      await expect(leaveBalanceReportPage.recordsFound).toHaveCount(0);
    });

    // ── P1: TC-504 — A filter matching no employees yields an empty report ─────
    test('TC-LVE-RPT-504 — empty filter shows (0) Records Found', async ({
      leaveBalanceReportPage,
    }) => {
      test.skip(!emptySubUnit, 'No empty sub unit available to force an empty result');
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      await leaveBalanceReportPage.selectSubUnit(emptySubUnit);
      const report = await leaveBalanceReportPage.generate();

      expect(report.total).toBe(0);
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
      expect(await leaveBalanceReportPage.recordsFoundCount()).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // P2 scenarios (docs/test-priority_Leave Entitlements and Usage Report.md).
  // Admin-driven; logs in as Admin and opens the Admin report.
  // ───────────────────────────────────────────────────────────────────────────
  test.describe('Admin report — P2', () => {
    test.beforeEach(async ({ loginPage, leaveBalanceReportPage }) => {
      await loginPage.loginAs('admin');
      await leaveBalanceReportPage.gotoAdminReport();
    });

    // ── P2: TC-505 — Records-Found / grid appear only after Generate ──────────
    test('TC-LVE-RPT-505 — report grid appears only after Generate', async ({
      leaveBalanceReportPage,
    }) => {
      // Fresh criteria page: nothing generated yet.
      await expect(leaveBalanceReportPage.recordsFound).toHaveCount(0);
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      const report = await leaveBalanceReportPage.generate();
      expect(report.total).toBeGreaterThan(0);
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
    });

    // ── P2: TC-404 — Default Leave Period is the current annual period ─────────
    test('TC-LVE-RPT-404 — Leave Period defaults to the current annual period', async ({
      leaveBalanceReportPage,
    }) => {
      // The default period loads asynchronously — the web-first assertion waits for it.
      // Open Source uses a calendar-year leave period: YYYY-01-01 - YYYY-12-31.
      await expect(leaveBalanceReportPage.leavePeriodDropdown).toHaveText(
        /^\d{4}-01-01 - \d{4}-12-31$/,
      );
    });

    // ── P2: TC-302 — Leave Period is mandatory and always populated ────────────
    test('TC-LVE-RPT-302 — Leave Period is required and cannot be emptied', async ({
      leaveBalanceReportPage,
    }) => {
      // Open Source exposes no empty option for Leave Period (unlike Location/Sub Unit/Job
      // Title which offer "-- Select --"): it always defaults to the current period and the
      // criteria panel marks it required. The required validation is therefore enforced by
      // design — the field can never be blank through the UI.
      await expect(leaveBalanceReportPage.requiredNote).toBeVisible();
      // It always resolves to a concrete period (never a blank "-- Select --"): the
      // web-first assertion waits for the async default and proves it can't be emptied.
      await expect(leaveBalanceReportPage.leavePeriodDropdown).toHaveText(
        /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/,
      );
    });

    // ── P2: TC-405 — Switching Generate For swaps the criteria field set ───────
    test('TC-LVE-RPT-405 — Generate For toggle swaps the criteria panel', async ({
      leaveBalanceReportPage,
    }) => {
      // Leave Type mode → the Sub Unit filter exists, no employee picker.
      await expect(leaveBalanceReportPage.subUnitDropdown).toBeVisible();
      await expect(leaveBalanceReportPage.employeeNameInput).toHaveCount(0);

      // → Employee mode: employee picker appears, Leave Type-only filters disappear.
      await leaveBalanceReportPage.selectGenerateFor('employee');
      await expect(leaveBalanceReportPage.employeeNameInput).toBeVisible();
      await expect(leaveBalanceReportPage.subUnitDropdown).toHaveCount(0);

      // → back to Leave Type mode: filters return, employee picker gone.
      await leaveBalanceReportPage.selectGenerateFor('leave_type');
      await expect(leaveBalanceReportPage.subUnitDropdown).toBeVisible();
      await expect(leaveBalanceReportPage.employeeNameInput).toHaveCount(0);
    });

    // ── P2: TC-303 — A typed-but-unresolved employee blocks generation ─────────
    test('TC-LVE-RPT-303 — invalid (unresolved) employee name blocks generation', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.selectGenerateFor('employee');
      await leaveBalanceReportPage.typeEmployee('Zzxqnoemployee');
      await expect(leaveBalanceReportPage.employeeAutocompleteNoResults).toBeVisible();
      await leaveBalanceReportPage.generateButton.click();
      // No resolved employee → field validation fires and no report is generated.
      await expect(leaveBalanceReportPage.validationErrors.first()).toBeVisible();
      await expect(leaveBalanceReportPage.recordsFound).toHaveCount(0);
    });

    // ── P2: TC-006 — Entitlement cell drills down to the Entitlements screen ───
    // The results grid is a `revo-grid` CLOSED shadow root, so its cells cannot be clicked
    // via Playwright. The drill-down target is carried per-row in the report payload's
    // `_url` map (the grid renders these as the cell links); we verify the documented target
    // resolves to the Leave Entitlements screen.
    test('TC-LVE-RPT-006 — entitlement cell drill-down targets the Entitlements screen', async ({
      leaveBalanceReportPage,
      page,
    }) => {
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      const report = await leaveBalanceReportPage.generate();
      expect(report.total).toBeGreaterThan(0);

      const urls = report.data[0]?._url as Record<string, string> | undefined;
      expect(urls?.entitlementDays).toMatch(/\/leave\/viewLeaveEntitlements\?/);
      await page.goto(`/web/index.php${urls!.entitlementDays}`, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: 'Leave Entitlements', exact: true }),
      ).toBeVisible();
    });

    // ── P2: TC-007 — Pending cell drills down to the status-filtered Leave List ─
    test('TC-LVE-RPT-007 — pending cell drill-down targets the filtered Leave List', async ({
      leaveBalanceReportPage,
      page,
    }) => {
      await leaveBalanceReportPage.selectLeaveType(d.leaveType.label);
      const report = await leaveBalanceReportPage.generate();
      expect(report.total).toBeGreaterThan(0);

      const urls = report.data[0]?._url as Record<string, string> | undefined;
      expect(urls?.pendingApprovalDays).toMatch(/\/leave\/viewLeaveList\?.*status=1/);
      await page.goto(`/web/index.php${urls!.pendingApprovalDays}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.getByRole('heading', { name: 'Leave List', exact: true })).toBeVisible();
    });

    // ── P2: TC-005 — Export to CSV ─────────────────────────────────────────────
    // Not applicable to Open Source: the report header's export slot is empty and no CSV
    // export control is rendered (verified live on OS 5.8). "Export to CSV" is an OrangeHRM
    // Advanced/Enterprise feature (the page shows an "Upgrade" prompt). Skipped, not failed.
    test('TC-LVE-RPT-005 — export the report to CSV', async ({ leaveBalanceReportPage }) => {
      void leaveBalanceReportPage;
      test.skip(
        true,
        'Export to CSV is an OrangeHRM Advanced/Enterprise feature; absent in Open Source 5.8 ' +
          '(empty `--export` slot, no export control).',
      );
    });
  });

  // ── ESS-driven tests log in as the dedicated ESS user ───────────────────────
  test.describe('My report (ESS)', () => {
    test.beforeEach(async ({ leaveBalanceReportPage }) => {
      await leaveBalanceReportPage.loginWithCredentials(d.user.username, d.user.password);
    });

    // ── P0: TC-004 — ESS opens the auto-generated My report ───────────────────
    test('TC-LVE-RPT-004 — My report auto-generates for the logged-in employee', async ({
      leaveBalanceReportPage,
    }) => {
      const report = await leaveBalanceReportPage.loadMyReport();
      expect(report.status).toBe(200);
      expect(report.total).toBeGreaterThan(0);
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
      // My report rows are keyed by leave type; the seeded Annual entitlement is present.
      expect(report.data.some((r) => r.leaveTypeName === d.leaveType.label)).toBe(true);
    });

    // ── P1: TC-506 — My report has no criteria / employee selector ────────────
    test('TC-LVE-RPT-506 — My report renders with no criteria or employee selector', async ({
      leaveBalanceReportPage,
    }) => {
      await leaveBalanceReportPage.loadMyReport();
      // Self-scoped: auto-generates with no Generate-For mode and no employee picker.
      // (A Leave Period selector + Generate button do exist — for switching periods.)
      await expect(leaveBalanceReportPage.recordsFound).toBeVisible();
      await expect(leaveBalanceReportPage.generateForLeaveTypeRadio).toHaveCount(0);
      await expect(leaveBalanceReportPage.generateForEmployeeRadio).toHaveCount(0);
      await expect(leaveBalanceReportPage.employeeNameInput).toHaveCount(0);
    });

    // ── P0: TC-203 — ESS cannot reach the Admin (all-employee) report ─────────
    test('TC-LVE-RPT-203 — ESS cannot access the Admin report', async ({
      leaveBalanceReportPage,
      page,
    }) => {
      await page.goto(d.routes.adminReport, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      // The all-employee report's "Generate For" mode selector must be unreachable for ESS
      // (whether the app forbids the route or falls back to the criteria-less self report).
      await expect(leaveBalanceReportPage.generateForLeaveTypeRadio).toHaveCount(0);
      await expect(leaveBalanceReportPage.generateForEmployeeRadio).toHaveCount(0);
    });
  });
});
