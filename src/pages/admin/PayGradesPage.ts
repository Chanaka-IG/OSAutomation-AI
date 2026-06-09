import type { Locator, Page } from '@playwright/test';
import { adminPayGrades } from '../../../test-data/admin/frontend/payGrades';
import { BasePage } from '../BasePage';

/**
 * Admin → Job → Pay Grades: list page (`viewPayGrades`), add form (`payGrade`),
 * and the two-step edit page (`payGrade/{id}`) that hosts the nested Currencies sub-grid.
 * Selectors verified live via Playwright MCP (2026-06-08).
 */
export class PayGradesPage extends BasePage {
  // ── Add / Edit pay-grade form ────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly editFormHeading: Locator;
  readonly nameInput: Locator;
  readonly nameFieldError: Locator;
  /** Pay-grade Name form Save (the first Save on the edit page; the currency form has its own). */
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── Currencies panel (edit page) ──────────────────────────────────────────────
  readonly currenciesHeading: Locator;
  readonly currenciesAddButton: Locator;
  readonly currenciesRecordsText: Locator;
  readonly currencyRows: Locator;

  // ── Add Currency inline form ──────────────────────────────────────────────────
  readonly addCurrencyHeading: Locator;
  readonly currencyDropdown: Locator;
  readonly currencyFieldError: Locator;
  readonly minSalaryInput: Locator;
  readonly maxSalaryInput: Locator;
  readonly minSalaryError: Locator;
  readonly maxSalaryError: Locator;
  readonly currencySaveButton: Locator;
  readonly currencyCancelButton: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly tableRows: Locator;
  /** Name column cells (2nd cell of each row). */
  readonly nameCells: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add Pay Grade' });
    this.editFormHeading = page.getByRole('heading', { name: 'Edit Pay Grade' });
    this.nameInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Name' })
      .locator('input.oxd-input')
      .first();
    this.nameFieldError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Name' })
      .locator('.oxd-input-field-error-message')
      .first();
    // The pay-grade Name form is the first form on the page; its Save is the first Save button.
    this.saveButton = page.getByRole('button', { name: 'Save' }).first();
    this.cancelButton = page.getByRole('button', { name: 'Cancel' }).first();

    this.currenciesHeading = page.getByRole('heading', { name: 'Currencies' });
    // The Currencies panel "Add" button (distinct from the list-page Add button).
    this.currenciesAddButton = page.getByRole('button', { name: 'Add' });
    this.currenciesRecordsText = page.locator('span').filter({ hasText: 'Record' });
    this.currencyRows = page.locator('.oxd-table-card');

    this.addCurrencyHeading = page.getByRole('heading', { name: 'Add Currency' });
    this.currencyDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Currency' })
      .locator('.oxd-select-text');
    this.currencyFieldError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Currency' })
      .locator('.oxd-input-field-error-message');
    // Anchor on the EXACT label text — the error messages reference the other field's
    // label ("Should be higher than Minimum Salary"), so a substring `hasText` filter
    // would match both salary groups once errors render.
    const minSalaryGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Minimum Salary', { exact: true }) });
    const maxSalaryGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Maximum Salary', { exact: true }) });
    this.minSalaryInput = minSalaryGroup.locator('input.oxd-input');
    this.maxSalaryInput = maxSalaryGroup.locator('input.oxd-input');
    this.minSalaryError = minSalaryGroup.locator('.oxd-input-field-error-message');
    this.maxSalaryError = maxSalaryGroup.locator('.oxd-input-field-error-message');
    // The Add Currency form is the second form rendered (after the Name form) — its Save/Cancel are nth(1).
    this.currencySaveButton = page.getByRole('button', { name: 'Save' }).nth(1);
    this.currencyCancelButton = page.getByRole('button', { name: 'Cancel' }).nth(1);

    this.listHeading = page.getByRole('heading', { name: 'Pay Grades' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: 'Records Found' });
    this.tableRows = page.locator('.oxd-table-card');
    this.nameCells = page.locator('.oxd-table-card .oxd-table-cell:nth-child(2)');

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(adminPayGrades.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(adminPayGrades.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Pay-grade form interactions ───────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Fills Name and saves. On the Add form this redirects to the edit page
   * `/admin/payGrade/{id}`; on the edit page it stays and toasts.
   */
  async saveName(name: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.saveButton.click();
  }

  // ── Currency interactions (edit page) ─────────────────────────────────────────

  /** Opens the inline Add Currency form on the edit page. */
  async openAddCurrency(): Promise<void> {
    await this.currenciesAddButton.click();
    await this.addCurrencyHeading.waitFor({ state: 'visible' });
  }

  /** Adds a currency band. Min/Max are optional. Clicks the currency form's own Save. */
  async addCurrency(opts: { currency: string; min?: string; max?: string }): Promise<void> {
    await this.selectOxdOption(this.currencyDropdown, opts.currency);
    if (opts.min !== undefined) await this.minSalaryInput.fill(opts.min);
    if (opts.max !== undefined) await this.maxSalaryInput.fill(opts.max);
    await this.currencySaveButton.click();
  }

  /** All currency-option labels currently available in the Add Currency dropdown. */
  async currencyOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.currencyDropdown);
  }

  currencyRowByName(name: string): Locator {
    return this.currencyRows.filter({ hasText: name });
  }

  // ── List interactions ───────────────────────────────────────────────────────

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async visibleNames(): Promise<string[]> {
    const texts = await this.nameCells.allInnerTexts();
    return texts.map((t) => t.trim());
  }

  /** Numeric value from the "(N) Records Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** Opens the delete confirmation dialog via the row's trash icon (first action button). */
  async openDeleteDialogForName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button').first().click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  /** Deletes a row via the trash icon + confirmation dialog (first action button = trash). */
  async deleteRowByName(name: string): Promise<void> {
    await this.openDeleteDialogForName(name);
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }
}
