import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LeaveEntitlementsPage extends BasePage {
  // ── Page header ────────────────────────────────────────────────────────────
  readonly pageHeading: Locator;

  // ── Mode toggle ────────────────────────────────────────────────────────────
  readonly individualRadio: Locator;
  readonly multipleRadio: Locator;

  // ── Individual mode ────────────────────────────────────────────────────────
  readonly employeeNameInput: Locator;

  // ── Shared form fields ─────────────────────────────────────────────────────
  readonly leaveTypeDropdown: Locator;
  readonly leavePeriodDropdown: Locator;
  readonly entitlementInput: Locator;

  // ── Multiple Employees mode filters ────────────────────────────────────────
  readonly locationDropdown: Locator;
  readonly subUnitDropdown: Locator;
  readonly matchCountText: Locator;

  // ── Footer ─────────────────────────────────────────────────────────────────
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'Add Leave Entitlement', exact: true });

    this.individualRadio = page.locator('.oxd-radio-wrapper').filter({ hasText: 'Individual Employee' });
    this.multipleRadio = page.locator('.oxd-radio-wrapper').filter({ hasText: 'Multiple Employees' });

    this.employeeNameInput = page.getByPlaceholder('Type for hints...');

    this.leaveTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Leave Type/ })
      .locator('.oxd-select-text');
    this.leavePeriodDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Leave Period/ })
      .locator('.oxd-select-text');
    this.entitlementInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Entitlement/ })
      .locator('.oxd-input');

    this.locationDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Location/ })
      .locator('.oxd-select-text');
    this.subUnitDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Sub Unit/ })
      .locator('.oxd-select-text');
    this.matchCountText = page.locator('p').filter({ hasText: /match/i });

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.validationErrors = page.locator('.oxd-input-field-error-message');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoAddEntitlement(): Promise<void> {
    await this.goto('/web/index.php/leave/addLeaveEntitlement');
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  // ── Mode toggle ────────────────────────────────────────────────────────────

  async selectIndividualMode(): Promise<void> {
    await this.individualRadio.click();
  }

  async selectMultipleMode(): Promise<void> {
    await this.multipleRadio.click();
  }

  // ── Individual mode actions ────────────────────────────────────────────────

  async selectEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
    const option = this.page.getByRole('option', { name, exact: true });
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await option.click();
  }

  // ── Shared actions ─────────────────────────────────────────────────────────

  private async selectOxdOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  async selectLeaveType(type: string): Promise<void> {
    await this.selectOxdOption(this.leaveTypeDropdown, type);
  }

  async selectLeavePeriod(period: string): Promise<void> {
    await this.selectOxdOption(this.leavePeriodDropdown, period);
  }

  async fillEntitlement(value: string): Promise<void> {
    await this.entitlementInput.fill(value);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  // ── Multiple Employees mode actions ────────────────────────────────────────

  async selectLocation(location: string): Promise<void> {
    await this.selectOxdOption(this.locationDropdown, location);
  }

  async selectSubUnit(subUnit: string): Promise<void> {
    await this.selectOxdOption(this.subUnitDropdown, subUnit);
  }

  async getMatchCount(): Promise<number> {
    const text = await this.matchCountText.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ── Bulk confirm modal ─────────────────────────────────────────────────────

  getConfirmModal(): Locator {
    return this.page.locator('.oxd-dialog-container-default');
  }

  async confirmModal(): Promise<void> {
    const modal = this.getConfirmModal();
    await modal.waitFor({ state: 'visible', timeout: 8_000 });
    await modal.getByRole('button', { name: 'Confirm' }).click();
    await this.waitUntilFormLoaderDissapear();
  }

  async cancelModal(): Promise<void> {
    // Scope Cancel to the modal so we don't click the form footer Cancel button
    const modal = this.getConfirmModal();
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
    await modal.getByRole('button', { name: 'Cancel' }).click();
  }

  // Keep backward-compatible aliases
  getBulkConfirmModal(): Locator {
    return this.getConfirmModal();
  }

  async confirmBulkModal(): Promise<void> {
    return this.confirmModal();
  }

  async cancelBulkModal(): Promise<void> {
    return this.cancelModal();
  }
}
