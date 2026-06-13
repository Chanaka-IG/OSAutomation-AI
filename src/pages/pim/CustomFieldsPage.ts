import type { Locator, Page } from '@playwright/test';
import { customFields } from '../../../test-data/pim/frontend/customFields';
import { BasePage } from '../BasePage';

/**
 * PIM → Configuration → Custom Fields: list (`listCustomFields`) + add form (`saveCustomFields`).
 * Screen/Type are OXD selects; choosing Type = "Drop Down" reveals the "Select Options" input.
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export class CustomFieldsPage extends BasePage {
  // ── Add form ────────────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly fieldNameInput: Locator;
  readonly fieldNameError: Locator;
  readonly screenDropdown: Locator;
  readonly typeDropdown: Locator;
  readonly selectOptionsInput: Locator;
  readonly selectOptionsError: Locator;
  /** All visible `.oxd-input-field-error-message` spans on the form. */
  readonly allValidationErrors: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly remainingText: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly tableRows: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add Custom Field' });
    this.fieldNameInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Field Name' })
      .locator('input.oxd-input');
    this.fieldNameError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Field Name' })
      .locator('.oxd-input-field-error-message');
    this.screenDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Screen' })
      .locator('.oxd-select-wrapper');
    this.typeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Type' })
      .locator('.oxd-select-wrapper');
    this.selectOptionsInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Select Options' })
      .locator('input.oxd-input');
    this.selectOptionsError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Select Options' })
      .locator('.oxd-input-field-error-message');
    this.allValidationErrors = page.locator('.oxd-input-field-error-message');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.listHeading = page.getByRole('heading', { name: 'Custom Fields' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.remainingText = page.locator('p').filter({ hasText: 'Remaining number of custom fields' });
    // Anchor on the "(N)" counter so it can't match the "No Records Found" empty-state span.
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.tableRows = page.locator('.oxd-table-card');

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(customFields.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(customFields.routes.add);
    await this.saveButton.waitFor({ state: 'visible' });
    // Let the form (incl. the async field-name uniqueness validator) finish hydrating
    // before any fill, otherwise the first input event races the validator registration.
    await this.waitUntilFormLoaderDissapear();
    await this.fieldNameInput.waitFor({ state: 'visible' });
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async fillFieldName(name: string): Promise<void> {
    await this.fieldNameInput.fill(name);
  }

  async selectScreen(label: string): Promise<void> {
    await this.selectOxdOption(this.screenDropdown, label);
  }

  async selectType(label: string): Promise<void> {
    await this.selectOxdOption(this.typeDropdown, label);
  }

  async fillOptions(options: string): Promise<void> {
    await this.selectOptionsInput.fill(options);
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

  /** The numeric value from "Remaining number of custom fields: N". */
  async remainingCount(): Promise<number> {
    const text = (await this.remainingText.innerText()).trim();
    const match = text.match(/(\d+)\s*$/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** The numeric value from the "(N) Record(s) Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** Deletes a row via the trash icon (first action button) + confirmation dialog. */
  async deleteRowByName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button').first().click();
    await this.deleteDialog.waitFor({ state: 'visible' });
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }
}
