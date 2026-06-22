import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ClaimEventsApi } from '../../src/api/orangehrmOSAPI/ClaimEventsApi';
import { ClaimExpenseTypesApi } from '../../src/api/orangehrmOSAPI/ClaimExpenseTypesApi';
import { ClaimRequestsApi } from '../../src/api/orangehrmOSAPI/ClaimRequestsApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for the Admin "Assign Claim" flow — P0 + P1 + P2.
 * Source: docs/test-priority_Claim -> Assign Claim.md
 *
 * NOTE: claim requests cannot be deleted (DELETE → 405). This suite reuses the persistent config
 * fixtures from the submit-claim suite (events + expense types, createIfAbsent, never deleted) and
 * creates a small fixed number of permanent claims per run (one happy-path assign + one Initiated
 * assigned claim reused read-only). Admin Submit auto-advances status (observed "Paid"), so the
 * happy path asserts the claim left Initiated and is listed — not an exact terminal status.
 *
 * Run:
 *   npx playwright test tests/claim/assign-claim.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 120_000 });

const data = frontend.assignClaim;
const fx = data.fixtures;
const ESS_USER = auth.essTestUser;

let initiatedClaimId: number;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  test.setTimeout(120_000);

  await orangehrmAdminApi.loginAsAdmin();
  const eventsApi = new ClaimEventsApi(orangehrmAdminApi.request);
  const typesApi = new ClaimExpenseTypesApi(orangehrmAdminApi.request);
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  const requestsApi = new ClaimRequestsApi(orangehrmAdminApi.request);

  // Persistent config fixtures (shared with the submit-claim suite).
  await eventsApi.createIfAbsent({ name: fx.activeEvent, description: 'E2E active event', status: true });
  await eventsApi.createIfAbsent({ name: fx.inactiveEvent, description: 'E2E inactive event', status: false });
  await typesApi.createIfAbsent({ name: fx.activeExpenseType, description: 'E2E active type', status: true });
  await typesApi.createIfAbsent({ name: fx.inactiveExpenseType, description: 'E2E inactive type', status: false });

  const eventId = await eventsApi.getIdByName(fx.activeEvent);
  const empNumber = await employeesApi.getEmpNumberByFullName(data.employee.firstName, data.employee.lastName);
  if (eventId === undefined) throw new Error('Failed to resolve active claim event id for seeding.');
  if (empNumber === undefined) throw new Error('Failed to resolve target employee empNumber for seeding.');

  // Seed one Initiated assigned claim (admin → employee) for read-only reuse. Permanent (no delete API).
  initiatedClaimId = (await requestsApi.createForEmployee(empNumber, {
    claimEventId: eventId,
    currencyId: fx.currencyId,
    remarks: 'read-only fixture',
  })).id;
});

