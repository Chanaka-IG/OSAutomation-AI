import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { LeaveEntitlementsApi } from '../../src/api/orangehrmOSAPI/LeaveEntitlementsApi';
import { LeaveRequestsApi } from '../../src/api/orangehrmOSAPI/LeaveRequestsApi';
import { LeaveTypesApi } from '../../src/api/orangehrmOSAPI/LeaveTypesApi';
import { AuthApi } from '../../src/api/orangehrmOSAPI/AuthApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';
import { dashboardData } from '../../test-data/dashboard/frontend/dashboard';

/**
 * Dashboard (`/dashboard/index`) — post-login landing page.
 * Implements the P0 + P1 scenarios from docs/test-priority_Dashboard.md.
 *
 * Serial mode. Seeds one ESS subordinate (with a single Pending-Approval leave
 * request) and their supervisor in beforeAll, so the supervisor's "My Actions"
 * widget has a real approval to surface (TC-006). Employees deleted in afterAll.
 *
 * Run:
 *   npx playwright test tests/dashboard/dashboard.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const {
  employees, essUser, supervisorUser, reportingMethodId, leaveTypes, entitlements,
  pendingDate, widgets, quickLaunch, emptyStates, patterns, routes, urlPatterns,
} = dashboardData;

/** Tile data by title — keeps the clicked title and the asserted URL coupled. */
const tileByTitle = (title: string) => {
  const tile = quickLaunch.admin.find((t) => t.title === title);
  if (!tile) throw new Error(`No quick-launch tile data for "${title}"`);
  return tile;
};

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

