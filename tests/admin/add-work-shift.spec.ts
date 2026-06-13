import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { WorkShiftsApi } from '../../src/api/orangehrmOSAPI/WorkShiftsApi';

/**
 * E2E coverage for Add Work Shift (Admin → Job → Work Shifts) — P0 + P1 + P2.
 * Covers: TC-001 (+500/504), TC-300 (+301), TC-200, TC-202,
 *         TC-002 (+102/302/505), TC-100 (+303), TC-003 (+004/501/405), TC-502,
 *         TC-503 (route-mocked empty list).
 * Source: docs/test-priority_Add work shift.md
 *
 * Run:
 *   npx playwright test tests/admin/add-work-shift.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const workShiftsData = frontend.adminWorkShifts;

// ─── Suite-level state ──────────────────────────────────────────────────────
/** Shift names created during the run; resolved to ids and hard-deleted in afterAll. */
const createdShifts: string[] = [];

/** Pre-seeded shift name reused (read-only) for the duplicate-name check. */
const DUPLICATE_SHIFT = `WS Dup Seed ${Date.now()}`;

/** Known seeded ESS user (empNumber 2) for access-control checks. */
const ESS_TEST_USER = auth.essTestUser;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ masterDataReadiness }) => {
  void masterDataReadiness;
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  const toClean = [...new Set([...createdShifts, DUPLICATE_SHIFT])];
  await orangehrmAdminApi.loginAsAdmin();
  const cleanupApi = new WorkShiftsApi(orangehrmAdminApi.request);
  await cleanupApi.deleteByNames(toClean);
});

