import type { Locator, Page } from '@playwright/test';
import { assignClaim } from '../../../test-data/claim/frontend/assignClaim';
import { BasePage } from '../BasePage';

export type AssignClaimForm = {
  employeeQuery: string;
  employeeOption: string;
  event: string;
  currency: string;
  remarks?: string;
};

export type ExpenseForm = {
  type: string;
  date: string;
  amount: string;
};

/**
 * Admin Claim → Assign Claim: employee-claims list (`viewAssignClaim`), assign form (`assignClaim`),
 * and claim detail (`assignClaim/id/{id}`). Selectors verified live via Playwright MCP (OS 5.8).
 */
export class AssignClaimPage extends BasePage {
  // ── Employee Claims list ────────────────────────────────────────────────────
  readonly assignClaimButton: Locator;
  readonly referenceIdFilter: Locator;
  readonly searchButton: Locator;
  readonly claimRows: Locator;

  // ── Assign form ─────────────────────────────────────────────────────────────
  readonly createHeading: Locator;
  readonly employeeInput: Locator;
  readonly eventDropdown: Locator;
  readonly currencyDropdown: Locator;
  readonly remarksInput: Locator;
  readonly employeeError: Locator;
  readonly eventError: Locator;
  readonly currencyError: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

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

  constructor(page: Page) {
    super(page);

    this.assignClaimButton = page.getByRole('button', { name: 'Assign Claim' });
    this.referenceIdFilter = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Reference Id', { exact: true }) })
      .locator('input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.claimRows = page.locator('.oxd-table-card');

    this.createHeading = page.getByRole('heading', { name: 'Create Claim Request' });
    this.employeeInput = page.getByPlaceholder('Type for hints...');
    this.eventDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Event', { exact: true }) })
      .locator('.oxd-select-text');
    this.currencyDropdown = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Currency', { exact: true }) })
      .locator('.oxd-select-text');
    this.remarksInput = page.locator('textarea.oxd-textarea').first();
    this.employeeError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Employee Name', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.eventError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Event', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.currencyError = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Currency', { exact: true }) })
      .locator('.oxd-input-field-error-message');
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.detailHeading = page.getByRole('heading', { name: 'Assign Claim' });
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
    this.noExpensesText = page.locator('span').filter({ hasText: assignClaim.messages.noRecords });
    this.totalAmountText = page.locator('p').filter({ hasText: /Total Amount/ });
    this.submitButton = page.getByRole('button', { name: 'Submit' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoList(): Promise<void> {
    await this.goto(assignClaim.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAssignForm(): Promise<void> {
    await this.goto(assignClaim.routes.assign);
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoDetail(id: number): Promise<void> {
    await this.goto(assignClaim.routes.detail(id));
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Assign form ─────────────────────────────────────────────────────────────
  /** An autocomplete hint option by label (web-first — rides through the transient "Searching...."). */
  employeeOption(label: string): Locator {
    return this.page.getByRole('option', { name: label });
  }

  async selectEmployee(query: string, optionLabel: string): Promise<void> {
    await this.employeeInput.fill(query);
    await this.employeeOption(optionLabel).click();
  }

  async selectEvent(name: string): Promise<void> {
    await this.selectOxdOption(this.eventDropdown, name);
  }

  async selectCurrency(name: string): Promise<void> {
    await this.selectOxdOption(this.currencyDropdown, name);
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  /** Fills + submits the Assign Claim form. */
  async assign(form: AssignClaimForm): Promise<void> {
    await this.selectEmployee(form.employeeQuery, form.employeeOption);
    await this.selectEvent(form.event);
    await this.selectCurrency(form.currency);
    if (form.remarks !== undefined) {
      await this.remarksInput.fill(form.remarks);
    }
    await this.clickCreate();
  }

  /** Options listed in the assign-form Event dropdown (excludes the "-- Select --" placeholder). */
  async getEventOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.eventDropdown);
  }

  // ── Detail / expenses ───────────────────────────────────────────────────────
  summaryInput(label: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .locator('input');
  }

  async summaryValue(label: string): Promise<string> {
    return this.summaryInput(label).inputValue();
  }

  async openExpenseForm(): Promise<void> {
    await this.expensesAddButton.click();
    await this.expenseTypeDropdown.waitFor({ state: 'visible' });
  }

  async getExpenseTypeOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.expenseTypeDropdown);
  }

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

  // ── Employee Claims list ────────────────────────────────────────────────────
  async searchByReference(referenceId: string): Promise<void> {
    await this.referenceIdFilter.fill(referenceId);
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  claimRowByReference(referenceId: string): Locator {
    return this.claimRows.filter({ hasText: referenceId });
  }
}
