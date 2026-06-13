import type { Locator, Page } from '@playwright/test';
import { reportingMethods } from '../../../test-data/pim/frontend/reportingMethods';
import { BasePage } from '../BasePage';

/**
 * PIM → Configuration → Reporting Methods: list (`viewReportingMethods`) + add (`saveReportingMethod`).
 * Single-field (Name) CRUD. Selectors verified live via Playwright MCP (OrangeHRM OS 5.8, 2026-06-13).
 */
export class ReportingMethodsPage extends BasePage {
  // ── Add form ────────────────────────────────────────────────────────────────
  readonly addFormTitle: Locator;
  readonly nameInput: Locator;
  readonly nameError: Locator;
  readonly allValidationErrors: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listTitle: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly tableRows: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormTitle = page.locator('p').filter({ hasText: /^Add Reporting Method$/ });
    this.nameInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Name' })
      .locator('input.oxd-input');
    this.nameError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Name' })
      .locator('.oxd-input-field-error-message');
    this.allValidationErrors = page.locator('.oxd-input-field-error-message');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.listTitle = page.locator('p').filter({ hasText: /^Reporting Methods$/ });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.tableRows = page.locator('.oxd-table-card');

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(reportingMethods.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(reportingMethods.routes.add);
    await this.saveButton.waitFor({ state: 'visible' });
    // Let the form (incl. the async name uniqueness validator) hydrate before any fill.
    await this.waitUntilFormLoaderDissapear();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Clicks Save and verifies the success toast via the shared BasePage check
   * (asserts the Success header + "Successfully Saved" message), then waits for
   * the list grid to settle.
   */
  async saveAndVerifyToast(): Promise<void> {
    await this.saveButton.click();
    await this.verifySuccessToastForSave();
    await this.waitUntilTableLoaderDissapear();
  }

  // ── List interactions ───────────────────────────────────────────────────────

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** Opens the delete confirmation dialog via the row's trash icon (first action button). */
  async openDeleteDialogForName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button').first().click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  async deleteRowByName(name: string): Promise<void> {
    await this.openDeleteDialogForName(name);
    await this.confirmDeleteButton.click();
    await this.verifySuccessToastforDeletion();
    await this.waitUntilTableLoaderDissapear();
  }
}
