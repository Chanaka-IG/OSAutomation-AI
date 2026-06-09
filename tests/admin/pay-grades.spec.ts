import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { PayGradesApi } from '../../src/api/orangehrmOSAPI/PayGradesApi';

/**
 * E2E coverage for Pay Grades (Admin → Job → Pay Grades) — P0 + P1 + P2.
 * Covers: TC-001 (+002/501/502/504), TC-102, TC-201, TC-100+ (101/103/503),
 * TC-003 (+108/403/405), TC-105, TC-204, TC-004, TC-005, TC-106, TC-505.
 * Source: docs/test-priority_Pay Grades.md
 *
 * Run:
 *   npx playwright test tests/admin/pay-grades.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const payGradesData = frontend.adminPayGrades;

// ─── Suite-level state ──────────────────────────────────────────────────────
/** Names created during the run; resolved to ids and hard-deleted in afterAll. */
const createdNames: string[] = [];

/** ESS user seeded as master data (empNumber=2, userRoleId=2) — read-only login here. */
const ESS_TEST_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };

// ─── Suite setup / teardown ─────────────────────────────────────────────────
// NOTE: `orangehrmAdminApi` is test-scoped — its request context is disposed after
// each test/hook, so every consumer logs in and constructs its own PayGradesApi.

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ masterDataReadiness }) => {
  void masterDataReadiness;
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdNames.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const cleanupApi = new PayGradesApi(orangehrmAdminApi.request);
  const all = await cleanupApi.getAll();
  const ids = all.filter((pg) => createdNames.includes(pg.name)).map((pg) => pg.id);
  await cleanupApi.deleteByIds(ids);
});

// ─── Admin — Add / Edit Pay Grade ───────────────────────────────────────────
test.describe('Admin — Pay Grade creation & validation', () => {
  test.beforeEach(async ({ loginPage, payGradesPage }) => {
    await loginPage.loginAs('admin');
    await payGradesPage.gotoAddForm();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-PG-001 — Add pay grade with required Name redirects to the edit page with an empty Currencies grid', async ({
    payGradesPage,
    orangehrmAdminApi,
    page,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const payGradesApi = new PayGradesApi(orangehrmAdminApi.request);
    const countBefore = (await payGradesApi.getAll()).length;
    const name = `MPG Required Only ${Date.now()}`;

    await payGradesPage.saveName(name);

    // Folds TC-502: Save lands on the edit page (NOT the list) with the Currencies panel
    await expect(page).toHaveURL(payGradesData.urlPatterns.edit);
    await expect(payGradesPage.editFormHeading).toBeVisible();
    await expect(payGradesPage.nameInput).toHaveValue(name);
    await expect(payGradesPage.currenciesHeading).toBeVisible();
    await expect(page.getByText('No Records Found').first()).toBeVisible();
    createdNames.push(name);

    // Folds TC-002 / TC-504: the new row is present and the counter incremented by 1
    await payGradesPage.gotoList();
    await expect(payGradesPage.rowByName(name).first()).toBeVisible();
    expect(await payGradesPage.recordsFoundCount()).toBe(countBefore + 1);
  });

  test('TC-PG-102 — Duplicate name shows live "Already exists" and blocks save', async ({
    payGradesPage,
    orangehrmAdminApi,
    page,
  }) => {
    const duplicate = payGradesData.masterData.duplicateName;

    // Error fires while typing, before any save
    await payGradesPage.fillName(duplicate);
    await expect(payGradesPage.nameFieldError).toHaveText(payGradesData.messages.alreadyExists);

    // Saving with the error present must not create a duplicate or redirect to an edit page
    await payGradesPage.saveButton.click();
    await expect(page).toHaveURL(payGradesData.urlPatterns.add);
    await expect(payGradesPage.nameFieldError).toBeVisible();

    await orangehrmAdminApi.loginAsAdmin();
    const payGradesApi = new PayGradesApi(orangehrmAdminApi.request);
    const matches = (await payGradesApi.getAll()).filter((pg) => pg.name === duplicate);
    expect(matches).toHaveLength(1);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-PG-100 — Combined Name validation: Required, 50-char limit, error clears when corrected', async ({
    payGradesPage,
    page,
  }) => {
    // -- Step 1: empty save shows Required (TC-101) --
    await payGradesPage.saveButton.click();
    await expect(payGradesPage.nameFieldError).toHaveText(payGradesData.messages.required);
    await expect(page).toHaveURL(payGradesData.urlPatterns.add);

    // -- Step 2: 51-char name shows the live length error (TC-103) --
    await payGradesPage.fillName(payGradesData.samples.overlongName);
    await expect(payGradesPage.nameFieldError).toHaveText(payGradesData.messages.maxLength);

    // -- Step 3: a valid unique name clears the error (TC-503) --
    await payGradesPage.fillName(`MPG Valid ${Date.now()}`);
    await expect(payGradesPage.nameFieldError).toHaveCount(0);

    // Leave without saving — nothing to clean up
    await payGradesPage.cancelButton.click();
    await expect(page).toHaveURL(payGradesData.urlPatterns.list);
  });

  test('TC-PG-204 — Script payload in Name is stored inert (no XSS execution)', async ({
    payGradesPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    // Kept under the 50-char Name limit
    const xssName = `<img src=x onerror=alert(1)> ${Date.now()}`;
    await payGradesPage.saveName(xssName);

    // Created — lands on the edit page
    await expect(page).toHaveURL(payGradesData.urlPatterns.edit);
    createdNames.push(xssName);

    // The list re-renders every name — the payload must appear as literal text only
    await payGradesPage.gotoList();
    await expect(payGradesPage.rowByName(xssName).first()).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    // No inline script node may contain the injected alert
    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes('onerror=alert(1)')),
      );
    expect(scriptNodes).toHaveLength(0);
  });
});