// ─── Admin — Add Work Shift form ────────────────────────────────────────────
// Serial: these tests share DUPLICATE_SHIFT + a record-count assertion. The ESS and
// empty-state describes below are independent and run regardless of a failure here.
test.describe('Admin — Add Work Shift form', () => {
  test.describe.configure({ mode: 'serial' });

  // Seed the duplicate-name record once, through the API, so TC-100's body stays
  // focused on the inline-uniqueness behavior rather than data setup.
  test.beforeAll(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const workShiftsApi = new WorkShiftsApi(orangehrmAdminApi.request);
    if ((await workShiftsApi.getIdByName(DUPLICATE_SHIFT)) === undefined) {
      await workShiftsApi.create({
        name: DUPLICATE_SHIFT,
        startTime: '09:00',
        endTime: '17:00',
        hoursPerDay: '8.00',
      });
    }
  });

  test.beforeEach(async ({ loginPage, workShiftsPage }) => {
    await loginPage.loginAs('admin');
    await workShiftsPage.gotoAddForm();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AWS-001 — Add work shift with defaults saves, toasts, and lists the row', async ({
    workShiftsPage,
    orangehrmAdminApi,
    page,
  }) => {
    // Folds TC-500: the form opens with valid 9–5 defaults.
    await expect(workShiftsPage.fromInput).toHaveValue(workShiftsData.defaults.from);
    await expect(workShiftsPage.toInput).toHaveValue(workShiftsData.defaults.to);
    expect(await workShiftsPage.readDuration()).toBe(workShiftsData.defaults.duration);

    await orangehrmAdminApi.loginAsAdmin();
    const workShiftsApi = new WorkShiftsApi(orangehrmAdminApi.request);
    const countBefore = (await workShiftsApi.getAll()).length;
    const name = `WS Defaults ${Date.now()}`;

    await workShiftsPage.fillName(name);
    await workShiftsPage.saveAndVerifyToast();

    // Folds TC-504: success toast asserted above + redirect back to the list.
    await expect(page).toHaveURL(workShiftsData.urlPatterns.list);

    const row = workShiftsPage.rowByName(name).first();
    await expect(row).toBeVisible();
    createdShifts.push(name);

    expect(await workShiftsPage.recordsFoundCount()).toBe(countBefore + 1);
    await expect(row).toContainText(workShiftsData.defaults.from);
    await expect(row).toContainText(workShiftsData.defaults.to);
    await expect(row).toContainText(workShiftsData.defaults.duration);
  });

  test('TC-ADMIN-AWS-300 — Empty and whitespace-only Shift Name show "Required" and block save', async ({
    workShiftsPage,
    page,
  }) => {
    // -- Step 1: Empty save shows Required (TC-300) --
    await workShiftsPage.saveButton.click();
    await expect(workShiftsPage.shiftNameError).toHaveText(workShiftsData.messages.required);
    await expect(page).toHaveURL(workShiftsData.urlPatterns.add);

    // -- Step 2: Whitespace-only is treated as empty (TC-301) --
    await workShiftsPage.fillName(workShiftsData.samples.whitespaceName);
    await workShiftsPage.saveButton.click();
    await expect(workShiftsPage.shiftNameError).toHaveText(workShiftsData.messages.required);
    await expect(page).toHaveURL(workShiftsData.urlPatterns.add);
  });

  test('TC-ADMIN-AWS-202 — Script payload in Shift Name is stored inert (no XSS execution)', async ({
    workShiftsPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const xssName = `<script>alert('xss')</script> WS ${Date.now()}`;
    await workShiftsPage.fillName(xssName);
    await workShiftsPage.saveAndVerifyToast();

    await expect(page).toHaveURL(workShiftsData.urlPatterns.list);
    await expect(workShiftsPage.rowByName(xssName).first()).toBeVisible();
    createdShifts.push(xssName);

    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes("alert('xss')")),
      );
    expect(scriptNodes).toHaveLength(0);
  });

  // ── P1 / P2 ───────────────────────────────────────────────────────────────

  test('TC-ADMIN-AWS-002 — Working hours drive Duration Per Day; custom window persists', async ({
    workShiftsPage,
    page,
  }) => {
    const { customHours, recalcFrom, recalcExpectedDuration, invalidRangeFrom, invalidRangeDuration } =
      workShiftsData.samples;

    // Folds TC-505: the picker spinners are present once the field is opened.
    await workShiftsPage.fromInput.click();
    await expect(workShiftsPage.fromGroup.locator('.oxd-time-hour-input-text')).toBeVisible();
    await workShiftsPage.addFormHeading.click();

    // -- Step 1: changing From recomputes Duration (TC-102) --
    await workShiftsPage.setTime('from', recalcFrom);
    expect(await workShiftsPage.readDuration()).toBe(recalcExpectedDuration);

    // -- Step 2: From ≥ To floors Duration to 0.00, no overnight wrap (TC-302) --
    await workShiftsPage.setTime('from', invalidRangeFrom);
    expect(await workShiftsPage.readDuration()).toBe(invalidRangeDuration);

    // -- Step 3: a valid custom window computes correctly and persists (TC-002) --
    await workShiftsPage.setTime('from', customHours.from);
    await workShiftsPage.setTime('to', customHours.to);
    expect(await workShiftsPage.readDuration()).toBe(customHours.expectedDuration);

    const name = `WS Custom Hours ${Date.now()}`;
    await workShiftsPage.fillName(name);
    await workShiftsPage.saveAndVerifyToast();
    await expect(page).toHaveURL(workShiftsData.urlPatterns.list);

    const row = workShiftsPage.rowByName(name).first();
    await expect(row).toBeVisible();
    createdShifts.push(name);
    await expect(row).toContainText(customHours.expectedDuration);
  });

  test('TC-ADMIN-AWS-100 — Duplicate Shift Name shows "Already exists" and blocks save', async ({
    workShiftsPage,
    orangehrmAdminApi,
    page,
  }) => {
    // The duplicate record is seeded in beforeAll; the live uniqueness check flags it while typing.
    await workShiftsPage.fillName(DUPLICATE_SHIFT);
    await expect(workShiftsPage.shiftNameError).toHaveText(workShiftsData.messages.alreadyExists);

    // Saving with the error present must not create a second record.
    await workShiftsPage.saveButton.click();
    await expect(page).toHaveURL(workShiftsData.urlPatterns.add);
    await expect(workShiftsPage.shiftNameError).toBeVisible();

    // Folds TC-303: a unique value clears the error.
    await workShiftsPage.fillName(`WS Unique ${Date.now()}`);
    await expect(workShiftsPage.shiftNameError).toHaveCount(0);

    // Read-only verification: the duplicate name still maps to exactly one record.
    await orangehrmAdminApi.loginAsAdmin();
    const workShiftsApi = new WorkShiftsApi(orangehrmAdminApi.request);
    const matches = (await workShiftsApi.getAll()).filter((s) => s.name === DUPLICATE_SHIFT);
    expect(matches).toHaveLength(1);
  });

  test('TC-ADMIN-AWS-003 — Assign multiple employees; chips add and remove before save', async ({
    workShiftsPage,
    page,
  }) => {
    const {
      assignEmployeeQuery,
      assignEmployeeName,
      assignEmployee2Query,
      assignEmployee2Name,
    } = workShiftsData.samples;

    // Folds TC-501 + TC-004: autocomplete-driven multi-select.
    await workShiftsPage.assignEmployee(assignEmployeeQuery, assignEmployeeName);
    await workShiftsPage.assignEmployee(assignEmployee2Query, assignEmployee2Name);
    await expect(workShiftsPage.employeeChip(assignEmployeeName)).toBeVisible();
    await expect(workShiftsPage.employeeChip(assignEmployee2Name)).toBeVisible();

    // Folds TC-405: removing a chip drops that assignment.
    await workShiftsPage.removeEmployeeChip(assignEmployee2Name);
    await expect(workShiftsPage.employeeChip(assignEmployee2Name)).toHaveCount(0);
    await expect(workShiftsPage.employeeChip(assignEmployeeName)).toBeVisible();

    const name = `WS With Employee ${Date.now()}`;
    await workShiftsPage.fillName(name);
    await workShiftsPage.saveAndVerifyToast();
    await expect(page).toHaveURL(workShiftsData.urlPatterns.list);
    await expect(workShiftsPage.rowByName(name).first()).toBeVisible();
    createdShifts.push(name);
  });

  test('TC-ADMIN-AWS-502 — Cancel returns to the list without creating a record', async ({
    workShiftsPage,
    page,
  }) => {
    const name = `WS Should Not Exist ${Date.now()}`;

    await workShiftsPage.fillName(name);
    await workShiftsPage.cancelButton.click();

    await expect(page).toHaveURL(workShiftsData.urlPatterns.list);
    await workShiftsPage.waitUntilTableLoaderDissapear();
    await expect(workShiftsPage.rowByName(name)).toHaveCount(0);
  });
});

