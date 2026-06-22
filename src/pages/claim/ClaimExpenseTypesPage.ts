import type { Locator, Page } from '@playwright/test';
import { claimExpenseTypes } from '../../../test-data/claim/frontend/expenseTypes';
import { BasePage } from '../BasePage';

export type ClaimExpenseTypeForm = {
  name: string;
  description?: string;
  /** true = Active (default), false = Inactive. */
  active?: boolean;
};

/**
 * Claim → Configuration → Expense Types: list (`viewExpense`) + add/edit form (`saveExpense`).
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8.
 */
export class ClaimExpenseTypesPage extends BasePage {
  // ── List ────────────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly tableRows: Locator;

  // ── Add / Edit form ───────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly editFormHeading: Locator;
  readonly nameGroup: Locator;
  readonly nameInput: Locator;
  readonly nameError: Locator;
  readonly descriptionInput: Locator;
  readonly activeSwitch: Locator;
  readonly activeCheckbox: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.listHeading = page.getByRole('heading', { name: 'Expense Types' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    // Scope to the list span — an info toast renders the same "No Records Found" copy in a <p>.
    this.noRecordsText = page.locator('span').filter({ hasText: claimExpenseTypes.messages.noRecords });
    this.tableRows = page.locator('.oxd-table-card');

    this.addFormHeading = page.getByRole('heading', { name: 'Add Expense Type' });
    this.editFormHeading = page.getByRole('heading', { name: 'Edit Expense Type' });
    // Exact label match — 'Name' is short, so scope by the label node within the group.
    this.nameGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Name', { exact: true }) });
    this.nameInput = this.nameGroup.locator('input.oxd-input');
    this.nameError = this.nameGroup.locator('.oxd-input-field-error-message');
    this.descriptionInput = page.locator('textarea.oxd-textarea');
    // The Active control is an OXD switch; the underlying input is intercepted, so toggle the span.
    this.activeSwitch = page.locator('.oxd-switch-input');
    this.activeCheckbox = page.locator('.oxd-switch-wrapper input[type="checkbox"]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: claimExpenseTypes.deleteDialog.confirm });
    this.cancelDeleteButton = page.getByRole('button', { name: claimExpenseTypes.deleteDialog.cancel });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoList(): Promise<void> {
    await this.goto(claimExpenseTypes.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(claimExpenseTypes.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ─────────────────────────────────────────────────────────
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  /** Sets the Active switch to the desired state only when it differs from the current one. */
  async setActive(active: boolean): Promise<void> {
    const isChecked = await this.activeCheckbox.isChecked();
    if (isChecked !== active) {
      await this.activeSwitch.click();
    }
  }

  /** Fills the Add Expense Type form. `active` defaults to leaving the switch as-is (on by default). */
  async fillExpenseType(form: ClaimExpenseTypeForm): Promise<void> {
    await this.fillName(form.name);
    if (form.description !== undefined) {
      await this.fillDescription(form.description);
    }
    if (form.active !== undefined) {
      await this.setActive(form.active);
    }
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  // ── List interactions ─────────────────────────────────────────────────────────
  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Numeric value from the "(N) Record(s) Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** The exact-text status node ("Active" / "Inactive") inside the named row. */
  statusBadge(name: string, status: 'Active' | 'Inactive'): Locator {
    return this.rowByName(name).getByText(status, { exact: true });
  }

  async clickEdit(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-pencil-fill)').click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** Opens the delete confirmation dialog via the row's trash icon. */
  async openDeleteDialog(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-trash)').click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
  }

  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
  }
}