// ─── Admin — Assign Claim ────────────────────────────────────────────────────
test.describe('Admin — Assign Claim', () => {
  test.beforeEach(async ({ assignClaimPage }) => {
    await assignClaimPage.loginAs('admin');
  });

  test('**TC-005** | Assign → add expenses → submit → in Employee Claims | **TC-102/103/105/500**', async ({ assignClaimPage }) => {
    // -- Assign the claim to the employee --
    await assignClaimPage.gotoAssignForm();
    await assignClaimPage.assign({
      employeeQuery: data.employee.query,
      employeeOption: data.employee.optionLabel,
      event: fx.activeEvent,
      currency: fx.currencyName,
      remarks: data.samples.remarks,
    });

    await expect(assignClaimPage.page).toHaveURL(data.urlPatterns.detail);
    await expect(assignClaimPage.summaryInput('Status')).toHaveValue(data.statuses.initiated);
    // Attributed to the chosen employee, not the admin (TC-103).
    await expect(assignClaimPage.summaryInput('Employee')).toHaveValue(data.employee.summaryName);
    const referenceId = await assignClaimPage.summaryValue('Reference Id');
    expect(referenceId).not.toEqual('');

    // -- Empty expenses to start (TC-500) --
    await expect(assignClaimPage.noExpensesText.first()).toBeVisible();
    await expect(assignClaimPage.totalAmountText).toContainText('0.00');

    // -- Add two expenses --
    await assignClaimPage.addExpense({ type: fx.activeExpenseType, date: data.samples.date, amount: data.samples.amount1 });
    await assignClaimPage.addExpense({ type: fx.activeExpenseType, date: data.samples.date, amount: data.samples.amount2 });
    await expect(assignClaimPage.expenseRows).toHaveCount(2);
    await expect(assignClaimPage.totalAmountText).toContainText(data.samples.expectedTotal);

    // -- Submit (admin submit auto-advances; assert it left Initiated) --
    await assignClaimPage.clickSubmit();
    await expect(assignClaimPage.summaryInput('Status')).not.toHaveValue(data.statuses.initiated);
    await expect(assignClaimPage.submitButton).toHaveCount(0);

    // -- Appears in the Employee Claims list (TC-004) --
    await assignClaimPage.gotoList();
    await assignClaimPage.searchByReference(referenceId);
    await expect(assignClaimPage.claimRowByReference(referenceId)).toBeVisible();
    await expect(assignClaimPage.claimRowByReference(referenceId)).toContainText(data.employee.summaryName);
  });

  test('**TC-300** | Assign requires Employee, Event and Currency | **TC-401** Remarks optional', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoAssignForm();
    await assignClaimPage.clickCreate();
    await expect(assignClaimPage.employeeError).toHaveText(data.messages.required);
    await expect(assignClaimPage.eventError).toHaveText(data.messages.required);
    await expect(assignClaimPage.currencyError).toHaveText(data.messages.required);
  });

  test('**TC-302** | Free-text (non-hint) employee is not accepted', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoAssignForm();
    await assignClaimPage.employeeInput.fill(data.samples.unknownEmployee);
    await assignClaimPage.selectEvent(fx.activeEvent);
    await assignClaimPage.selectCurrency(fx.currencyName);
    await assignClaimPage.clickCreate();
    // Typed text that matches no employee hint is rejected (Required/invalid) — no detail navigation.
    await expect(assignClaimPage.employeeError).toBeVisible();
    await expect(assignClaimPage.page).not.toHaveURL(data.urlPatterns.detail);
  });

  test('**TC-104** | Employee Name autocomplete returns matching hints', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoAssignForm();
    await assignClaimPage.employeeInput.fill(data.employee.query);
    await expect(assignClaimPage.employeeOption(data.employee.optionLabel)).toBeVisible();
  });

  test('**TC-100** | Only active events appear in the Event dropdown', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoAssignForm();
    const options = await assignClaimPage.getEventOptions();
    expect(options).toContain(fx.activeEvent);
    expect(options).not.toContain(fx.inactiveEvent);
  });

  test('**TC-101** | Only active expense types appear in the Expense Type dropdown', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoDetail(initiatedClaimId);
    await assignClaimPage.openExpenseForm();
    const options = await assignClaimPage.getExpenseTypeOptions();
    expect(options).toContain(fx.activeExpenseType);
    expect(options).not.toContain(fx.inactiveExpenseType);
  });

  test('**TC-301** | Add Expense requires Expense Type, Date and Amount', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoDetail(initiatedClaimId);
    await assignClaimPage.openExpenseForm();
    await assignClaimPage.expenseSaveButton.click();
    await expect(assignClaimPage.expenseTypeError).toHaveText(data.messages.required);
    await expect(assignClaimPage.dateError).toHaveText(data.messages.required);
    await expect(assignClaimPage.amountError).toHaveText(data.messages.required);
  });

  test('**TC-501** | Claim summary fields are read-only', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoDetail(initiatedClaimId);
    await expect(assignClaimPage.summaryInput('Employee')).toBeDisabled();
    await expect(assignClaimPage.summaryInput('Reference Id')).toBeDisabled();
  });

  test('**TC-502** | Employee Claims filter narrows the grid', async ({ assignClaimPage }) => {
    await assignClaimPage.gotoList();
    await assignClaimPage.searchByReference('NO-SUCH-REFERENCE-0000');
    await expect(assignClaimPage.claimRows).toHaveCount(0);
  });
});

// ─── Security ───────────────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Assign Claim', () => {
  test.beforeEach(async ({ assignClaimPage }) => {
    await assignClaimPage.loginWithCredentials(ESS_USER.username, ESS_USER.password);
  });

  test('**TC-200** | ESS direct access to Assign Claim → Credential Required', async ({ page }) => {
    await page.goto(data.routes.assign, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(data.messages.credentialRequired, { exact: true })).toBeVisible();
  });
});
