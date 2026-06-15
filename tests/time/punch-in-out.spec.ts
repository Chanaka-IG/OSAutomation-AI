import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { AttendanceApi } from '../../src/api/orangehrmOSAPI/AttendanceApi';

/**
 * E2E coverage for Time → Attendance → Punch In/Out — P0 + P1 (13 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> Punch-In-Out.md
 *   P0: TC-001, TC-003, TC-004, TC-100, TC-201, TC-202
 *   P1: TC-002, TC-101, TC-005, TC-102, TC-500, TC-502, TC-205
 *
 * State note: the admin account is mapped to employee "Ruwan Kumara" (empNumber 1). Punch state is
 * shared for that employee, so each punch test resets to "not punched in" via the API in beforeEach
 * (and the suite restores it in afterAll). Records cannot be deleted with the default config, so
 * record assertions key off a unique per-test note rather than absolute counts.
 *
 * Run:
 *   npx playwright test tests/attendance/punch-in-out.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const attendanceData = frontend.attendance;
const ESS_TEST_USER = auth.essTestUser;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Admin self-service punch flow ──────────────────────────────────────────
test.describe('Attendance — Punch In/Out (admin self-service)', () => {
  test.beforeEach(async ({ loginPage, punchPage, orangehrmAdminApi }) => {
    // Reset shared punch state to "not punched in" before each test.
    await orangehrmAdminApi.loginAsAdmin();
    await new AttendanceApi(orangehrmAdminApi.request).ensurePunchedOut();

    await loginPage.loginAs('admin');
    await punchPage.gotoPunch();
  });

  test.afterAll(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    await new AttendanceApi(orangehrmAdminApi.request).ensurePunchedOut();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ATT-PIO-001 — Punch In at current time creates an open record', async ({
    punchPage,
    page,
  }) => {
    await expect(punchPage.punchInHeading).toBeVisible();

    await punchPage.punchIn();

    await expect(page).toHaveURL(attendanceData.urlPatterns.punchOut);
    await expect(punchPage.punchOutHeading).toBeVisible();
    await expect(punchPage.outButton).toBeVisible();
    await expect(punchPage.punchedInTimeLabel).toBeVisible();
  });

  test('TC-ATT-PIO-003 — Punch Out closes the open record and resets state', async ({
    punchPage,
    page,
  }) => {
    await punchPage.punchIn();
    await expect(punchPage.punchOutHeading).toBeVisible();

    await punchPage.punchOut();

    await expect(page).toHaveURL(attendanceData.urlPatterns.punchIn);
    await expect(punchPage.punchInHeading).toBeVisible();
    await expect(punchPage.inButton).toBeVisible();
  });

  test('TC-ATT-PIO-004 — A full cycle produces one completed record in My Records', async ({
    punchPage,
    myAttendanceRecordsPage,
  }) => {
    const stamp = Date.now();
    const inNote = `${attendanceData.samples.punchInNote} ${stamp}`;
    const outNote = `${attendanceData.samples.punchOutNote} ${stamp}`;

    await punchPage.punchIn(inNote);
    await punchPage.punchOut(outNote);

    await myAttendanceRecordsPage.gotoMyRecords();
    const row = myAttendanceRecordsPage.rowByText(inNote);
    await expect(row).toBeVisible();
    await expect(row).toContainText(outNote);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-ATT-PIO-002 — Punch-in note is shown on the Punch Out screen', async ({
    punchPage,
  }) => {
    const inNote = `${attendanceData.samples.punchInNote} ${Date.now()}`;

    await punchPage.punchIn(inNote);

    await expect(punchPage.punchedInNoteLabel).toBeVisible();
    await expect(punchPage.noteText(inNote)).toBeVisible();
  });

  test('TC-ATT-PIO-101 — Not punched in: Punch Out URL redirects back to Punch In', async ({
    punchPage,
    page,
  }) => {
    await punchPage.gotoPunchOut();

    await expect(page).toHaveURL(attendanceData.urlPatterns.punchIn);
    await expect(punchPage.punchInHeading).toBeVisible();
    await expect(punchPage.inButton).toBeVisible();
  });

  test('TC-ATT-PIO-005 — My Records shows a record count and total duration', async ({
    punchPage,
    myAttendanceRecordsPage,
  }) => {
    await punchPage.punchIn(`${attendanceData.samples.punchInNote} ${Date.now()}`);
    await punchPage.punchOut();

    await myAttendanceRecordsPage.gotoMyRecords();

    await expect(myAttendanceRecordsPage.recordsFoundText.first()).toBeVisible();
    expect(await myAttendanceRecordsPage.recordsFoundCount()).toBeGreaterThanOrEqual(1);
    await expect(myAttendanceRecordsPage.totalDurationText.first()).toBeVisible();
  });

  test('TC-ATT-PIO-102 — Date/Time are disabled and pre-filled under default configuration', async ({
    punchPage,
  }) => {
    await expect(punchPage.punchInHeading).toBeVisible();
    await expect(punchPage.dateInput).toBeDisabled();
    await expect(punchPage.timeInput).toBeDisabled();
    await expect(punchPage.dateInput).not.toHaveValue('');
    await expect(punchPage.timeInput).not.toHaveValue('');
  });

  test('TC-ATT-PIO-500 — Heading and action button reflect the current punch state', async ({
    punchPage,
  }) => {
    await expect(punchPage.punchInHeading).toBeVisible();
    await expect(punchPage.inButton).toBeVisible();
    await expect(punchPage.outButton).toHaveCount(0);

    await punchPage.punchIn();

    await expect(punchPage.punchOutHeading).toBeVisible();
    await expect(punchPage.outButton).toBeVisible();
    await expect(punchPage.inButton).toHaveCount(0);
  });

  test('TC-ATT-PIO-502 — Punch Out screen shows the read-only punched-in summary', async ({
    punchPage,
  }) => {
    const inNote = `${attendanceData.samples.punchInNote} ${Date.now()}`;

    await punchPage.punchIn(inNote);

    await expect(punchPage.punchedInTimeLabel).toBeVisible();
    await expect(punchPage.punchedInNoteLabel).toBeVisible();
    await expect(punchPage.noteText(inNote)).toBeVisible();
  });

  // ── Already-punched-in precondition (seeded via API in the hook) ──────────
  test.describe('When already punched in', () => {
    test.beforeEach(async ({ orangehrmAdminApi }) => {
      await new AttendanceApi(orangehrmAdminApi.request).punchIn(attendanceData.samples.alreadyInNote);
    });

    test('TC-ATT-PIO-100 — Punch In redirects to Punch Out (no second open record)', async ({
      punchPage,
      page,
    }) => {
      await punchPage.gotoPunch();

      await expect(page).toHaveURL(attendanceData.urlPatterns.punchOut);
      await expect(punchPage.punchOutHeading).toBeVisible();
      await expect(punchPage.outButton).toBeVisible();
      await expect(punchPage.inButton).toHaveCount(0);
    });
  });
});

// ─── Security — ESS cannot reach admin attendance screens ───────────────────
test.describe('Attendance — ESS authorization', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-ATT-PIO-201 — ESS user cannot open Attendance Configuration', async ({
    punchPage,
  }) => {
    await punchPage.goto(attendanceData.routes.configure);

    await expect(punchPage.credentialRequired).toBeVisible();
    await expect(punchPage.attendanceConfigHeading).toHaveCount(0);
  });

  test('TC-ATT-PIO-202 — ESS user cannot open Employee Attendance Records', async ({
    punchPage,
  }) => {
    await punchPage.goto(attendanceData.routes.employeeRecords);

    await expect(punchPage.credentialRequired).toBeVisible();
    await expect(punchPage.employeeRecordsHeading).toHaveCount(0);
  });
});

// ─── Security — unauthenticated access is blocked ───────────────────────────
test.describe('Attendance — unauthenticated access', () => {
  test('TC-ATT-PIO-205 — Punch routes redirect to login when not authenticated', async ({
    punchPage,
    page,
  }) => {
    await page.context().clearCookies();

    await punchPage.goto(attendanceData.routes.punchIn);
    await expect(page).toHaveURL(attendanceData.urlPatterns.login);

    await punchPage.goto(attendanceData.routes.myRecords);
    await expect(page).toHaveURL(attendanceData.urlPatterns.login);
  });
});