test.describe('Dashboard', () => {
  let essEmp = 0;
  let supEmp = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext, playwright }) => {
    test.setTimeout(120_000);
    await orangehrmAdminApi.loginAsAdmin();

    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);
    const entApi = new LeaveEntitlementsApi(orangehrmApiContext);

    // Leave type id resolved by NAME (instance ids drift).
    const types = await new LeaveTypesApi(orangehrmApiContext).getAll();
    const annual = types.find((t) => t.name === leaveTypes.annual.label);
    if (!annual) throw new Error(`Setup: leave type "${leaveTypes.annual.label}" not found`);

    // Clean slate (a surviving employee keeps old requests → overlap on re-seed).
    const stale: number[] = [];
    for (const e of [employees.ess, employees.supervisor]) {
      const n = await empApi.getEmpNumberByEmployeeId(e.employeeId);
      if (n != null) stale.push(n);
    }
    if (stale.length) await empApi.deleteEmployees(stale);

    await empApi.createIfAbsent(employees.ess);
    await empApi.createIfAbsent(employees.supervisor);
    const n1 = await empApi.getEmpNumberByFullName(employees.ess.firstName, employees.ess.lastName);
    const n2 = await empApi.getEmpNumberByFullName(employees.supervisor.firstName, employees.supervisor.lastName);
    if (n1 == null || n2 == null) throw new Error('Setup: could not resolve seeded empNumbers');
    essEmp = n1;
    supEmp = n2;

    await entApi.createOrUpdateEntitlement({
      empNumber: essEmp, leaveTypeId: annual.id,
      entitlement: entitlements.annualDays,
      fromDate: entitlements.fromDate, toDate: entitlements.toDate,
    });

    await usersApi.createIfAbsent({
      username: essUser.username, password: essUser.password,
      status: true, userRoleId: essUser.userRoleId, empNumber: essEmp,
    });
    await usersApi.createIfAbsent({
      username: supervisorUser.username, password: supervisorUser.password,
      status: true, userRoleId: supervisorUser.userRoleId, empNumber: supEmp,
    });

    await empApi.addSupervisorIfAbsent(essEmp, supEmp, reportingMethodId);

    // ESS self-applies ONE pending request → the supervisor's My Actions has work.
    const ctx = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      await new AuthApi(ctx).login(essUser.username, essUser.password);
      await new LeaveRequestsApi(ctx).apply({
        leaveTypeId: annual.id, fromDate: pendingDate, toDate: pendingDate,
        comment: 'dashboard my-actions seed',
      });
    } finally {
      await ctx.dispose();
    }
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(60_000);
    if (!essEmp && !supEmp) return;
    const apiCtx = await browser.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    try {
      const adminApi = new OrangehrmAdminApi(apiCtx.request);
      await adminApi.loginAsAdmin();
      await new EmployeesApi(apiCtx.request).deleteEmployees([essEmp, supEmp].filter(Boolean));
    } finally {
      await apiCtx.close();
    }
  });

  // ── P0: TC-001 — Admin lands on Dashboard with the full widget grid ──────────
  // Folds TC-100 (admin half), TC-500 (breadcrumb), TC-501 (charts), TC-502 (tiles).
  test('TC-DSH-001 — Admin dashboard renders all widgets, tiles and charts', async ({
    loginPage, page, dashboardPage,
  }) => {
    await loginPage.loginAs('admin');
    await expect(page).toHaveURL(urlPatterns.dashboard);
    await expect(dashboardPage.breadcrumbHeading).toBeVisible();

    // All 7 admin widgets render (nested widget nodes → assert via .first()).
    for (const title of Object.values(widgets)) {
      await expect(dashboardPage.widgetByName(title).first()).toBeVisible({ timeout: 10_000 });
    }

    // Folded TC-502 — exactly the verified quick-launch tiles for a non-supervising admin.
    for (const tile of quickLaunch.admin) {
      await expect(dashboardPage.quickLaunchCard(tile.title).first()).toBeVisible();
    }
    await expect(dashboardPage.quickLaunchCards).toHaveCount(quickLaunch.admin.length);

    // Folded TC-501 — time-at-work bar + two distribution pies.
    await expect(dashboardPage.chartCanvases).toHaveCount(3, { timeout: 10_000 });
  });

  // ── P0: TC-002 — Quick Launch → Assign Leave ─────────────────────────────────
  test('TC-DSH-002 — Assign Leave quick-launch tile navigates to the Assign Leave form', async ({
    loginPage, page, dashboardPage,
  }) => {
    const tile = tileByTitle('Assign Leave');
    await loginPage.loginAs('admin');
    await dashboardPage.gotoDashboard();
    await dashboardPage.clickQuickLaunch(tile.title);
    await expect(page).toHaveURL(tile.urlPattern, { timeout: 10_000 });
  });

  // ── P1: TC-003 — Quick Launch → Leave List ───────────────────────────────────
  test('TC-DSH-003 — Leave List quick-launch tile navigates to the Leave List', async ({
    loginPage, page, dashboardPage,
  }) => {
    const tile = tileByTitle('Leave List');
    await loginPage.loginAs('admin');
    await dashboardPage.gotoDashboard();
    await dashboardPage.clickQuickLaunch(tile.title);
    await expect(page).toHaveURL(tile.urlPattern, { timeout: 10_000 });
  });

  // ── P1: TC-004 — Remaining quick-launch tiles navigate to their modules ──────
  test('TC-DSH-004 — Apply Leave and My Leave tiles navigate', async ({
    loginPage, page, dashboardPage,
  }) => {
    // Every tile not already covered by its own dedicated test (TC-002 / TC-003).
    const covered = ['Assign Leave', 'Leave List'];
    const remaining = quickLaunch.admin.filter((t) => !covered.includes(t.title));

    await loginPage.loginAs('admin');
    for (const tile of remaining) {
      await dashboardPage.gotoDashboard();
      await dashboardPage.clickQuickLaunch(tile.title);
      await expect(page).toHaveURL(tile.urlPattern, { timeout: 10_000 });
    }
  });

  // ── P0: TC-005 — ESS dashboard is self-service scoped ────────────────────────
  // Folds TC-100 (ESS half: no distribution charts) and TC-101 (My Actions empty).
  test('TC-DSH-005 — ESS dashboard shows self-service widgets and tiles only', async ({
    loginPage, page, dashboardPage,
  }) => {
    await loginPage.loginWithCredentials(essUser.username, essUser.password);
    await expect(page).toHaveURL(urlPatterns.dashboard);

    // Core self widgets render.
    for (const title of [widgets.timeAtWork, widgets.myActions, widgets.quickLaunch, widgets.buzz]) {
      await expect(dashboardPage.widgetByName(title).first()).toBeVisible({ timeout: 10_000 });
    }
    // Folded TC-100 — org-wide distribution charts are NOT rendered for plain ESS.
    await expect(dashboardPage.widgetByName(widgets.distBySubunit)).toHaveCount(0);
    await expect(dashboardPage.widgetByName(widgets.distByLocation)).toHaveCount(0);

    // Self-service tiles only — admin launchers absent.
    for (const title of quickLaunch.essTitles) {
      await expect(dashboardPage.quickLaunchCard(title).first()).toBeVisible();
    }
    for (const title of quickLaunch.adminOnlyTitles) {
      await expect(dashboardPage.quickLaunchCard(title)).toHaveCount(0);
    }

    // Folded TC-101 — own pending request is the APPROVER's action, not the ESS user's.
    await expect(dashboardPage.myActionsWidget()).toContainText(emptyStates.myActions);
  });

  // ── P0: TC-006 — Pending request surfaces in the approver's My Actions ───────
  test('TC-DSH-006 — Supervisor My Actions shows the pending leave approval and deep-links', async ({
    loginPage, page, dashboardPage,
  }) => {
    await loginPage.loginWithCredentials(supervisorUser.username, supervisorUser.password);
    await dashboardPage.gotoDashboard();

    const action = dashboardPage.myActionItem(patterns.leaveApprovalAction);
    await expect(action).toBeVisible({ timeout: 10_000 });
    await action.click();
    await expect(page).toHaveURL(urlPatterns.leaveList, { timeout: 10_000 });
  });

  // ── P1: TC-007 — Time at Work widget summary ─────────────────────────────────
  test('TC-DSH-007 — Time at Work shows punch state, today total and week range', async ({
    loginPage, dashboardPage,
  }) => {
    await loginPage.loginAs('admin');
    await dashboardPage.gotoDashboard();

    const card = dashboardPage.timeAtWorkCard;
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toContainText(patterns.punchStatus);
    await expect(card).toContainText('Today');
    await expect(card).toContainText(patterns.weekRange);
  });

  // ── P0: TC-200 — Unauthenticated dashboard access redirects to login ─────────
  test('TC-DSH-200 — unauthenticated /dashboard/index redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    // The auth redirect can interrupt the goto navigation itself (a Playwright race,
    // not a failure) — the waitForURL below is the real oracle.
    await page.goto(routes.dashboard, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForURL(urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(urlPatterns.login);
  });

  // ── P1: TC-300 — Expired session bounces the deep link back to login ─────────
  test('TC-DSH-300 — cleared session redirects a dashboard deep link to login', async ({
    loginPage, page,
  }) => {
    await loginPage.loginAs('admin');
    await expect(page).toHaveURL(urlPatterns.dashboard);

    // Simulate session expiry, then deep-link back. The auth redirect can interrupt
    // the goto navigation itself (Playwright race) — waitForURL is the real oracle.
    await page.context().clearCookies();
    await page.goto(routes.dashboard, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForURL(urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(urlPatterns.login);
  });
});
