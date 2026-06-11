import type { Locator, Page } from '@playwright/test';
import { adminEmploymentStatus } from '../../../test-data/admin/frontend/employmentStatus';
import { BasePage } from '../BasePage';

/**
 * Admin → Job → Employment Status: list page (`employmentStatus`) + add/edit form
 * (`saveEmploymentStatus` / `saveEmploymentStatus/{id}`).
 * Selectors verified live via Playwright MCP (2026-06-09).
 *
 * NOTE: the form's only text input must be scoped to the form (`.oxd-form`) — the page
 * also renders a sidebar "Search" `input.oxd-input`, so an unscoped `.oxd-input` is ambiguous.
 */
export class EmploymentStatusPage extends BasePage {
  // ── Add / Edit form ───────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly editFormHeading: Locator;
  readonly nameInput: Locator;
  readonly nameFieldError: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── List page ─────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly tableRows: Locator;
  /** Name column cells (2nd cell of each row). Structural CSS — OXD renders no testids on data cells. */
  readonly nameCells: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add Employment Status' });
    this.editFormHeading = page.getByRole('heading', { name: 'Edit Employment Status' });
    this.nameInput = page.locator('.oxd-form input.oxd-input');
    this.nameFieldError = page.locator('.oxd-form .oxd-input-field-error-message');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.listHeading = page.getByRole('heading', { name: 'Employment Status' });
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
    await this.goto(adminEmploymentStatus.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(adminEmploymentStatus.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
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

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** All name-column values currently rendered, top to bottom. */
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

  /** Opens the edit form for a row via its pencil icon (order-independent: matched by icon class). */
  async openEditFormForName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-pencil-fill)').click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** Opens the delete confirmation dialog via the row's trash icon (order-independent: matched by icon class). */
  async openDeleteDialogForName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-trash)').click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  /** Deletes a row via the trash icon + confirmation dialog (first action button = trash). */
  async deleteRowByName(name: string): Promise<void> {
    await this.openDeleteDialogForName(name);
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }
}
