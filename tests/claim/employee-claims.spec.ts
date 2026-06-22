import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ClaimEventsApi } from '../../src/api/orangehrmOSAPI/ClaimEventsApi';
import { ClaimRequestsApi } from '../../src/api/orangehrmOSAPI/ClaimRequestsApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for the Admin "Employee Claims" search/list page — P0 + P1 + P2.
 * Source: docs/test-priority_Claim -> Employee Claims.md
 *
 * The page (`/claim/viewAssignClaim`, heading "Employee Claims") is the admin-wide searchable
 * list of all claim requests. Its filter panel is COLLAPSED by default (verified live, OS 5.8) —
 * `EmployeeClaimsPage.gotoList()` expands it before any filter interaction.
 *
 * NOTE: claim requests cannot be deleted (DELETE → 405) — permanent. This suite reuses the
 * persistent event fixtures (createIfAbsent, never deleted) shared with the submit/assign suites,
 * and seeds ONE permanent Initiated claim for the target employee (read-only) to anchor the
 * reference-id, count, and view-details assertions.
 *
 * Run:
 *   npx playwright test tests/claim/employee-claims.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const data = frontend.employeeClaims;
const fx = data.fixtures;
const ESS_USER = auth.essTestUser;

let seededReferenceId: string;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  test.setTimeout(120_000);

  await orangehrmAdminApi.loginAsAdmin();
  const eventsApi = new ClaimEventsApi(orangehrmAdminApi.request);
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  const requestsApi = new ClaimRequestsApi(orangehrmAdminApi.request);

  // Persistent config fixtures (shared with the submit-claim / assign-claim suites).
  await eventsApi.createIfAbsent({ name: fx.activeEvent, description: 'E2E active event', status: true });
  await eventsApi.createIfAbsent({ name: fx.inactiveEvent, description: 'E2E inactive event', status: false });

  const eventId = await eventsApi.getIdByName(fx.activeEvent);
  const empNumber = await employeesApi.getEmpNumberByFullName(data.employee.firstName, data.employee.lastName);
  if (eventId === undefined) throw new Error('Failed to resolve active claim event id for seeding.');
  if (empNumber === undefined) throw new Error('Failed to resolve target employee empNumber for seeding.');

  // Seed one permanent Initiated claim (admin → employee) for read-only reuse across the suite.
  const seeded = await requestsApi.createForEmployee(empNumber, {
    claimEventId: eventId,
    currencyId: fx.currencyId,
    remarks: data.samples.seedRemarks,
  });
  seededReferenceId = seeded.referenceId;
});

