import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmploymentStatusesApi } from '../../src/api/orangehrmOSAPI/EmploymentStatusesApi';

/**
 * E2E coverage for Add Employment Status (Admin → Job → Employment Status) — P0 + P1 + P2.
 * Covers: TC-001 (+002/501/504), TC-102, TC-300 combined validation (101/103/503),
 * TC-204, TC-201 (P0); TC-003 (+502), TC-505 (P2).
 * Source: docs/test-priority_Add Employement status.md
 *
 * Run:
 *   npx playwright test tests/admin/add-employment-status.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const esData = frontend.adminEmploymentStatus;
const ESS_TEST_USER = frontend.auth.essTestUser;

// ─── Suite-level state ──────────────────────────────────────────────────────
/** Names created during the run; resolved to ids and hard-deleted in afterAll. */
const createdNames: string[] = [];

// ─── Suite setup / teardown ─────────────────────────────────────────────────
// NOTE: `orangehrmAdminApi` is test-scoped — its request context is disposed after
// each test/hook, so every consumer logs in and constructs its own EmploymentStatusesApi.

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ masterDataReadiness }) => {
  void masterDataReadiness;
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdNames.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const cleanupApi = new EmploymentStatusesApi(orangehrmAdminApi.request);
  const all = await cleanupApi.getAll();
  const ids = all.filter((s) => createdNames.includes(s.name)).map((s) => s.id);
  await cleanupApi.deleteByIds(ids);
});

// ─── Admin — Add Employment Status form ─────────────────────────────────────
test.describe('Admin — Add Employment Status form', () => {
  test.beforeEach(async ({ loginPage, employmentStatusPage }) => {
    await loginPage.loginAs('admin');
    await employmentStatusPage.gotoAddForm();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AES-001 — Add employment status with required Name saves, toasts, redirects to list, increments counter', async ({
    employmentStatusPage,
    orangehrmAdminApi,
    page,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new EmploymentStatusesApi(orangehrmAdminApi.request);
    const countBefore = (await api.getAll()).length;
    const name = `MES Suite Required Only ${Date.now()}`;

    await employmentStatusPage.fillName(name);
    const toast = await employmentStatusPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);

    // Folds TC-504 (toast asserted above) + redirect back to the LIST (not an edit page)
    await expect(page).toHaveURL(esData.urlPatterns.list);

    // Folds TC-002: new row present and counter incremented by 1
    await expect(employmentStatusPage.rowByName(name).first()).toBeVisible();
    createdNames.push(name);
    expect(await employmentStatusPage.recordsFoundCount()).toBe(countBefore + 1);
  });

  test('TC-ADMIN-AES-102 — Duplicate name shows live "Already exists" and blocks save', async ({
    employmentStatusPage,
    orangehrmAdminApi,
    page,
  }) => {
    const duplicate = esData.masterData.duplicateName;

    // Error fires while typing, before any save
    await employmentStatusPage.fillName(duplicate);
    await expect(employmentStatusPage.nameFieldError).toHaveText(esData.messages.alreadyExists);

    // Save with the error present must not create a duplicate
    await employmentStatusPage.saveButton.click();
    await expect(page).toHaveURL(esData.urlPatterns.add);
    await expect(employmentStatusPage.nameFieldError).toBeVisible();

    // The seeded status still exists exactly once
    await orangehrmAdminApi.loginAsAdmin();
    const api = new EmploymentStatusesApi(orangehrmAdminApi.request);
    const matches = (await api.getAll()).filter((s) => s.name === duplicate);
    expect(matches).toHaveLength(1);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AES-300 — Combined validation: Required, 50-char limit, error clearing', async ({
    employmentStatusPage,
    page,
  }) => {
    // -- Step 1: Empty save shows Required (TC-101) --
    await employmentStatusPage.saveButton.click();
    await expect(employmentStatusPage.nameFieldError).toHaveText(esData.messages.required);
    await expect(page).toHaveURL(esData.urlPatterns.add);

    // -- Step 2: Over-long name shows the live length error (TC-103) --
    await employmentStatusPage.fillName(esData.samples.overlongName);
    await expect(employmentStatusPage.nameFieldError).toHaveText(esData.messages.maxLength);

    // -- Step 3: A valid unique name clears the error (TC-503) --
    await employmentStatusPage.fillName(`MES Suite Valid ${Date.now()}`);
    await expect(employmentStatusPage.nameFieldError).toHaveCount(0);

    // Leave without saving — nothing to clean up
    await employmentStatusPage.cancelButton.click();
    await expect(page).toHaveURL(esData.urlPatterns.list);
  });

  test('TC-ADMIN-AES-204 — Script payload in Name is stored inert (no XSS execution)', async ({
    employmentStatusPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const xssName = `<script>alert('xss')</script> MES ${Date.now()}`;
    await employmentStatusPage.fillName(xssName);
    const toast = await employmentStatusPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);

    // The list re-renders every name — the payload must appear as literal text only
    await expect(page).toHaveURL(esData.urlPatterns.list);
    await expect(employmentStatusPage.rowByName(xssName).first()).toBeVisible();
    createdNames.push(xssName);

    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    // No inline script node may contain the injected alert
    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes("alert('xss')")),
      );
    expect(scriptNodes).toHaveLength(0);
  });
});

