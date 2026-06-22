import type { Locator, Page } from '@playwright/test';
import { submitClaim } from '../../../test-data/claim/frontend/submitClaim';
import { BasePage } from '../BasePage';

export type CreateClaimForm = {
  event: string;
  currency: string;
  remarks?: string;
};

export type ExpenseForm = {
  type: string;
  date: string;
  amount: string;
  note?: string;
};

/**
 * ESS Claim → Submit Claim: create form (`submitClaim`), claim detail (`submitClaim/id/{id}`),
 * and My Claims list (`viewClaim`). Selectors verified live via Playwright MCP (OS 5.8).
 */
export class SubmitClaimPage extends BasePage {
  // ── Create Claim Request form ───────────────────────────────────────────────
  readonly createHeading: Locator;
  readonly eventDropdown: Locator;
  readonly currencyDropdown: Locator;
  readonly remarksInput: Locator;
  readonly eventError: Locator;
  readonly currencyError: Locator;
  readonly createButton: Locator;

  // ── Claim detail ────────────────────────────────────────────────────────────
  readonly detailHeading: Locator;
  readonly expensesAddButton: Locator;
  readonly expenseTypeDropdown: Locator;
  readonly dateGroup: Locator;
  readonly amountGroup: Locator;
  readonly expenseSaveButton: Locator;
  readonly expenseTypeError: Locator;
  readonly dateError: Locator;
  readonly amountError: Locator;
  readonly expenseRows: Locator;
  readonly noExpensesText: Locator;
  readonly totalAmountText: Locator;
  readonly submitButton: Locator;
  readonly cancelClaimButton: Locator;

  // ── My Claims list ──────────────────────────────────────────────────────────
  readonly myClaimsHeading: Locator;
  readonly referenceIdFilter: Locator;
  readonly searchButton: Locator;
  readonly claimRows: Locator;

  constructor(page: Page) {
    super(page);

    this.createHeading = page.getByRole('heading', { name: 'Create Claim Request' });
    this.eventDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Event', { exact: true }) })
      .locator('.oxd-select-text');
    this.currencyDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Currency', { exact: true }) })
      .locator('.oxd-select-text');
    this.remarksInput = page.locator('textarea.oxd-textarea').first();
    this.eventError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Event', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.currencyError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Currency', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.createButton = page.getByRole('button', { name: 'Create' });

    this.detailHeading = page.getByRole('heading', { name: 'Submit Claim' });
    // Anchor to the Expenses section (its heading's container) rather than relying on DOM order.
    this.expensesAddButton = page
      .getByRole('heading', { name: 'Expenses', exact: true })
      .locator('..')
      .getByRole('button', { name: 'Add' });
    this.expenseTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Expense Type', { exact: true }) })
      .locator('.oxd-select-text');
    this.dateGroup = page.locator('.oxd-input-group').filter({ has: page.getByText('Date', { exact: true }) });
    this.amountGroup = page.locator('.oxd-input-group').filter({ has: page.getByText('Amount', { exact: true }) });
    this.expenseSaveButton = page.getByRole('button', { name: 'Save' });
    this.expenseTypeError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Expense Type', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.dateError = this.dateGroup.locator('.oxd-input-field-error-message');
    this.amountError = this.amountGroup.locator('.oxd-input-field-error-message');
    this.expenseRows = page.locator('.oxd-table-card');
    this.noExpensesText = page.locator('span').filter({ hasText: submitClaim.messages.noRecords });
    this.totalAmountText = page.locator('p').filter({ hasText: /Total Amount/ });
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.cancelClaimButton = page.getByRole('button', { name: 'Cancel' });

    this.myClaimsHeading = page.getByRole('heading', { name: 'My Claims' });
    // The My Claims "Reference Id" filter input has no oxd-input class — match any input in the group.
    this.referenceIdFilter = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Reference Id', { exact: true }) })
      .locator('input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.claimRows = page.locator('.oxd-table-card');
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoCreate(): Promise<void> {
    await this.goto(submitClaim.routes.create);
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoDetail(id: number): Promise<void> {
    await this.goto(submitClaim.routes.detail(id));
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoMyClaims(): Promise<void> {
    await this.goto(submitClaim.routes.myClaims);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Create form ─────────────────────────────────────────────────────────────
  async selectEvent(name: string): Promise<void> {
    await this.selectOxdOption(this.eventDropdown, name);
  }

  async selectCurrency(name: string): Promise<void> {
    await this.selectOxdOption(this.currencyDropdown, name);
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /** Fills + submits the Create Claim Request form. */
  async createClaim(form: CreateClaimForm): Promise<void> {
    await this.selectEvent(form.event);
    await this.selectCurrency(form.currency);
    if (form.remarks !== undefined) {
      await this.remarksInput.fill(form.remarks);
    }
    await this.clickCreate();
  }

  /** Options listed in the create-form Event dropdown (excludes the "-- Select --" placeholder). */
  async getEventOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.eventDropdown);
  }

  // ── Detail / expenses ───────────────────────────────────────────────────────
  /** Read-only summary input on the claim detail, by its label (Reference Id, Event, Status, Currency). */
  summaryInput(label: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .locator('input');
  }

  /** Current value of a summary field (await it only after the detail has populated). */
  async summaryValue(label: string): Promise<string> {
    return this.summaryInput(label).inputValue();
  }

  async openExpenseForm(): Promise<void> {
    await this.expensesAddButton.click();
    await this.expenseTypeDropdown.waitFor({ state: 'visible' });
  }

  /** Options listed in the expense Expense Type dropdown (excludes the placeholder). */
  async getExpenseTypeOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.expenseTypeDropdown);
  }

  /** Adds one expense line item via the inline form. */
  async addExpense(form: ExpenseForm): Promise<void> {
    await this.openExpenseForm();
    await this.selectOxdOption(this.expenseTypeDropdown, form.type);
    await this.dateGroup.locator('input.oxd-input').fill(form.date);
    // Filling the date opens the OXD calendar overlay; Escape closes it so it can't intercept clicks.
    await this.page.keyboard.press('Escape');
    await this.amountGroup.locator('input.oxd-input').fill(form.amount);
    await this.expenseSaveButton.click();
    await this.verifySuccessToastForSave();
    await this.waitUntilTableLoaderDissapear();
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancelClaim(): Promise<void> {
    await this.cancelClaimButton.click();
  }

  // ── My Claims ───────────────────────────────────────────────────────────────
  async searchByReference(referenceId: string): Promise<void> {
    await this.referenceIdFilter.fill(referenceId);
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  claimRowByReference(referenceId: string): Locator {
    return this.claimRows.filter({ hasText: referenceId });
  }
}
