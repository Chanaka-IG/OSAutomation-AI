import type { Locator, Page } from '@playwright/test';
import { pim } from '../../../test-data/frontend/pim';
import { BasePage } from '../BasePage';

/**
 * PIM → Add Employee (`/pim/addEmployee`).
 * Selectors target OrangeHRM OS OXD UI observed on 2026-05-14.
 */
export class AddEmployeePage extends BasePage {
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly createLoginToggle: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly photoFileInput: Locator;
  /** All inline `.oxd-input-field-error-message` spans visible on the form. */
  readonly allValidationErrors: Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput = page.locator('input[placeholder="First Name"]');
    this.middleNameInput = page.locator('input[placeholder="Middle Name"]');
    this.lastNameInput = page.locator('input[placeholder="Last Name"]');

    this.employeeIdInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Employee Id', { exact: true }) })
      .locator('input');

    this.createLoginToggle = page.locator('.oxd-switch-input');

    this.usernameInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Username', { exact: true }) })
      .locator('input');

    this.passwordInput = page.locator('input[type="password"]').nth(0);
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.photoFileInput = page.locator('input[type="file"]');

    this.allValidationErrors = page.locator('.oxd-input-field-error-message');
  }

  async gotoAddEmployee(): Promise<void> {
    await this.goto(pim.routes.addEmployee);
    await Promise.race([
      this.saveButton.waitFor({ state: 'visible' }),
      this.page.waitForURL(/auth\/login/i),
    ]);
  }

  /** Navigate via PIM sidebar link → Add Employee top-nav tab. */
  async navigateViaMenu(): Promise<void> {
    await this.page.getByRole('link', { name: /^PIM$/i }).click();
    await this.page.getByRole('link', { name: /add employee/i }).click();
    await this.saveButton.waitFor({ state: 'visible' });
  }

  async fillName(opts: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  }): Promise<void> {
    if (opts.firstName !== undefined) await this.firstNameInput.fill(opts.firstName);
    if (opts.middleName !== undefined) await this.middleNameInput.fill(opts.middleName);
    if (opts.lastName !== undefined) await this.lastNameInput.fill(opts.lastName);
  }

  async setEmployeeId(id: string): Promise<void> {
    await this.employeeIdInput.clear();
    await this.employeeIdInput.fill(id);
  }

  async getEmployeeIdValue(): Promise<string> {
    return (await this.employeeIdInput.inputValue()).trim();
  }

  /** Turns the Create Login Details toggle ON (no-op if already on). */
  async enableLoginDetails(): Promise<void> {
    const checked = await this.createLoginToggle.isChecked().catch(() => false);
    if (!checked) await this.createLoginToggle.click();
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  async fillLoginDetails(opts: {
    username?: string;
    password?: string;
    confirmPassword?: string;
    /** Defaults to 'enabled' (pre-selected). */
    status?: 'enabled' | 'disabled';
  }): Promise<void> {
    if (opts.username !== undefined) await this.usernameInput.fill(opts.username);
    if (opts.status === 'disabled') {
      await this.page
        .locator('.oxd-radio-wrapper')
        .filter({ hasText: /Disabled/ })
        .click();
    }
    if (opts.password !== undefined) await this.passwordInput.fill(opts.password);
    if (opts.confirmPassword !== undefined)
      await this.confirmPasswordInput.fill(opts.confirmPassword);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Directly set the hidden file input — works even when the element is not visible. */
  async uploadPhoto(filePath: string): Promise<void> {
    await this.photoFileInput.setInputFiles(filePath);
  }

  async waitForSaveSuccess(): Promise<void> {
    await this.page.waitForURL(/viewPersonalDetails/, { waitUntil: 'domcontentloaded' });
  }

  /** Returns the empNumber extracted from the post-save redirect URL, or null. */
  async getCreatedEmpNumber(): Promise<number | null> {
    const match = this.page.url().match(/empNumber\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /** True when the input identified by `placeholder` has the OXD error border class. */
  async inputHasError(placeholder: string): Promise<boolean> {
    const locator = this.page.locator(`.oxd-input--error[placeholder="${placeholder}"]`);
    try {
      await locator.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}
