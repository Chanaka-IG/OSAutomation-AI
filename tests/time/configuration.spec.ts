import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { AttendanceApi, type AttendanceConfigs } from '../../src/api/orangehrmOSAPI/AttendanceApi';

/**
 * E2E coverage for Time → Attendance → Configuration — P0 + P1 (13 scenarios, one test each).
 * Source: docs/test-priority_Attendance -> Configuration.md
 *   P0: TC-002, TC-004, TC-100, TC-200, TC-202
 *   P1: TC-001, TC-003, TC-005, TC-402, TC-503, TC-105, TC-500, TC-505
 *
 * SINGLETON SAFETY: this config is a global singleton that every other Attendance suite depends on
 * (all flags OFF). The original values are captured in beforeAll and restored in afterAll, and each test
 * is reset to the original baseline in beforeEach — so a toggled flag can never leak to sibling suites.
 *
 * Run:
 *   npx playwright test tests/attendance/configuration.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const attendanceData = frontend.attendance;
const ESS_TEST_USER = auth.essTestUser;
const LABELS = attendanceData.config.labels;

const ALL_OFF: AttendanceConfigs = {
  canUserChangeCurrentTime: false,
  canUserModifyAttendance: false,
  canSupervisorModifyAttendance: false,
};

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Configuration screen (admin) ───────────────────────────────────────────
test.describe('Attendance Configuration (admin)', () => {
  let original: AttendanceConfigs;

  test.beforeAll(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    original = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
  });

  test.afterAll(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    await new AttendanceApi(orangehrmAdminApi.request).setConfigs(original);
  });

  test.beforeEach(async ({ loginPage, attendanceConfigPage, orangehrmAdminApi }) => {
    // Reset the singleton to its captured baseline before each test.
    await orangehrmAdminApi.loginAsAdmin();
    await new AttendanceApi(orangehrmAdminApi.request).setConfigs(original);

    await loginPage.loginAs('admin');
    await attendanceConfigPage.gotoConfig();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ATT-CFG-002 — Enabling a toggle and saving persists it', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.save();

    const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
    expect(configs.canUserChangeCurrentTime).toBe(true);
  });

  test('TC-ATT-CFG-004 — Saved configuration persists across reload', async ({
    attendanceConfigPage,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.save();

    await attendanceConfigPage.gotoConfig();
    expect(await attendanceConfigPage.isEnabled(LABELS.changeTime)).toBe(true);
  });

  test('TC-ATT-CFG-100 — Enabling "change current time" makes Punch In Date/Time editable', async ({
    attendanceConfigPage,
    punchPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.save();

    await new AttendanceApi(orangehrmAdminApi.request).ensurePunchedOut();
    await punchPage.gotoPunch();

    // The punch page fetches /configs on load to decide field state — allow for it under suite load.
    await expect(punchPage.dateInput).toBeEnabled({ timeout: 15_000 });
    await expect(punchPage.timeInput).toBeEnabled({ timeout: 15_000 });
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-ATT-CFG-001 — Toggles load matching the saved (baseline) config', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();

    expect(await attendanceConfigPage.isEnabled(LABELS.changeTime)).toBe(configs.canUserChangeCurrentTime);
    expect(await attendanceConfigPage.isEnabled(LABELS.modifyOwn)).toBe(configs.canUserModifyAttendance);
    expect(await attendanceConfigPage.isEnabled(LABELS.supervisorModify)).toBe(
      configs.canSupervisorModifyAttendance,
    );
  });

  test('TC-ATT-CFG-003 — Disabling a toggle and saving persists the off state', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.save();

    await attendanceConfigPage.setSwitch(LABELS.changeTime, false);
    await attendanceConfigPage.save();

    const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
    expect(configs.canUserChangeCurrentTime).toBe(false);
  });

  test('TC-ATT-CFG-005 — Enabling all three toggles and saving persists them', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.setSwitch(LABELS.modifyOwn, true);
    await attendanceConfigPage.setSwitch(LABELS.supervisorModify, true);
    await attendanceConfigPage.save();

    const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
    expect(configs).toMatchObject({
      canUserChangeCurrentTime: true,
      canUserModifyAttendance: true,
      canSupervisorModifyAttendance: true,
    });
  });

  test('TC-ATT-CFG-402 — Disabling "change current time" re-disables Punch In Date/Time', async ({
    attendanceConfigPage,
    punchPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.save();

    await attendanceConfigPage.setSwitch(LABELS.changeTime, false);
    await attendanceConfigPage.save();

    await new AttendanceApi(orangehrmAdminApi.request).ensurePunchedOut();
    await punchPage.gotoPunch();

    // The punch page fetches /configs on load to decide field state — allow for it under suite load.
    await expect(punchPage.dateInput).toBeDisabled({ timeout: 15_000 });
    await expect(punchPage.timeInput).toBeDisabled({ timeout: 15_000 });
  });

  test('TC-ATT-CFG-503 — Saving shows the "Successfully Saved" toast', async ({
    attendanceConfigPage,
  }) => {
    await attendanceConfigPage.setSwitch(LABELS.changeTime, true);
    await attendanceConfigPage.saveButton.click();

    await attendanceConfigPage.verifySuccessToastForSave();
  });

  test('TC-ATT-CFG-105 — Saving with no changes preserves the state', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    await attendanceConfigPage.save();

    // A no-change save must preserve the captured baseline (not assume the env default is all-off).
    const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
    expect(configs).toMatchObject(original);
  });

  test('TC-ATT-CFG-500 — The three labelled toggles render', async ({ attendanceConfigPage }) => {
    await expect(attendanceConfigPage.label(LABELS.changeTime)).toBeVisible();
    await expect(attendanceConfigPage.label(LABELS.modifyOwn)).toBeVisible();
    await expect(attendanceConfigPage.label(LABELS.supervisorModify)).toBeVisible();
  });

  test('TC-ATT-CFG-505 — Toggles reflect a specific saved config on load', async ({
    attendanceConfigPage,
    orangehrmAdminApi,
  }) => {
    // Persist a known mixed state via the API, then confirm the reloaded UI mirrors it.
    await new AttendanceApi(orangehrmAdminApi.request).setConfigs({
      ...ALL_OFF,
      canUserModifyAttendance: true,
    });
    await attendanceConfigPage.gotoConfig();

    expect(await attendanceConfigPage.isEnabled(LABELS.modifyOwn)).toBe(true);
    expect(await attendanceConfigPage.isEnabled(LABELS.changeTime)).toBe(false);
    expect(await attendanceConfigPage.isEnabled(LABELS.supervisorModify)).toBe(false);
  });
});

// ─── Access control ─────────────────────────────────────────────────────────
test.describe('Attendance Configuration — access control', () => {
  test('TC-ATT-CFG-200 — ESS user cannot access Configuration', async ({
    loginPage,
    attendanceConfigPage,
  }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await attendanceConfigPage.gotoConfig();

    await expect(attendanceConfigPage.credentialRequired).toBeVisible();
    await expect(attendanceConfigPage.saveButton).toHaveCount(0);
  });

  test('TC-ATT-CFG-202 — Unauthenticated access redirects to login', async ({
    attendanceConfigPage,
    page,
  }) => {
    await page.context().clearCookies();
    await attendanceConfigPage.gotoConfig();

    // Allow for a slower client-side redirect when the suite is under load.
    await expect(page).toHaveURL(attendanceData.urlPatterns.login, { timeout: 15_000 });
  });
});
