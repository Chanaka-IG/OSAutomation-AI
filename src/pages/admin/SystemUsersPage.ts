import type { Locator, Page } from '@playwright/test';
import { adminSystemUsers } from '../../../test-data/admin/frontend/systemUsers';
import { BasePage } from '../BasePage';

/**
 * Admin → User Management → Users: list page (`viewSystemUsers`) + add form (`saveSystemUser`).
 * Selectors verified live via Playwright MCP (2026-06-07).
 */
export class SystemUsersPage extends BasePage {
  // ── Add form ────────────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly userRoleDropdown: Locator;
  readonly userRoleFieldError: Locator;
  readonly employeeNameInput: Locator;
  readonly employeeNameFieldError: Locator;
  readonly statusDropdown: Locator;
  readonly statusFieldError: Locator;
  readonly usernameField: Locator;
  readonly usernameFieldError: Locator;
  readonly passwordField: Locator;
  readonly passwordFieldError: Locator;
  readonly confirmPasswordField: Locator;
  readonly confirmPasswordFieldError: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly allValidationErrors: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly tableRows: Locator;
  readonly searchUsernameInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add User' });
    this.userRoleDropdown = this.formGroup('User Role').locator('.oxd-select-text');
    this.userRoleFieldError = this.fieldError('User Role');
    // Both autocomplete inputs (add form + list filter) carry this placeholder; only one exists per page.
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.employeeNameFieldError = this.fieldError('Employee Name');
    this.statusDropdown = this.formGroup('Status').locator('.oxd-select-text');
    this.statusFieldError = this.fieldError('Status');
    this.usernameField = this.formGroup('Username').locator('input.oxd-input');
    this.usernameFieldError = this.fieldError('Username');
    this.passwordField = page.locator('input[type="password"]').first();
    this.passwordFieldError = this.fieldError('Password*');
    this.confirmPasswordField = page.locator('input[type="password"]').nth(1);
    this.confirmPasswordFieldError = this.fieldError('Confirm Password');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.allValidationErrors = page.locator('.oxd-input-field-error-message');

    this.listHeading = page.getByRole('heading', { name: 'System Users' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: 'Records Found' });
    this.tableRows = page.locator('.oxd-table-card');
    this.searchUsernameInput = this.formGroup('Username').locator('input.oxd-input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
  }

  /** OXD field group anchored by its label text (substring match on the .oxd-label). */
  private formGroup(labelText: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('.oxd-label', { hasText: labelText }) });
  }

  private fieldError(labelText: string): Locator {
    // "Password*" disambiguates from "Confirm Password*"; .oxd-label text includes the asterisk.
    const pattern = new RegExp(`^${labelText.replace('*', '\\*?$')}`);
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('.oxd-label', { hasText: pattern }) })
      .locator('.oxd-input-field-error-message');
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(adminSystemUsers.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(adminSystemUsers.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async selectUserRole(role: 'Admin' | 'ESS'): Promise<void> {
    await this.selectOxdOption(this.userRoleDropdown, role);
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.selectOxdOption(this.statusDropdown, status);
  }

  /** A hint row in the Employee Name autocomplete dropdown (also matches "No Records Found"). */
  autocompleteOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /** Types into the Employee Name autocomplete and clicks the hint with the given full name. */
  async pickEmployee(query: string, fullName: string): Promise<void> {
    await this.employeeNameInput.fill(query);
    await this.autocompleteOption(fullName).click();
  }

  async fillForm(opts: {
    role?: 'Admin' | 'ESS';
    employeeQuery?: string;
    employeeFullName?: string;
    status?: 'Enabled' | 'Disabled';
    username?: string;
    password?: string;
    confirmPassword?: string;
  }): Promise<void> {
    if (opts.role) await this.selectUserRole(opts.role);
    if (opts.employeeQuery && opts.employeeFullName) {
      await this.pickEmployee(opts.employeeQuery, opts.employeeFullName);
    }
    if (opts.status) await this.selectStatus(opts.status);
    if (opts.username !== undefined) await this.usernameField.fill(opts.username);
    if (opts.password !== undefined) await this.passwordField.fill(opts.password);
    if (opts.confirmPassword !== undefined) {
      await this.confirmPasswordField.fill(opts.confirmPassword);
    }
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

  rowByUsername(username: string): Locator {
    return this.tableRows.filter({ hasText: username });
  }

  async searchByUsername(username: string): Promise<void> {
    await this.searchUsernameInput.fill(username);
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Numeric value from the "(N) Records Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }
}
