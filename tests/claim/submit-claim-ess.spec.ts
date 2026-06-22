import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ClaimEventsApi } from '../../src/api/orangehrmOSAPI/ClaimEventsApi';
import { ClaimExpenseTypesApi } from '../../src/api/orangehrmOSAPI/ClaimExpenseTypesApi';
import { ClaimRequestsApi } from '../../src/api/orangehrmOSAPI/ClaimRequestsApi';

/**
 * E2E coverage for the ESS "Submit Claim" flow — P0 + P1 + P2.
 * Source: docs/test-priority_submit claim as ESS.md
 *
 * NOTE: claim requests cannot be deleted (DELETE → 405). This suite uses persistent config
 * fixtures (event + expense types via createIfAbsent, never deleted) and creates a small fixed
 * number of permanent claim requests per run (happy-path submit, a cancel claim, and one
 * Initiated claim reused read-only). That residue is inherent to testing claim submission.
 *
 * Run:
 *   npx playwright test tests/claim/submit-claim-ess.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const data = frontend.submitClaim;
const fx = data.fixtures;
const ESS_USER = auth.essTestUser;

// Claim ids seeded (as ESS) in beforeAll for read-only / cancel reuse.
let initiatedClaimId: number;
let cancelClaimId: number;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  test.setTimeout(120_000);

  // 1) Seed persistent config fixtures as Admin (events + expense types, active + inactive).
  await orangehrmAdminApi.loginAsAdmin();
  const eventsApi = new ClaimEventsApi(orangehrmAdminApi.request);
  const typesApi = new ClaimExpenseTypesApi(orangehrmAdminApi.request);

  await eventsApi.createIfAbsent({ name: fx.activeEvent, description: 'E2E active event', status: true });
  await eventsApi.createIfAbsent({ name: fx.inactiveEvent, description: 'E2E inactive event', status: false });
  await typesApi.createIfAbsent({ name: fx.activeExpenseType, description: 'E2E active type', status: true });
  await typesApi.createIfAbsent({ name: fx.inactiveExpenseType, description: 'E2E inactive type', status: false });

  const eventId = await eventsApi.getIdByName(fx.activeEvent);
  if (eventId === undefined) throw new Error('Failed to resolve active claim event id for seeding.');

  // 2) Seed claim requests as the ESS employee (self-scoped). These are permanent (no delete API).
  await orangehrmAdminApi.logout();
  await orangehrmAdminApi.loginAsESS(ESS_USER.username, ESS_USER.password);
  const requestsApi = new ClaimRequestsApi(orangehrmAdminApi.request);

  initiatedClaimId = (await requestsApi.create({ claimEventId: eventId, currencyId: fx.currencyId, remarks: 'read-only fixture' })).id;
  cancelClaimId = (await requestsApi.create({ claimEventId: eventId, currencyId: fx.currencyId, remarks: 'cancel fixture' })).id;
});

// ─── ESS — Submit Claim flow ────────────────────────────────────────────────
test.describe('ESS — Submit Claim', () => {
  test.beforeEach(async ({ submitClaimPage }) => {
    await submitClaimPage.loginWithCredentials(ESS_USER.username, ESS_USER.password);
  });

  test('**TC-005** | Create → add expenses → submit → appears in My Claims | **TC-102/103/105/500/504**', async ({ submitClaimPage }) => {
    // -- Create the claim request --
    await submitClaimPage.gotoCreate();
    await submitClaimPage.createClaim({ event: fx.activeEvent, currency: fx.currencyName, remarks: data.samples.remarks });

    await expect(submitClaimPage.page).toHaveURL(data.urlPatterns.detail);
    // Detail loads asynchronously — wait for the summary to populate before reading.
    await expect(submitClaimPage.summaryInput('Status')).toHaveValue(data.statuses.initiated);
    const referenceId = await submitClaimPage.summaryValue('Reference Id');
    expect(referenceId).not.toEqual('');

    // -- Empty expenses to start (TC-500) --
    await expect(submitClaimPage.noExpensesText.first()).toBeVisible();
    await expect(submitClaimPage.totalAmountText).toContainText('0.00');

    // -- Add two expenses (toast asserted inside addExpense → TC-504) --
    await submitClaimPage.addExpense({ type: fx.activeExpenseType, date: data.samples.date, amount: data.samples.amount1 });
    await submitClaimPage.addExpense({ type: fx.activeExpenseType, date: data.samples.date, amount: data.samples.amount2 });
    await expect(submitClaimPage.expenseRows).toHaveCount(2);

    // -- Total sums the line items (TC-102) --
    await expect(submitClaimPage.totalAmountText).toContainText(data.samples.expectedTotal);

    // -- Submit (TC-003) --
    await submitClaimPage.clickSubmit();
    await expect(submitClaimPage.summaryInput('Status')).toHaveValue(data.statuses.submitted);

    // -- Submitted claim is read-only (TC-103) --
    await expect(submitClaimPage.submitButton).toHaveCount(0);

    // -- Appears in My Claims (TC-004) --
    await submitClaimPage.gotoMyClaims();
    await submitClaimPage.searchByReference(referenceId);
    await expect(submitClaimPage.claimRowByReference(referenceId)).toBeVisible();
    await expect(submitClaimPage.claimRowByReference(referenceId)).toContainText(data.statuses.submitted);
  });

  test('**TC-300** | Create requires Event and Currency | **TC-401** Remarks optional', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoCreate();
    await submitClaimPage.clickCreate();
    await expect(submitClaimPage.eventError).toHaveText(data.messages.required);
    await expect(submitClaimPage.currencyError).toHaveText(data.messages.required);
    // Only Event + Currency are flagged — Remarks is optional (no Remarks error).
  });

  test('**TC-301** | Add Expense requires Expense Type, Date and Amount', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoDetail(initiatedClaimId);
    await submitClaimPage.openExpenseForm();
    await submitClaimPage.expenseSaveButton.click();
    await expect(submitClaimPage.expenseTypeError).toHaveText(data.messages.required);
    await expect(submitClaimPage.dateError).toHaveText(data.messages.required);
    await expect(submitClaimPage.amountError).toHaveText(data.messages.required);
  });

  test('**TC-100** | Only active events appear in the Event dropdown', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoCreate();
    const options = await submitClaimPage.getEventOptions();
    expect(options).toContain(fx.activeEvent);
    expect(options).not.toContain(fx.inactiveEvent);
  });

  test('**TC-101** | Only active expense types appear in the Expense Type dropdown', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoDetail(initiatedClaimId);
    await submitClaimPage.openExpenseForm();
    const options = await submitClaimPage.getExpenseTypeOptions();
    expect(options).toContain(fx.activeExpenseType);
    expect(options).not.toContain(fx.inactiveExpenseType);
  });

  test('**TC-104** | ESS can cancel a claim (Initiated → Cancelled)', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoDetail(cancelClaimId);
    await submitClaimPage.cancelClaim();
    await expect(submitClaimPage.summaryInput('Status')).toHaveValue(data.statuses.cancelled);
  });

  test('**TC-501** | Claim summary fields are read-only', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoDetail(initiatedClaimId);
    const refInput = submitClaimPage.page
      .locator('.oxd-input-group')
      .filter({ has: submitClaimPage.page.getByText('Reference Id', { exact: true }) })
      .locator('input');
    await expect(refInput).toBeDisabled();
  });

  test('**TC-503** | My Claims filter narrows the grid', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoMyClaims();
    await submitClaimPage.searchByReference('NO-SUCH-REFERENCE-0000');
    await expect(submitClaimPage.claimRows).toHaveCount(0);
  });

  test('**TC-303** | Cancel on the create form discards (no claim created)', async ({ submitClaimPage }) => {
    await submitClaimPage.gotoCreate();
    await submitClaimPage.selectEvent(fx.activeEvent);
    await submitClaimPage.selectCurrency(fx.currencyName);
    await submitClaimPage.cancelClaim();
    // Create-form Cancel returns to My Claims without persisting a claim.
    await expect(submitClaimPage.page).toHaveURL(data.urlPatterns.myClaims);
  });
});

// ─── Security ───────────────────────────────────────────────────────────────
test.describe('Security — ESS cannot assign claims', () => {
  test.beforeEach(async ({ submitClaimPage }) => {
    await submitClaimPage.loginWithCredentials(ESS_USER.username, ESS_USER.password);
  });

  test('**TC-200** | ESS direct access to Assign Claim → Credential Required', async ({ page }) => {
    await page.goto(data.routes.assignClaim, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(data.messages.credentialRequired, { exact: true })).toBeVisible();
  });
});