// ─── Admin — Currencies sub-grid (edit page) ────────────────────────────────
test.describe('Admin — Pay Grade currencies', () => {
  // Each test seeds its own grade via API, then drives the currency UI on the edit page.
  let payGradeId: number;
  let payGradeName: string;

  test.beforeEach(async ({ loginPage, orangehrmAdminApi, payGradesPage }) => {
    payGradeName = `MPG Currency Host ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const payGradesApi = new PayGradesApi(orangehrmAdminApi.request);
    await payGradesApi.create({ name: payGradeName });
    createdNames.push(payGradeName);
    payGradeId = (await payGradesApi.getIdByName(payGradeName))!;

    await loginPage.loginAs('admin');
    await payGradesPage.goto(`${payGradesData.routes.add}/${payGradeId}`);
    await payGradesPage.waitUntilFormLoaderDissapear();
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-PG-003 — Add a currency with min/max salary (Currency required first)', async ({
    payGradesPage,
  }) => {
    await payGradesPage.openAddCurrency();

    // Folds TC-108: Currency is required — saving with none selected blocks and shows Required
    await payGradesPage.currencySaveButton.click();
    await expect(payGradesPage.currencyFieldError).toHaveText(payGradesData.messages.required);

    // Now add a valid band
    await payGradesPage.addCurrency({
      currency: payGradesData.samples.currencyOption,
      min: payGradesData.samples.minSalary,
      max: payGradesData.samples.maxSalary,
    });

    const row = payGradesPage.currencyRowByName(payGradesData.samples.currencyGridName).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(payGradesData.samples.minSalaryFormatted);
    await expect(row).toContainText(payGradesData.samples.maxSalaryFormatted);
  });

  test('TC-PG-105 — Minimum Salary greater than Maximum Salary is rejected with dual inline errors', async ({
    payGradesPage,
  }) => {
    await payGradesPage.openAddCurrency();
    await payGradesPage.selectOxdOption(
      payGradesPage.currencyDropdown,
      payGradesData.samples.currencyOption,
    );
    await payGradesPage.minSalaryInput.fill('9000');
    await payGradesPage.maxSalaryInput.fill('5000');
    await payGradesPage.currencySaveButton.click();

    await expect(payGradesPage.minSalaryError).toHaveText(payGradesData.messages.minSalaryTooHigh);
    await expect(payGradesPage.maxSalaryError).toHaveText(payGradesData.messages.maxSalaryTooLow);

    // Save was blocked — no currency row was created
    await expect(payGradesPage.currencyRowByName(payGradesData.samples.currencyGridName)).toHaveCount(0);
  });

  // ── P2 ──────────────────────────────────────────────────────────────────

  test('TC-PG-004 — Add a currency with no salary values (Min/Max optional)', async ({
    payGradesPage,
  }) => {
    await payGradesPage.openAddCurrency();
    await payGradesPage.addCurrency({ currency: payGradesData.samples.currencyOption });

    await expect(
      payGradesPage.currencyRowByName(payGradesData.samples.currencyGridName).first(),
    ).toBeVisible();
  });

  test('TC-PG-106 — A currency already assigned is excluded from the Add Currency dropdown', async ({
    payGradesPage,
  }) => {
    // Assign USD first
    await payGradesPage.openAddCurrency();
    await payGradesPage.addCurrency({ currency: payGradesData.samples.currencyOption });
    await expect(
      payGradesPage.currencyRowByName(payGradesData.samples.currencyGridName).first(),
    ).toBeVisible();

    // Re-open Add Currency — USD must no longer be offered
    await payGradesPage.openAddCurrency();
    const options = await payGradesPage.currencyOptions();
    expect(options).not.toContain(payGradesData.samples.currencyOption);
    // Sanity: other currencies are still offered
    expect(options).toContain('EUR - Euro');
  });
});

// ─── Admin — Rename & delete ────────────────────────────────────────────────
test.describe('Admin — Pay Grade rename & delete', () => {
  // ── P2 ──────────────────────────────────────────────────────────────────

  test('TC-PG-005 — Rename an existing pay grade persists the new name', async ({
    loginPage,
    orangehrmAdminApi,
    payGradesPage,
    page,
  }) => {
    const original = `MPG Rename Src ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const payGradesApi = new PayGradesApi(orangehrmAdminApi.request);
    await payGradesApi.create({ name: original });
    const id = (await payGradesApi.getIdByName(original))!;

    const renamed = `MPG Renamed ${Date.now()}`;
    createdNames.push(renamed); // cleanup target after rename

    await loginPage.loginAs('admin');
    await payGradesPage.goto(`${payGradesData.routes.add}/${id}`);
    await payGradesPage.waitUntilFormLoaderDissapear();

    await payGradesPage.saveName(renamed);
    await expect(payGradesPage.waitForSuccessToast()).resolves.toMatch(/successfully updated/i);

    await payGradesPage.gotoList();
    await expect(payGradesPage.rowByName(renamed).first()).toBeVisible();
    await expect(payGradesPage.rowByName(original)).toHaveCount(0);
    void page;
  });

  test('TC-PG-505 — Delete confirmation dialog: No keeps the row, Yes removes it', async ({
    loginPage,
    orangehrmAdminApi,
    payGradesPage,
  }) => {
    const name = `MPG Delete Dialog ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const payGradesApi = new PayGradesApi(orangehrmAdminApi.request);
    await payGradesApi.create({ name });

    await loginPage.loginAs('admin');
    await payGradesPage.gotoList();
    await expect(payGradesPage.rowByName(name).first()).toBeVisible();

    // -- Step 1: dialog renders the verified confirmation copy --
    await payGradesPage.openDeleteDialogForName(name);
    await expect(payGradesPage.deleteDialog).toContainText(payGradesData.deleteDialog.title);
    await expect(payGradesPage.deleteDialog).toContainText(payGradesData.deleteDialog.body);

    // -- Step 2: "No, Cancel" keeps the record --
    await payGradesPage.cancelDeleteButton.click();
    await expect(payGradesPage.deleteDialog).not.toBeVisible();
    await expect(payGradesPage.rowByName(name).first()).toBeVisible();

    // -- Step 3: "Yes, Delete" hard-deletes the record --
    await payGradesPage.deleteRowByName(name);
    await expect(payGradesPage.rowByName(name)).toHaveCount(0);
  });
});

// ─── P0: ESS security ───────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Pay Grades administration', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-PG-201 — ESS user: no Admin menu; Pay Grade URLs render Credential Required', async ({
    payGradesPage,
    page,
  }) => {
    // -- Step 1: Admin module absent from the side navigation --
    await expect(payGradesPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link to the list renders no grid and no Add button --
    await payGradesPage.goto(payGradesData.routes.list);
    await expect(page.getByText(payGradesData.messages.credentialRequired)).toBeVisible();
    await expect(payGradesPage.tableRows).toHaveCount(0);

    // -- Step 3: Deep link to the add form renders no form --
    await payGradesPage.goto(payGradesData.routes.add);
    await expect(page.getByText(payGradesData.messages.credentialRequired)).toBeVisible();
    await expect(payGradesPage.addFormHeading).not.toBeVisible();
  });
});