// ─── P2: secondary paths — rename, delete dialog ─────────────────────────────
// Each test needs exactly one pre-seeded status to act on; the record is created via the
// API in a hook (best-practices §5: seed through APIs in hooks, never in the test body) and
// resolved into `seededName` for the test to consume.
test.describe('Admin — Employment Status secondary paths (P2)', () => {
  let seededName: string;

  test.beforeEach(async ({ loginPage, employmentStatusPage, orangehrmAdminApi }) => {
    seededName = `MES Suite P2 ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const api = new EmploymentStatusesApi(orangehrmAdminApi.request);
    await api.create({ name: seededName });
    createdNames.push(seededName);

    await loginPage.loginAs('admin');
    await employmentStatusPage.gotoList();
    await expect(employmentStatusPage.rowByName(seededName).first()).toBeVisible();
  });

  test('TC-ADMIN-AES-003 — Rename an existing status via the edit page', async ({
    employmentStatusPage,
    page,
  }) => {
    const renamed = `MES Suite Rename Dst ${Date.now()}`;

    // -- Open the edit form (folds TC-502: heading + pre-filled Name) --
    await employmentStatusPage.openEditFormForName(seededName);
    await expect(employmentStatusPage.editFormHeading).toBeVisible();
    await expect(employmentStatusPage.nameInput).toHaveValue(seededName);

    // -- Rename and save --
    await employmentStatusPage.fillName(renamed);
    // Edit save toasts "Successfully Updated"; create toasts "Successfully Saved".
    const toast = await employmentStatusPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully (saved|updated)/i);
    await expect(page).toHaveURL(esData.urlPatterns.list);

    createdNames.push(renamed);
    await expect(employmentStatusPage.rowByName(renamed).first()).toBeVisible();
    await expect(employmentStatusPage.rowByName(seededName)).toHaveCount(0);
  });

  test('TC-ADMIN-AES-505 — Delete confirmation dialog: No keeps the row, Yes removes it', async ({
    employmentStatusPage,
  }) => {
    const name = seededName;

    // -- Step 1: dialog renders the verified confirmation copy --
    await employmentStatusPage.openDeleteDialogForName(name);
    await expect(employmentStatusPage.deleteDialog).toContainText(esData.deleteDialog.title);
    await expect(employmentStatusPage.deleteDialog).toContainText(esData.deleteDialog.body);

    // -- Step 2: "No, Cancel" keeps the record --
    await employmentStatusPage.cancelDeleteButton.click();
    await expect(employmentStatusPage.deleteDialog).not.toBeVisible();
    await expect(employmentStatusPage.rowByName(name).first()).toBeVisible();

    // -- Step 3: "Yes, Delete" hard-deletes the record --
    await employmentStatusPage.deleteRowByName(name);
    await expect(employmentStatusPage.rowByName(name)).toHaveCount(0);
  });
});

// ─── P0: ESS security ────────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Employment Status administration', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-ADMIN-AES-201 — ESS user: no Admin menu; Employment Status URLs render Credential Required', async ({
    employmentStatusPage,
    page,
  }) => {
    // -- Step 1: Admin module absent from the side navigation --
    await expect(employmentStatusPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link to the list renders no grid and no Add button --
    await employmentStatusPage.goto(esData.routes.list);
    await expect(page.getByText(esData.messages.credentialRequired)).toBeVisible();
    await expect(employmentStatusPage.addButton).not.toBeVisible();
    await expect(employmentStatusPage.tableRows).toHaveCount(0);

    // -- Step 3: Deep link to the add form renders no form --
    await employmentStatusPage.goto(esData.routes.add);
    await expect(page.getByText(esData.messages.credentialRequired)).toBeVisible();
    await expect(employmentStatusPage.saveButton).not.toBeVisible();
  });
});
