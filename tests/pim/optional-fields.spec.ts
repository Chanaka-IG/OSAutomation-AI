import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { api, frontend } from '../../test-data';
import { PimOptionalFieldsApi } from '../../src/api/orangehrmOSAPI/PimOptionalFieldsApi';
import type { OptionalFieldsConfig } from '../../test-data/pim/api/optionalFields';

/**
 * E2E coverage for PIM → Configuration → Optional Fields (`/pim/configurePim`) — P0 + P1 + P2.
 * Covers: TC-001 (+500/501/502), TC-100, TC-200, TC-101, TC-003 (+004), TC-301,
 *         TC-102, TC-402, TC-401 (+300).
 * Source: docs/test-priority_PIM -> Optional Fields.md
 *
 * NOTE: the optional-field config is an INSTANCE-WIDE SINGLETON. The suite snapshots the
 * current config in beforeAll, resets to a known baseline (all-off) before each test, and
 * restores the original snapshot in afterAll. Runs serial / single-worker to avoid races.
 *
 * Run:
 *   npx playwright test tests/pim/optional-fields.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const ofData = frontend.optionalFields;
const ALL_OFF: OptionalFieldsConfig = api.optionalFields.allOff;
const EMP = ofData.sampleEmpNumber;
const ESS_TEST_USER = auth.essTestUser;

/** Snapshot of the instance config taken before the suite, restored after. */
let originalConfig: OptionalFieldsConfig;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  originalConfig = await new PimOptionalFieldsApi(orangehrmAdminApi.request).getConfig();
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  await new PimOptionalFieldsApi(orangehrmAdminApi.request).setConfig(originalConfig);
});

