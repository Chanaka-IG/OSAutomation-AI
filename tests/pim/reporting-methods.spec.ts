import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ReportingMethodsApi } from '../../src/api/orangehrmOSAPI/ReportingMethodsApi';

/**
 * E2E coverage for PIM → Configuration → Reporting Methods — P0 + P1 + P2.
 * Covers: TC-001 (+500/502), TC-100 (+302), TC-200, TC-003, TC-300 (+301),
 *         TC-502, TC-202, TC-402 (+503), TC-101.
 * Source: docs/test-priority_PIM -> Reproting methods.md
 *
 * NOTE: reporting methods are instance-wide; the defaults "Direct"/"Indirect" must NOT be
 * deleted. The suite deletes only the methods it creates (afterEach). Serial / single-worker.
 *
 * Run:
 *   npx playwright test tests/pim/reporting-methods.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const rmData = frontend.reportingMethods;
const EMP = rmData.sampleEmpNumber;
const ESS_TEST_USER = auth.essTestUser;

/** Method names created during a test; deleted in afterEach. */
const createdMethods: string[] = [];

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Admin — Reporting Methods ──────────────────────────────────────────────
test.describe('Admin — PIM Reporting Methods', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  test.afterEach(async ({ orangehrmAdminApi }) => {
    if (createdMethods.length === 0) return;
    await orangehrmAdminApi.loginAsAdmin();
    await new ReportingMethodsApi(orangehrmAdminApi.request).deleteByNames([...createdMethods]);
    createdMethods.length = 0;
  });

  // ── P0 ──────────────────────────────────────────────────────────────────
  test('TC-RM-001 — Add a reporting method: save, toast, listed, counter increments', async ({
    reportingMethodsPage,
    orangehrmAdminApi,
    page,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const api = new ReportingMethodsApi(orangehrmAdminApi.request);
    const countBefore = (await api.getAll()).length;

    await reportingMethodsPage.gotoAddForm();
    // Folds TC-500: minimal single-field add form.
    await expect(reportingMethodsPage.addFormTitle).toBeVisible();
    await expect(reportingMethodsPage.nameInput).toHaveValue('');

    const name = `RM Method ${Date.now()}`;
    await reportingMethodsPage.fillName(name);
    await reportingMethodsPage.saveAndVerifyToast();
    createdMethods.push(name);

    await expect(page).toHaveURL(rmData.urlPatterns.list);
    await expect(reportingMethodsPage.rowByName(name).first()).toBeVisible();
    expect(await reportingMethodsPage.recordsFoundCount()).toBe(countBefore + 1);
  });

  test('TC-RM-100 — Duplicate name shows "Already exists" and blocks save', async ({
    reportingMethodsPage,
    orangehrmAdminApi,
    page,
  }) => {
    const duplicate = rmData.duplicateName; // seeded default "Direct"

    await reportingMethodsPage.gotoAddForm();
    await reportingMethodsPage.fillName(duplicate);
    await reportingMethodsPage.nameInput.blur();
    await expect(reportingMethodsPage.nameError).toHaveText(rmData.messages.alreadyExists);

    // Saving with the error present must not create a second record.
    await reportingMethodsPage.saveButton.click();
    await expect(page).toHaveURL(rmData.urlPatterns.add);
    await expect(reportingMethodsPage.nameError).toBeVisible();

    // Folds TC-302: a unique value clears the error. Track it for cleanup in case the form
    // completes the previously-clicked (blocked) save once the name becomes valid.
    const uniqueName = `RM Unique ${Date.now()}`;
    createdMethods.push(uniqueName);
    await reportingMethodsPage.fillName(uniqueName);
    await expect(reportingMethodsPage.nameError).toHaveCount(0);

    await orangehrmAdminApi.loginAsAdmin();
    const api = new ReportingMethodsApi(orangehrmAdminApi.request);
    const matches = (await api.getAll()).filter((m) => m.name === duplicate);
    expect(matches).toHaveLength(1);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────
  test('TC-RM-003 — A created method appears in the Report-to "Reporting Method" dropdown', async ({
    reportToPage,
    orangehrmAdminApi,
  }) => {
    // Seed through the API — this test owns propagation, not form mechanics.
    const name = `RM ReportTo ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    await new ReportingMethodsApi(orangehrmAdminApi.request).create({ name });
    createdMethods.push(name);

    await reportToPage.gotoReportTo(EMP);
    await reportToPage.openAddSupervisorReportingMethod();
    await expect(reportToPage.reportingMethodOption(name)).toBeVisible();
  });

  test('TC-RM-300 — Empty and whitespace-only name show "Required" and block save', async ({
    reportingMethodsPage,
    page,
  }) => {
    await reportingMethodsPage.gotoAddForm();

    // -- Step 1: empty save → Required (TC-300) --
    await reportingMethodsPage.saveButton.click();
    await expect(reportingMethodsPage.nameError).toHaveText(rmData.messages.required);
    await expect(page).toHaveURL(rmData.urlPatterns.add);

    // -- Step 2: whitespace-only is treated as empty (TC-301) --
    await reportingMethodsPage.fillName(rmData.samples.whitespaceName);
    await reportingMethodsPage.saveButton.click();
    await expect(reportingMethodsPage.nameError).toHaveText(rmData.messages.required);
    await expect(page).toHaveURL(rmData.urlPatterns.add);
  });

  test('TC-RM-502 — Cancel returns to the list without creating a record', async ({
    reportingMethodsPage,
    page,
  }) => {
    const name = `RM Cancelled ${Date.now()}`;
    await reportingMethodsPage.gotoAddForm();
    await reportingMethodsPage.fillName(name);
    await reportingMethodsPage.cancelButton.click();

    await expect(page).toHaveURL(rmData.urlPatterns.list);
    await reportingMethodsPage.waitUntilTableLoaderDissapear();
    await expect(reportingMethodsPage.rowByName(name)).toHaveCount(0);
  });

  // ── P2 ──────────────────────────────────────────────────────────────────
  test('TC-RM-202 — Script payload in name is stored inert (no XSS execution)', async ({
    reportingMethodsPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const name = `${rmData.samples.xssName} ${Date.now()}`;
    await reportingMethodsPage.gotoAddForm();
    await reportingMethodsPage.fillName(name);
    await reportingMethodsPage.saveAndVerifyToast();
    createdMethods.push(name);

    await expect(reportingMethodsPage.rowByName(name).first()).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes("alert('xss')")),
      );
    expect(scriptNodes).toHaveLength(0);
  });

  test('TC-RM-402 — Delete confirmation dialog: No keeps the row, Yes removes it', async ({
    reportingMethodsPage,
    orangehrmAdminApi,
  }) => {
    // Seed through the API — this test owns the dialog, not form mechanics.
    const name = `RM Delete ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    await new ReportingMethodsApi(orangehrmAdminApi.request).create({ name });
    createdMethods.push(name);

    await reportingMethodsPage.gotoList();
    await expect(reportingMethodsPage.rowByName(name).first()).toBeVisible();

    // Folds TC-503: dialog copy + "No, Cancel" keeps the record.
    await reportingMethodsPage.openDeleteDialogForName(name);
    await expect(reportingMethodsPage.deleteDialog).toContainText(rmData.deleteDialog.title);
    await expect(reportingMethodsPage.deleteDialog).toContainText(rmData.deleteDialog.body);
    await reportingMethodsPage.cancelDeleteButton.click();
    await expect(reportingMethodsPage.rowByName(name).first()).toBeVisible();

    // "Yes, Delete" removes it.
    await reportingMethodsPage.deleteRowByName(name);
    await expect(reportingMethodsPage.rowByName(name)).toHaveCount(0);
  });

  test('TC-RM-101 — Uniqueness is case-sensitive (a different-case variant is allowed)', async ({
    reportingMethodsPage,
  }) => {
    await reportingMethodsPage.gotoAddForm();

    // Exact-case duplicate fires the validator (proves it is active).
    await reportingMethodsPage.fillName(rmData.duplicateName); // "Direct"
    await reportingMethodsPage.nameInput.blur();
    await expect(reportingMethodsPage.nameError).toHaveText(rmData.messages.alreadyExists);

    // A different-case variant clears the error — uniqueness is case-sensitive on this instance.
    await reportingMethodsPage.fillName(rmData.duplicateName.toLowerCase()); // "direct"
    await reportingMethodsPage.nameInput.blur();
    await expect(reportingMethodsPage.nameError).toHaveCount(0);
  });
});

// ─── P0: ESS security ─────────────────────────────────────────────────────
test.describe('Security — ESS cannot access PIM Reporting Methods', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-RM-200 — ESS user: no PIM/Admin menu; Reporting Method URLs render Credential Required', async ({
    reportingMethodsPage,
    page,
  }) => {
    await expect(reportingMethodsPage.mainMenuItem('PIM')).toHaveCount(0);
    await expect(reportingMethodsPage.mainMenuItem('Admin')).toHaveCount(0);

    await reportingMethodsPage.goto(rmData.routes.list);
    await expect(page.getByText(rmData.messages.credentialRequired)).toBeVisible();
    await expect(reportingMethodsPage.addButton).not.toBeVisible();

    await reportingMethodsPage.goto(rmData.routes.add);
    await expect(page.getByText(rmData.messages.credentialRequired)).toBeVisible();
    await expect(reportingMethodsPage.saveButton).not.toBeVisible();
  });
});
