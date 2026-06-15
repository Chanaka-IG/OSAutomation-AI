import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { AttendanceApi } from '../../src/api/orangehrmOSAPI/AttendanceApi';

/**
 * E2E coverage for Time → Attendance → My Records — P0 + P1 (12 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> My Records.md
 *   P0: TC-001, TC-002, TC-005, TC-201, TC-203
 *   P1: TC-003, TC-004, TC-006, TC-200, TC-202, TC-300, TC-500
 *
 * Data note: with the default config (`canUserChangeCurrentTime=false`) the server rejects
 * punches with an explicit past/future date, so records can only be seeded at the current server
 * time (→ "today", the server's UTC date). Data-bearing tests seed a cycle for that date via the API
 * and assert on a unique note + the API's own count/sum (offset-/timezone-safe). The empty-state check
 * filters a far-past date, which is always empty (viewing any date is allowed).
 *
 * Run:
 *   npx playwright test tests/attendance/my-records.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const attendanceData = frontend.attendance;
const ESS_TEST_USER = auth.essTestUser;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Page & filter (no seeded data required) ────────────────────────────────
test.describe('My Records — page & filter (admin)', () => {
  test.beforeEach(async ({ loginPage, myAttendanceRecordsPage }) => {
    await loginPage.loginAs('admin');
    await myAttendanceRecordsPage.gotoMyRecords();
  });

  test('TC-ATT-MR-001 — Opens defaulted to a date and auto-loads its records', async ({
    myAttendanceRecordsPage,
  }) => {
    await expect(myAttendanceRecordsPage.heading).toBeVisible();
    // Summary bar renders on load → the page auto-queried without a manual View.
    await expect(myAttendanceRecordsPage.totalDurationText.first()).toBeVisible();

    await myAttendanceRecordsPage.openFilter();
    await expect(myAttendanceRecordsPage.dateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('TC-ATT-MR-201 — Self-scoped: no employee selector on My Records', async ({
    myAttendanceRecordsPage,
  }) => {
    await expect(myAttendanceRecordsPage.heading).toBeVisible();
    await expect(myAttendanceRecordsPage.employeeAutocomplete).toHaveCount(0);
    await expect(myAttendanceRecordsPage.employeeNameLabel).toHaveCount(0);
  });

  test('TC-ATT-MR-300 — Empty Date + View shows "Required" and does not refresh', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.clearDateAndView();
    await expect(myAttendanceRecordsPage.dateError.first()).toHaveText('Required');
  });

  test('TC-ATT-MR-500 — A date with no records shows the empty state', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.viewDate(attendanceData.samples.emptyDate);

    await expect(myAttendanceRecordsPage.noRecordsText.first()).toBeVisible();
    await expect(myAttendanceRecordsPage.totalDurationText.first()).toContainText('0.00');
    await expect(myAttendanceRecordsPage.tableRows).toHaveCount(0);
  });
});

// ─── Viewing seeded records (one completed cycle seeded for "today") ─────────
test.describe('My Records — viewing seeded records (admin)', () => {
  let seedDate: string;
  let inNote: string;
  let outNote: string;

  test.beforeEach(async ({ loginPage, myAttendanceRecordsPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new AttendanceApi(orangehrmAdminApi.request);
    await api.ensurePunchedOut();
    seedDate = (await api.getCurrentDateTime()).utcDate;

    const stamp = Date.now();
    inNote = `${attendanceData.samples.myRecordsInNote} ${stamp}`;
    outNote = `${attendanceData.samples.myRecordsOutNote} ${stamp}`;
    await api.punchIn(inNote);
    await api.punchOut(outNote);

    await loginPage.loginAs('admin');
    await myAttendanceRecordsPage.gotoMyRecords();
  });

  test('TC-ATT-MR-002 — Filtering a date with records lists them', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.viewDate(seedDate);

    await expect(myAttendanceRecordsPage.rowByText(inNote)).toBeVisible();
    expect(await myAttendanceRecordsPage.recordsFoundCount()).toBeGreaterThanOrEqual(1);
  });

  test('TC-ATT-MR-003 — A record row shows all five columns', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.viewDate(seedDate);

    // The per-cell column labels are rendered responsively (only at narrow widths), so assert the
    // record's data across the five columns instead: punch-in date/time, in-note, out-note, duration.
    const row = myAttendanceRecordsPage.rowByText(inNote);
    await expect(row).toBeVisible();
    await expect(row).toContainText(seedDate); // Punch In / Punch Out date columns
    await expect(row).toContainText(/\d{1,2}:\d{2}\s?(AM|PM)/); // punch time
    await expect(row).toContainText(inNote); // Punch In Note column
    await expect(row).toContainText(outNote); // Punch Out Note column
    await expect(row).toContainText(/\b\d+\.\d{2}\b/); // Duration (Hours) value
  });

  test('TC-ATT-MR-004 — Total Duration matches the API sum for the date', async ({
    myAttendanceRecordsPage,
    orangehrmAdminApi,
  }) => {
    const { sumLabel } = await new AttendanceApi(orangehrmAdminApi.request).getRecordsByDate(seedDate);

    await myAttendanceRecordsPage.viewDate(seedDate);

    await expect(myAttendanceRecordsPage.totalDurationText.first()).toContainText(sumLabel);
  });

  test('TC-ATT-MR-005 — "(N) Records Found" equals the API record count', async ({
    myAttendanceRecordsPage,
    orangehrmAdminApi,
  }) => {
    const { total } = await new AttendanceApi(orangehrmAdminApi.request).getRecordsByDate(seedDate);

    await myAttendanceRecordsPage.viewDate(seedDate);

    // The "(N) Records Found" counter reflects meta.total exactly.
    expect(await myAttendanceRecordsPage.recordsFoundCount()).toBe(total);
    // Rendered cards are capped at the page size (limit=50); bound the assertion so an accumulating
    // "today" dataset can't make this flake once it crosses 50.
    await expect(myAttendanceRecordsPage.tableRows).toHaveCount(Math.min(total, 50));
  });

  test('TC-ATT-MR-006 — Changing the filter date updates the results', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.viewDate(seedDate);
    await expect(myAttendanceRecordsPage.rowByText(inNote)).toBeVisible();

    await myAttendanceRecordsPage.viewDate(attendanceData.samples.emptyDate);
    await expect(myAttendanceRecordsPage.noRecordsText.first()).toBeVisible();
    await expect(myAttendanceRecordsPage.rowByText(inNote)).toHaveCount(0);
  });

  test('TC-ATT-MR-202 — Records have no edit/delete affordance (config OFF)', async ({
    myAttendanceRecordsPage,
  }) => {
    await myAttendanceRecordsPage.viewDate(seedDate);

    const row = myAttendanceRecordsPage.rowByText(inNote);
    await expect(row).toBeVisible();
    await expect(row.locator('.oxd-icon-button')).toHaveCount(0);
    await expect(row.locator('input[type="checkbox"]')).toHaveCount(0);
  });
});

// ─── Access control ─────────────────────────────────────────────────────────
test.describe('My Records — access control', () => {
  test('TC-ATT-MR-200 — ESS user can view their own My Records', async ({
    loginPage,
    myAttendanceRecordsPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await myAttendanceRecordsPage.gotoMyRecords();

    await expect(myAttendanceRecordsPage.heading).toBeVisible();
    await expect(myAttendanceRecordsPage.employeeAutocomplete).toHaveCount(0);
  });

  test('TC-ATT-MR-203 — Unauthenticated access redirects to login', async ({
    myAttendanceRecordsPage,
    page,
  }) => {
    await page.context().clearCookies();
    await myAttendanceRecordsPage.goto(attendanceData.routes.myRecords);

    await expect(page).toHaveURL(attendanceData.urlPatterns.login);
  });
});