// ─── P2: list empty-state (deterministic via route mock) ─────────────────────
test.describe('Admin — Work Shifts list empty state (P2)', () => {
  test('TC-ADMIN-AWS-503 — Empty list renders "No Records Found"', async ({
    loginPage,
    workShiftsPage,
    page,
  }) => {
    await loginPage.loginAs('admin');

    // Force an empty result set so the assertion is independent of shared data.
    await page.route('**/api/v2/admin/work-shifts**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0 }, rels: [] }),
        });
        return;
      }
      await route.continue();
    });

    await workShiftsPage.gotoList();
    await expect(workShiftsPage.noRecordsText).toBeVisible();
    await expect(workShiftsPage.tableRows).toHaveCount(0);
  });
});

// ─── P0: ESS security ─────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Work Shifts administration', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-ADMIN-AWS-200 — ESS user: no Admin menu; Work Shift URLs render Credential Required', async ({
    workShiftsPage,
    page,
  }) => {
    // -- Step 1: Admin module absent from the side navigation --
    await expect(workShiftsPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link to the list renders no grid and no Add button --
    await workShiftsPage.goto(workShiftsData.routes.list);
    await expect(page.getByText(workShiftsData.messages.credentialRequired)).toBeVisible();
    await expect(workShiftsPage.addButton).not.toBeVisible();
    await expect(workShiftsPage.tableRows).toHaveCount(0);

    // -- Step 3: Deep link to the add form renders no form --
    await workShiftsPage.goto(workShiftsData.routes.add);
    await expect(page.getByText(workShiftsData.messages.credentialRequired)).toBeVisible();
    await expect(workShiftsPage.saveButton).not.toBeVisible();
  });
});