// ─── Admin — Optional Fields configuration ──────────────────────────────────
test.describe('Admin — PIM Optional Fields', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ orangehrmAdminApi, loginPage, optionalFieldsPage }) => {
    // Deterministic baseline: reset the shared singleton to all-off before each test.
    await orangehrmAdminApi.loginAsAdmin();
    await new PimOptionalFieldsApi(orangehrmAdminApi.request).setConfig(ALL_OFF);

    await loginPage.loginAs('admin');
    await optionalFieldsPage.gotoConfig();
  });

  // ── P2: page state (folds TC-500/501/502) ────────────────────────────────
  test('TC-PIM-OF-500 — Page renders all four toggles; a toggle reflects its click state', async ({
    optionalFieldsPage,
  }) => {
    await expect(optionalFieldsPage.title).toBeVisible();
    await expect(optionalFieldsPage.saveButton).toBeVisible();

    // Baseline (reset in beforeEach) — every toggle hydrates off.
    for (const field of ['deprecated', 'ssn', 'sin', 'tax'] as const) {
      await expect(optionalFieldsPage.checkbox(field)).toBeVisible();
      expect(await optionalFieldsPage.isOn(field)).toBe(false);
    }

    // Folds TC-501: clicking the switch flips the underlying checkbox before any save.
    await optionalFieldsPage.setToggle('ssn', true);
    expect(await optionalFieldsPage.isOn('ssn')).toBe(true);
  });

  // ── P0 ────────────────────────────────────────────────────────────────────
  test('TC-PIM-OF-001 — Enable a field, save, toast, and the state persists on reload', async ({
    optionalFieldsPage,
    orangehrmAdminApi,
  }) => {
    await optionalFieldsPage.setToggle('ssn', true);
    await optionalFieldsPage.saveAndVerifyToast();

    // Folds TC-502: reload hydrates the saved state.
    await optionalFieldsPage.gotoConfig();
    expect(await optionalFieldsPage.isOn('ssn')).toBe(true);

    // Persisted server-side.
    const cfg = await new PimOptionalFieldsApi(orangehrmAdminApi.request).getConfig();
    expect(cfg.showSSN).toBe(true);
  });

  test('TC-PIM-OF-100 — Enabling "Show SSN" surfaces the SSN field in Personal Details', async ({
    optionalFieldsPage,
    personalDetailsPage,
  }) => {
    // Off (baseline): the SSN field is absent from Personal Details.
    await personalDetailsPage.gotoPersonalDetails(EMP);
    await expect(personalDetailsPage.fieldGroupByLabel('SSN Number')).toHaveCount(0);

    // Enable + save.
    await optionalFieldsPage.gotoConfig();
    await optionalFieldsPage.setToggle('ssn', true);
    await optionalFieldsPage.saveAndVerifyToast();

    // On: the SSN field now renders.
    await personalDetailsPage.gotoPersonalDetails(EMP);
    await expect(personalDetailsPage.fieldGroupByLabel('SSN Number')).toBeVisible();
  });

  // ── P1 ────────────────────────────────────────────────────────────────────
  test('TC-PIM-OF-101 — Enabling "Show Deprecated Fields" surfaces Nickname/Smoker/Military Service', async ({
    optionalFieldsPage,
    personalDetailsPage,
  }) => {
    await optionalFieldsPage.setToggle('deprecated', true);
    await optionalFieldsPage.saveAndVerifyToast();

    await personalDetailsPage.gotoPersonalDetails(EMP);
    for (const label of ofData.fields.deprecated.personalDetailsLabels) {
      await expect(personalDetailsPage.fieldGroupByLabel(label)).toBeVisible();
    }
  });

  test('TC-PIM-OF-003 — Enable all four toggles; state persists across navigation', async ({
    optionalFieldsPage,
    employeeListPage,
    orangehrmAdminApi,
  }) => {
    for (const field of ['deprecated', 'ssn', 'sin', 'tax'] as const) {
      await optionalFieldsPage.setToggle(field, true);
    }
    await optionalFieldsPage.saveAndVerifyToast();

    // Folds TC-004: navigate away and back — toggles hydrate to the saved state.
    await employeeListPage.gotoEmployeeList();
    await optionalFieldsPage.gotoConfig();
    for (const field of ['deprecated', 'ssn', 'sin', 'tax'] as const) {
      expect(await optionalFieldsPage.isOn(field)).toBe(true);
    }

    const cfg = await new PimOptionalFieldsApi(orangehrmAdminApi.request).getConfig();
    expect(cfg).toEqual({
      pimShowDeprecatedFields: true,
      showSIN: true,
      showSSN: true,
      showTaxExemptions: true,
    });
  });

  test('TC-PIM-OF-301 — A toggle change without Save is not persisted', async ({
    optionalFieldsPage,
    orangehrmAdminApi,
  }) => {
    await optionalFieldsPage.setToggle('ssn', true);
    expect(await optionalFieldsPage.isOn('ssn')).toBe(true);

    // Reload without saving — the toggle reverts to the last saved (off) state.
    await optionalFieldsPage.gotoConfig();
    expect(await optionalFieldsPage.isOn('ssn')).toBe(false);

    const cfg = await new PimOptionalFieldsApi(orangehrmAdminApi.request).getConfig();
    expect(cfg.showSSN).toBe(false);
  });

  // ── P2 ────────────────────────────────────────────────────────────────────
  test('TC-PIM-OF-102 — Enabling "Show US Tax Exemptions" adds the Tax Exemptions record menu', async ({
    optionalFieldsPage,
    personalDetailsPage,
  }) => {
    await optionalFieldsPage.setToggle('tax', true);
    await optionalFieldsPage.saveAndVerifyToast();

    const taxTab = ofData.fields.tax.recordMenuTab;
    if (!taxTab) throw new Error('tax.recordMenuTab is not configured in test-data');

    await personalDetailsPage.gotoPersonalDetails(EMP);
    await expect(personalDetailsPage.recordMenuTab(taxTab)).toBeVisible();
  });

  test('TC-PIM-OF-402 — SIN and SSN are independent', async ({
    optionalFieldsPage,
    personalDetailsPage,
  }) => {
    await optionalFieldsPage.setToggle('sin', true);
    await optionalFieldsPage.saveAndVerifyToast();

    await personalDetailsPage.gotoPersonalDetails(EMP);
    await expect(personalDetailsPage.fieldGroupByLabel('SIN Number')).toBeVisible();
    await expect(personalDetailsPage.fieldGroupByLabel('SSN Number')).toHaveCount(0);
  });

  test('TC-PIM-OF-401 — No-change save toasts; toggle on-then-off nets to off', async ({
    optionalFieldsPage,
    orangehrmAdminApi,
  }) => {
    // Folds TC-300: saving with no change still succeeds.
    await optionalFieldsPage.saveAndVerifyToast();

    // Toggle on then off, save — only the final state is persisted.
    await optionalFieldsPage.setToggle('ssn', true);
    await optionalFieldsPage.setToggle('ssn', false);
    await optionalFieldsPage.saveAndVerifyToast();

    const cfg = await new PimOptionalFieldsApi(orangehrmAdminApi.request).getConfig();
    expect(cfg.showSSN).toBe(false);
  });
});

// ─── P0: ESS security ─────────────────────────────────────────────────────
test.describe('Security — ESS cannot access PIM Optional Fields', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-PIM-OF-200 — ESS user: no PIM/Admin menu; config URL renders Credential Required', async ({
    optionalFieldsPage,
    page,
  }) => {
    // -- Step 1: PIM and Admin modules absent from the side navigation --
    await expect(optionalFieldsPage.mainMenuItem('PIM')).toHaveCount(0);
    await expect(optionalFieldsPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link renders no config and no Save --
    await optionalFieldsPage.goto(ofData.routes.config);
    await expect(page.getByText(ofData.messages.credentialRequired)).toBeVisible();
    await expect(optionalFieldsPage.saveButton).not.toBeVisible();
  });
});
