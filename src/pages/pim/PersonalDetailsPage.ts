import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * PIM → Employee Details → Personal Details tab.
 * URL: `/web/index.php/pim/viewPersonalDetails/empNumber/{empNumber}`
 * Selectors target OrangeHRM OS OXD UI observed on 2026-05-18.
 */
export class PersonalDetailsPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly otherIdInput: Locator;
  readonly driversLicenseInput: Locator;
  readonly licenseExpiryDateInput: Locator;
  readonly nationalityDropdown: Locator;
  readonly maritalStatusDropdown: Locator;
  readonly dateOfBirthInput: Locator;
  readonly genderMaleRadio: Locator;
  readonly genderFemaleRadio: Locator;
  readonly saveButton: Locator;
  /** All visible `.oxd-input-field-error-message` spans on the page. */
  readonly allValidationErrors: Locator;
  /** The tab strip containing all 10 employee-detail navigation tabs. */
  readonly tabList: Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput = page.locator('input[placeholder="First Name"]');
    this.middleNameInput = page.locator('input[placeholder="Middle Name"]');
    this.lastNameInput = page.locator('input[placeholder="Last Name"]');

    this.employeeIdInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Employee Id', { exact: true }) })
      .locator('input');

    this.otherIdInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Other Id', { exact: true }) })
      .locator('input');

    this.driversLicenseInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText("Driver's License Number", { exact: true }) })
      .locator('input');

    this.licenseExpiryDateInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('License Expiry Date', { exact: true }) })
      .locator('input[placeholder="yyyy-mm-dd"]');

    this.nationalityDropdown = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Nationality', { exact: true }) })
      .locator('.oxd-select-wrapper');

    this.maritalStatusDropdown = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Marital Status', { exact: true }) })
      .locator('.oxd-select-wrapper');

    this.dateOfBirthInput = page
      .locator('.oxd-grid-item')
      .filter({ has: page.getByText('Date of Birth', { exact: true }) })
      .locator('input[placeholder="yyyy-mm-dd"]');

    this.genderMaleRadio = page
      .locator('.oxd-radio-wrapper')
      .filter({ hasText: 'Male' })
      .locator('input[type="radio"]');

    this.genderFemaleRadio = page
      .locator('.oxd-radio-wrapper')
      .filter({ hasText: 'Female' })
      .locator('input[type="radio"]');

    this.saveButton = page.getByRole('button', { name: 'Save' });

    this.allValidationErrors = page.locator('.oxd-input-field-error-message');

    this.tabList = page.getByRole('tablist');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoPersonalDetails(empNumber: number): Promise<void> {
    await this.goto(`/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`);
    await this.saveButton.waitFor({ state: 'visible' });
    // Wait for the Vue component to hydrate form data via AJAX (fields start empty on DOMContentLoaded).
    await this.firstNameInput.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLInputElement | null;
        return el !== null && el.value.trim() !== '';
      },
      'input[placeholder="First Name"]',
      { timeout: 15_000 },
    );
    await this.waitForFormLoader();
  }

  /** Waits for any OXD form-loading overlay to disappear before interacting. */
  private async waitForFormLoader(timeout = 10_000): Promise<void> {
    await this.page
      .locator('.oxd-form-loader')
      .waitFor({ state: 'hidden', timeout })
      .catch(() => {});
  }

  // ── Name fields ────────────────────────────────────────────────────────────

  async fillName(opts: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  }): Promise<void> {
    if (opts.firstName !== undefined) {
      await this.firstNameInput.clear();
      await this.firstNameInput.fill(opts.firstName);
    }
    if (opts.middleName !== undefined) {
      await this.middleNameInput.clear();
      await this.middleNameInput.fill(opts.middleName);
    }
    if (opts.lastName !== undefined) {
      await this.lastNameInput.clear();
      await this.lastNameInput.fill(opts.lastName);
    }
  }

  // ── Identity fields ────────────────────────────────────────────────────────

  async setEmployeeId(id: string): Promise<void> {
    await this.employeeIdInput.clear();
    await this.employeeIdInput.fill(id);
  }

  async setOtherId(value: string): Promise<void> {
    await this.otherIdInput.clear();
    await this.otherIdInput.fill(value);
  }

  async setDriversLicense(value: string): Promise<void> {
    await this.driversLicenseInput.clear();
    await this.driversLicenseInput.fill(value);
  }

  async setLicenseExpiryDate(date: string): Promise<void> {
    await this.licenseExpiryDateInput.fill(date);
    await this.licenseExpiryDateInput.press('Tab');
  }

  async setDateOfBirth(date: string): Promise<void> {
    await this.dateOfBirthInput.fill(date);
    await this.dateOfBirthInput.press('Tab');
  }

  async selectGender(gender: 'Male' | 'Female'): Promise<void> {
    await this.waitForFormLoader();
    await this.page
      .locator('.oxd-radio-wrapper')
      .filter({ hasText: gender })
      .click();
  }

  // ── OXD custom dropdowns ───────────────────────────────────────────────────

  /**
   * Opens an OXD dropdown and selects the first non-placeholder option.
   * Returns the selected option text.
   */
  async selectFirstOxdOption(dropdown: Locator): Promise<string> {
    await this.waitForFormLoader();
    await dropdown.click();
    const list = this.page.locator('.oxd-select-dropdown');
    // nth(0) is "-- Select --"; nth(1) is the first real option.
    const firstReal = list.locator('.oxd-select-option').nth(1);
    const text = (await firstReal.innerText()).trim();
    await firstReal.click();
    await this.waitForFormLoader();
    return text;
  }

  async selectNationality(): Promise<string> {
    return this.selectFirstOxdOption(this.nationalityDropdown);
  }

  async selectMaritalStatus(): Promise<string> {
    return this.selectFirstOxdOption(this.maritalStatusDropdown);
  }

  // ── Form actions ───────────────────────────────────────────────────────────

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async saveAndWaitForToast(): Promise<string> {
    const toastPromise = this.waitForSuccessToast();
    await this.save();
    return toastPromise;
  }

  // ── Value readers (for post-save assertions) ───────────────────────────────

  async getFirstNameValue(): Promise<string> {
    return (await this.firstNameInput.inputValue()).trim();
  }

  async getMiddleNameValue(): Promise<string> {
    return (await this.middleNameInput.inputValue()).trim();
  }

  async getLastNameValue(): Promise<string> {
    return (await this.lastNameInput.inputValue()).trim();
  }

  async getEmployeeIdValue(): Promise<string> {
    return (await this.employeeIdInput.inputValue()).trim();
  }

  async getOtherIdValue(): Promise<string> {
    return (await this.otherIdInput.inputValue()).trim();
  }

  async getDriversLicenseValue(): Promise<string> {
    return (await this.driversLicenseInput.inputValue()).trim();
  }

  async getLicenseExpiryDateValue(): Promise<string> {
    return (await this.licenseExpiryDateInput.inputValue()).trim();
  }

  async getDateOfBirthValue(): Promise<string> {
    return (await this.dateOfBirthInput.inputValue()).trim();
  }

  /** Returns the visible label of the selected OXD dropdown option. */
  async getOxdDropdownValue(dropdown: Locator): Promise<string> {
    return (await dropdown.locator('.oxd-select-text-input').innerText()).trim();
  }

  // ── Error helpers ──────────────────────────────────────────────────────────

  // ── Optional-field visibility helpers ───────────────────────────────────────

  /**
   * A Personal Details field group located by its exact label. Resolves to 0 elements
   * when the field is hidden (e.g. an optional field whose toggle is off).
   */
  fieldGroupByLabel(label: string): Locator {
    return this.page
      .locator('.oxd-grid-item')
      .filter({ has: this.page.getByText(label, { exact: true }) });
  }

  /**
   * An employee-record menu tab (the left/top record nav) located by its exact name.
   * The tab strip renders duplicate labels (responsive variants), so scope to the first.
   */
  recordMenuTab(name: string): Locator {
    return this.tabList.getByText(name, { exact: true }).first();
  }

  /** True when the named input carries the OXD error-border class. */
  async inputHasError(placeholder: string): Promise<boolean> {
    const el = this.page.locator(`.oxd-input--error[placeholder="${placeholder}"]`);
    try {
      await el.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Waits up to `timeout` ms for at least one validation error to appear. */
  async waitForValidationError(timeout = 5_000): Promise<void> {
    await this.allValidationErrors.first().waitFor({ state: 'visible', timeout });
  }
}
