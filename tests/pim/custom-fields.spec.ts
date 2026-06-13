import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { CustomFieldsApi } from '../../src/api/orangehrmOSAPI/CustomFieldsApi';
import { CUSTOM_FIELD_TYPE } from '../../test-data/pim/api/customFields';

/**
 * E2E coverage for PIM → Configuration → Custom Fields — P0 + P1 + P2.
 * Covers: TC-001 (+500/103/503), TC-002 (+501), TC-200, TC-100, TC-004, TC-300 (+301),
 *         TC-101, TC-302, TC-202, TC-502/503.
 * Source: docs/test-priority_PIM -> Custom fields.md
 *
 * NOTE: custom fields are instance-wide and capped at 10. The suite deletes every field it
 * creates after each test (resolve names → ids → DELETE) so the cap/empty-state stay stable.
 * Serial / single-worker.
 *
 * Run:
 *   npx playwright test tests/pim/custom-fields.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const cfData = frontend.customFields;
const EMP = cfData.sampleEmpNumber;
const ESS_TEST_USER = auth.essTestUser;

/** Field names created during a test; deleted in afterEach. */
const createdFields: string[] = [];

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

// ─── Admin — Custom Fields ──────────────────────────────────────────────────
test.describe('Admin — PIM Custom Fields', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  test.afterEach(async ({ orangehrmAdminApi }) => {
    if (createdFields.length === 0) return;
    await orangehrmAdminApi.loginAsAdmin();
    await new CustomFieldsApi(orangehrmAdminApi.request).deleteByNames([...createdFields]);
    createdFields.length = 0;
  });

  // ── P0 ──────────────────────────────────────────────────────────────────
  test('TC-PIM-CF-001 — Add a Text-or-Number field: defaults, save, toast, listed, counter decrements', async ({
    customFieldsPage,
    page,
  }) => {
    await customFieldsPage.gotoAddForm();
    // Folds TC-500: default add-form state — no Select Options field for the unset type.
    await expect(customFieldsPage.addFormHeading).toBeVisible();
    await expect(customFieldsPage.selectOptionsInput).toHaveCount(0);

    const name = `CF Text ${Date.now()}`;
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.textOrNumber);

    await customFieldsPage.saveAndVerifyToast();
    createdFields.push(name);

    // Folds TC-503: redirect back to the list.
    await expect(page).toHaveURL(cfData.urlPatterns.list);
    const row = customFieldsPage.rowByName(name).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(cfData.screens.personalDetails);
    await expect(row).toContainText(cfData.types.textOrNumber);

    // Folds TC-103: Remaining = cap − used (invariant, robust to any other fields present).
    const records = await customFieldsPage.recordsFoundCount();
    expect(records).toBeGreaterThanOrEqual(1);
    expect(await customFieldsPage.remainingCount()).toBe(10 - records);
  });

  test('TC-PIM-CF-002 — Add a Drop Down field: options field appears and persists', async ({
    customFieldsPage,
    page,
  }) => {
    await customFieldsPage.gotoAddForm();
    const name = `CF Dropdown ${Date.now()}`;
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.dropDown);

    // Folds TC-501: Select Options is revealed for Drop Down.
    await expect(customFieldsPage.selectOptionsInput).toBeVisible();
    await customFieldsPage.fillOptions(cfData.samples.dropDownOptions);

    await customFieldsPage.saveAndVerifyToast();
    createdFields.push(name);

    await expect(page).toHaveURL(cfData.urlPatterns.list);
    await expect(customFieldsPage.rowByName(name).first()).toContainText(cfData.types.dropDown);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────
  test('TC-PIM-CF-100 — Duplicate Field Name shows "Already exists" and blocks save', async ({
    customFieldsPage,
    orangehrmAdminApi,
    page,
  }) => {
    // Seed the duplicate through the API — this test owns uniqueness, not form mechanics.
    const dup = `CF Dup ${Date.now()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const customFieldsApi = new CustomFieldsApi(orangehrmAdminApi.request);
    await customFieldsApi.create({
      fieldName: dup,
      screen: cfData.screenKeys.personal,
      fieldType: CUSTOM_FIELD_TYPE.textOrNumber,
    });
    createdFields.push(dup);

    await customFieldsPage.gotoAddForm();
    await customFieldsPage.fillFieldName(dup);
    // Blur to deterministically trigger the async uniqueness validator.
    await customFieldsPage.fieldNameInput.blur();
    await expect(customFieldsPage.fieldNameError).toHaveText(cfData.messages.alreadyExists);

    // Saving with the error present must not create a second record.
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.textOrNumber);
    await customFieldsPage.saveButton.click();
    await expect(page).toHaveURL(cfData.urlPatterns.add);
    await expect(customFieldsPage.fieldNameError).toBeVisible();

    // Folds TC-303-clear: a unique value clears the error. Track it for cleanup — the form
    // can complete the previously-clicked (blocked) save once the name becomes valid.
    const uniqueName = `CF Unique ${Date.now()}`;
    createdFields.push(uniqueName);
    await customFieldsPage.fillFieldName(uniqueName);
    await expect(customFieldsPage.fieldNameError).toHaveCount(0);

    const matches = (await customFieldsApi.getAll()).filter((f) => f.fieldName === dup);
    expect(matches).toHaveLength(1);
  });

  test('TC-PIM-CF-004 — A created field renders on its target Screen in an employee record', async ({
    customFieldsPage,
    personalDetailsPage,
    page,
  }) => {
    const name = `CF OnScreen ${Date.now()}`;
    await customFieldsPage.gotoAddForm();
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.textOrNumber);
    await customFieldsPage.saveAndVerifyToast();
    createdFields.push(name);
    // Ensure the post-save SPA redirect settled before the cross-page navigation (avoids ERR_ABORTED).
    await expect(page).toHaveURL(cfData.urlPatterns.list);

    await personalDetailsPage.gotoPersonalDetails(EMP);
    await expect(personalDetailsPage.fieldGroupByLabel(name)).toBeVisible();
  });

  test('TC-PIM-CF-300 — Required validation on empty and partial submissions', async ({
    customFieldsPage,
    page,
  }) => {
    await customFieldsPage.gotoAddForm();

    // -- Step 1: empty save → Required on all three fields (TC-300) --
    await customFieldsPage.saveButton.click();
    await expect(page).toHaveURL(cfData.urlPatterns.add);
    await expect(customFieldsPage.allValidationErrors).toHaveCount(3);
    await expect(customFieldsPage.fieldNameError).toHaveText(cfData.messages.required);

    // -- Step 2: only Field Name filled → Screen + Type still Required (TC-301) --
    await customFieldsPage.fillFieldName(`CF Partial ${Date.now()}`);
    await customFieldsPage.saveButton.click();
    await expect(customFieldsPage.fieldNameError).toHaveCount(0);
    await expect(customFieldsPage.allValidationErrors).toHaveCount(2);
  });

  test('TC-PIM-CF-101 — Drop Down requires Select Options', async ({ customFieldsPage, page }) => {
    await customFieldsPage.gotoAddForm();
    await customFieldsPage.fillFieldName(`CF NoOptions ${Date.now()}`);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.dropDown);

    // Leave Select Options empty and save.
    await customFieldsPage.saveButton.click();
    await expect(page).toHaveURL(cfData.urlPatterns.add);
    await expect(customFieldsPage.selectOptionsError).toHaveText(cfData.messages.required);
  });

  // ── P2 ──────────────────────────────────────────────────────────────────
  test('TC-PIM-CF-302 — Switching Type from Drop Down to Text hides the options field', async ({
    customFieldsPage,
    orangehrmAdminApi,
    page,
  }) => {
    await customFieldsPage.gotoAddForm();
    const name = `CF Switch ${Date.now()}`;
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);

    await customFieldsPage.selectType(cfData.types.dropDown);
    await expect(customFieldsPage.selectOptionsInput).toBeVisible();
    await customFieldsPage.fillOptions('X, Y');

    // Switch to Text or Number — the options field is removed.
    await customFieldsPage.selectType(cfData.types.textOrNumber);
    await expect(customFieldsPage.selectOptionsInput).toHaveCount(0);

    await customFieldsPage.saveAndVerifyToast();
    createdFields.push(name);
    await expect(page).toHaveURL(cfData.urlPatterns.list);
    await expect(customFieldsPage.rowByName(name).first()).toContainText(cfData.types.textOrNumber);

    // Saved as a Text field with no leftover options.
    await orangehrmAdminApi.loginAsAdmin();
    const record = (await new CustomFieldsApi(orangehrmAdminApi.request).getAll()).find(
      (f) => f.fieldName === name,
    );
    expect(record?.fieldType).toBe(CUSTOM_FIELD_TYPE.textOrNumber);
    expect(record?.extraData ?? '').toBe('');
  });

  test('TC-PIM-CF-202 — Script payload in Field Name is stored inert (no XSS execution)', async ({
    customFieldsPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const name = `${cfData.samples.xssName} ${Date.now()}`;
    await customFieldsPage.gotoAddForm();
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.selectScreen(cfData.screens.personalDetails);
    await customFieldsPage.selectType(cfData.types.textOrNumber);
    await customFieldsPage.saveAndVerifyToast();
    createdFields.push(name);

    await expect(customFieldsPage.rowByName(name).first()).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes("alert('xss')")),
      );
    expect(scriptNodes).toHaveLength(0);
  });

  test('TC-PIM-CF-502 — Empty list state; Cancel discards without creating', async ({
    customFieldsPage,
    page,
  }) => {
    // Baseline is empty (afterEach cleans up): list shows the empty state and full quota.
    await customFieldsPage.gotoList();
    await expect(customFieldsPage.noRecordsText).toBeVisible();
    expect(await customFieldsPage.remainingCount()).toBe(10);

    // Folds TC-503: Cancel returns to the list and creates nothing.
    const name = `CF Cancelled ${Date.now()}`;
    await customFieldsPage.gotoAddForm();
    await customFieldsPage.fillFieldName(name);
    await customFieldsPage.cancelButton.click();
    await expect(page).toHaveURL(cfData.urlPatterns.list);
    await customFieldsPage.waitUntilTableLoaderDissapear();
    await expect(customFieldsPage.rowByName(name)).toHaveCount(0);
  });
});

// ─── P0: ESS security ─────────────────────────────────────────────────────
test.describe('Security — ESS cannot access PIM Custom Fields', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-PIM-CF-200 — ESS user: no PIM/Admin menu; Custom Field URLs render Credential Required', async ({
    customFieldsPage,
    page,
  }) => {
    // -- Step 1: PIM and Admin modules absent from the side navigation --
    await expect(customFieldsPage.mainMenuItem('PIM')).toHaveCount(0);
    await expect(customFieldsPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link to the list renders no grid and no Add button --
    await customFieldsPage.goto(cfData.routes.list);
    await expect(page.getByText(cfData.messages.credentialRequired)).toBeVisible();
    await expect(customFieldsPage.addButton).not.toBeVisible();

    // -- Step 3: Deep link to the add form renders no form --
    await customFieldsPage.goto(cfData.routes.add);
    await expect(page.getByText(cfData.messages.credentialRequired)).toBeVisible();
    await expect(customFieldsPage.saveButton).not.toBeVisible();
  });
});
