import type { Locator, Page } from '@playwright/test';
import { adminJobTitles } from '../../../test-data/admin/frontend/jobTitles';
import { BasePage } from '../BasePage';

/**
 * Admin → Job → Job Titles: list page (`viewJobTitleList`) + add form (`saveJobTitle`).
 * Selectors verified live via Playwright MCP (2026-06-07).
 */
export class JobTitlesPage extends BasePage {
  // ── Add form ────────────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly titleInput: Locator;
  readonly titleFieldError: Locator;
  readonly descriptionInput: Locator;
  readonly noteInput: Locator;
  readonly specificationFileInput: Locator;
  readonly specificationFieldError: Locator;
  readonly chosenFileName: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly allValidationErrors: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly tableRows: Locator;
  /**
   * Title column cells (2nd cell of each row). Structural CSS by necessity —
   * the OXD grid renders no testids/labels on data cells.
   */
  readonly titleCells: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add Job Title' });
    this.titleInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Job Title' })
      .locator('input.oxd-input');
    this.titleFieldError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Job Title' })
      .locator('.oxd-input-field-error-message');
    this.descriptionInput = page.getByPlaceholder('Type description here');
    this.noteInput = page.getByPlaceholder('Add note');
    this.specificationFileInput = page.locator('input[type="file"]');
    this.specificationFieldError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Job Specification' })
      .locator('.oxd-input-field-error-message');
    this.chosenFileName = page.locator('.oxd-file-input-div');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.allValidationErrors = page.locator('.oxd-input-field-error-message');

    this.listHeading = page.getByRole('heading', { name: 'Job Titles' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: 'Records Found' });
    this.tableRows = page.locator('.oxd-table-card');
    this.titleCells = page.locator('.oxd-table-card .oxd-table-cell:nth-child(2)');

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(adminJobTitles.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(adminJobTitles.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async fillForm(opts: { title: string; description?: string; note?: string }): Promise<void> {
    await this.titleInput.fill(opts.title);
    if (opts.description) await this.descriptionInput.fill(opts.description);
    if (opts.note) await this.noteInput.fill(opts.note);
  }

  /** Directly set the hidden file input — works even when the element is not visible. */
  async uploadSpecification(filePath: string): Promise<void> {
    await this.specificationFileInput.setInputFiles(filePath);
  }

  /**
   * Clicks Save and captures the success toast before the SPA redirects back to
   * the list (toasts auto-dismiss in ~3s — must be awaited immediately).
   */
  async saveAndWaitForToast(): Promise<string> {
    await this.saveButton.click();
    const toastText = await this.waitForSuccessToast();
    await this.waitUntilTableLoaderDissapear();
    return toastText;
  }

  // ── List interactions ───────────────────────────────────────────────────────

  rowByTitle(title: string): Locator {
    return this.tableRows.filter({ hasText: title });
  }

  /** All title-column values currently rendered, top to bottom. */
  async visibleTitles(): Promise<string[]> {
    const texts = await this.titleCells.allInnerTexts();
    return texts.map((t) => t.trim());
  }

  /** Numeric value from the "(N) Records Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** Opens the delete confirmation dialog via the row's trash icon (first action button). */
  async openDeleteDialogForTitle(title: string): Promise<void> {
    await this.rowByTitle(title).locator('.oxd-icon-button').first().click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  /** Deletes a row via the trash icon + confirmation dialog (first action button = trash). */
  async deleteRowByTitle(title: string): Promise<void> {
    await this.openDeleteDialogForTitle(title);
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }
}