// ─── Admin — Employee Claims search/list ─────────────────────────────────────
test.describe('Admin — Employee Claims', () => {
  test.beforeEach(async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.loginAs('admin');
    await employeeClaimsPage.gotoList();
  });

  test('**TC-001** | Employee Claims list loads with current-employee claims by default', async ({ employeeClaimsPage }) => {
    await expect(employeeClaimsPage.listHeading).toBeVisible();
    await expect(employeeClaimsPage.recordsFoundText).toBeVisible();
    expect(await employeeClaimsPage.recordsFoundCount()).toBeGreaterThan(0);
    expect(await employeeClaimsPage.claimRows.count()).toBeGreaterThan(0);
  });

  test('**TC-002** | Search by Reference Id returns the matching claim', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.searchByReference(seededReferenceId);
    await expect(employeeClaimsPage.claimRows).toHaveCount(1);
    await expect(employeeClaimsPage.claimRowByReference(seededReferenceId)).toContainText(data.employee.summaryName);
  });

  test('**TC-008** | View Details opens the claim detail page', async ({ employeeClaimsPage, page }) => {
    await employeeClaimsPage.searchByReference(seededReferenceId);
    await employeeClaimsPage.openFirstClaimDetails();
    await expect(page).toHaveURL(data.urlPatterns.detail);
  });

  test('**TC-003** | Search by Employee Name returns that employee\'s claims', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.selectEmployee(data.employee.query, data.employee.optionLabel);
    await employeeClaimsPage.clickSearch();
    const rowCount = await employeeClaimsPage.claimRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(employeeClaimsPage.claimRows.nth(i)).toContainText(data.employee.summaryName);
    }
  });

  test('**TC-004** | Filter by Event Name returns only claims for that event', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.selectEventName(fx.activeEvent);
    await employeeClaimsPage.clickSearch();
    const rowCount = await employeeClaimsPage.claimRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(employeeClaimsPage.claimRows.nth(i)).toContainText(fx.activeEvent);
    }
  });

  test('**TC-005** | Filter by Status returns only claims in that state', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.selectStatus(data.statuses.initiated);
    await employeeClaimsPage.clickSearch();
    const rowCount = await employeeClaimsPage.claimRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(employeeClaimsPage.claimRows.nth(i)).toContainText(data.statuses.initiated);
    }
  });

  test('**TC-009** | Reset restores the full unfiltered list', async ({ employeeClaimsPage }) => {
    // The "(N) Records Found" header renders only on the unfiltered list; capture it first.
    const fullCount = await employeeClaimsPage.recordsFoundCount();
    expect(fullCount).toBeGreaterThan(0);

    await employeeClaimsPage.searchByReference(data.samples.unknownReference);
    await expect(employeeClaimsPage.noRecordsText).toBeVisible();

    await employeeClaimsPage.clickReset();
    expect(await employeeClaimsPage.recordsFoundCount()).toBe(fullCount);
  });

  test('**TC-106** | Records Found count matches the listed rows on the default list', async ({ employeeClaimsPage }) => {
    // "(N) Records Found" is the grand total; the grid shows one page (≤ 50 rows).
    const count = await employeeClaimsPage.recordsFoundCount();
    const rows = await employeeClaimsPage.claimRows.count();
    expect(count).toBeGreaterThan(0);
    expect(rows).toBe(Math.min(count, 50));
  });

  test('**TC-006** | Date-range filter constrains results (wide includes, future excludes)', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.setDateRange(data.samples.wideFromDate, data.samples.wideToDate);
    await employeeClaimsPage.clickSearch();
    expect(await employeeClaimsPage.claimRows.count()).toBeGreaterThan(0);

    await employeeClaimsPage.setDateRange(data.samples.futureFromDate, data.samples.futureToDate);
    await employeeClaimsPage.clickSearch();
    await expect(employeeClaimsPage.noRecordsText).toBeVisible();
    await expect(employeeClaimsPage.claimRows).toHaveCount(0);
  });

  test('**TC-007** | Combined Employee + Status filters narrow results', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.selectEmployee(data.employee.query, data.employee.optionLabel);
    await employeeClaimsPage.selectStatus(data.statuses.initiated);
    await employeeClaimsPage.clickSearch();
    const rowCount = await employeeClaimsPage.claimRows.count();
    expect(rowCount).toBeGreaterThan(0);
    for (let i = 0; i < rowCount; i++) {
      await expect(employeeClaimsPage.claimRows.nth(i)).toContainText(data.employee.summaryName);
      await expect(employeeClaimsPage.claimRows.nth(i)).toContainText(data.statuses.initiated);
    }
  });

  test('**TC-100** | Only active events appear in the Event Name filter', async ({ employeeClaimsPage }) => {
    const options = await employeeClaimsPage.getEventNameOptions();
    expect(options).toContain(fx.activeEvent);
    expect(options).not.toContain(fx.inactiveEvent);
  });

  test('**TC-102** | Include defaults to "Current Employees Only"', async ({ employeeClaimsPage }) => {
    expect(await employeeClaimsPage.includeValue()).toBe(data.include.currentOnly);
  });

  test('**TC-105** | Default sort is Reference Id descending', async ({ employeeClaimsPage }) => {
    const ids = await employeeClaimsPage.visibleReferenceIds();
    expect(ids.length).toBeGreaterThan(1);
    const descending = [...ids].sort((a, b) => Number(b) - Number(a));
    expect(ids).toEqual(descending);
  });

  test('**TC-501** | Empty state shows "No Records Found"', async ({ employeeClaimsPage }) => {
    await employeeClaimsPage.searchByReference(data.samples.unknownReference);
    await expect(employeeClaimsPage.noRecordsText).toBeVisible();
    await expect(employeeClaimsPage.claimRows).toHaveCount(0);
  });

  test('**TC-502** | The result grid narrows after filtering', async ({ employeeClaimsPage }) => {
    // The count header is hidden once filters are applied, so the observable update is the grid itself.
    const fullRows = await employeeClaimsPage.claimRows.count();
    expect(fullRows).toBeGreaterThan(1);

    await employeeClaimsPage.searchByReference(seededReferenceId);
    await expect(employeeClaimsPage.claimRows).toHaveCount(1);
  });
});

// ─── Security — access control ───────────────────────────────────────────────
test.describe('Security — Employee Claims access control', () => {
  test('**TC-200** | ESS direct access to Employee Claims → Credential Required', async ({ employeeClaimsPage, page }) => {
    await employeeClaimsPage.loginWithCredentials(ESS_USER.username, ESS_USER.password);
    await page.goto(data.routes.list, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(data.messages.credentialRequired, { exact: true })).toBeVisible();
  });

  test('**TC-201** | ESS Claim menu hides Employee Claims and Assign Claim', async ({ employeeClaimsPage, page }) => {
    await employeeClaimsPage.loginWithCredentials(ESS_USER.username, ESS_USER.password);
    await page.goto(data.routes.essSubmitClaim, { waitUntil: 'domcontentloaded' });
    await expect(employeeClaimsPage.topbarMenu).toBeVisible();
    await expect(employeeClaimsPage.topbarMenu).not.toContainText('Employee Claims');
    await expect(employeeClaimsPage.topbarMenu).not.toContainText('Assign Claim');
  });

  test('**TC-203** | Unauthenticated access redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(data.routes.list, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(data.urlPatterns.login);
  });
});
