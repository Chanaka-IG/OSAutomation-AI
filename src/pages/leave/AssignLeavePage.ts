import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class AssignLeavePage extends BasePage {
  readonly pageHeading: Locator;
  readonly employeeNameInput: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly leaveBalanceText: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly durationDropdown: Locator;
  readonly partialDaysDropdown: Locator;
  readonly fromTimeInput: Locator;
  readonly toTimeInput: Locator;
  readonly commentsTextarea: Locator;
  readonly assignButton: Locator;
  readonly validationErrors: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly autocompleteNoResults: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'Assign Leave', exact: true });
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');

    this.leaveTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Leave Type/ })
      .locator('.oxd-select-text');

    // OXD renders the live balance as `<p class="orangehrm-leave-balance-text">0.00 Day(s)</p>`.
    this.leaveBalanceText = page.locator('.orangehrm-leave-balance-text');

    // Date inputs: rely on positional order (From first, To second)
    this.fromDateInput = page.getByRole('textbox', { name: 'yyyy-mm-dd' }).first();
    this.toDateInput = page.getByRole('textbox', { name: 'yyyy-mm-dd' }).nth(1);

    this.durationDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Duration/ })
      .locator('.oxd-select-text');

    this.partialDaysDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Partial Days/ })
      .locator('.oxd-select-text');

    // Time inputs appear only when "Specify Time" duration is selected
    this.fromTimeInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^From$/ })
      .locator('input.oxd-input')
      .first();
    this.toTimeInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^To$/ })
      .locator('input.oxd-input')
      .first();

    this.commentsTextarea = page.locator('textarea.oxd-textarea');
    this.assignButton = page.getByRole('button', { name: 'Assign' });
    this.validationErrors = page.locator('.oxd-input-field-error-message');
    this.successToast = page.locator('.oxd-toast--success');
    this.errorToast = page.locator('.oxd-toast--error');
    this.autocompleteNoResults = page
      .locator('.oxd-autocomplete-dropdown')
      .getByText('No Records Found', { exact: false });
  }

  async gotoAssignLeave(): Promise<void> {
    await this.goto('/web/index.php/leave/assignLeave');
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  async selectEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
    const option = this.page.getByRole('option', { name, exact: true });
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await option.click();
  }

  /** Type a name into the employee autocomplete without selecting (e.g. to assert no match). */
  async typeEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
  }

  employeeOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  async selectLeaveType(type: string): Promise<void> {
    await this.leaveTypeDropdown.click();
    await this.page.getByRole('option', { name: type, exact: true }).click();
  }

  async fillFromDate(date: string): Promise<void> {
    await this.fromDateInput.fill(date);
    await this.fromDateInput.press('Tab');
  }

  async fillToDate(date: string): Promise<void> {
    await this.toDateInput.fill(date);
    await this.toDateInput.press('Tab');
  }

  /** Wait for the Duration dropdown to appear after dates are filled (single-day leave). */
  async waitForDurationDropdown(timeout = 6_000): Promise<void> {
    await this.durationDropdown.waitFor({ state: 'visible', timeout });
  }

  /**
   * Wait for the form to be ready after dates are filled.
   * Single-day leave shows "Duration"; multi-day leave shows "Partial Days".
   */
  async waitForFormReady(timeout = 8_000): Promise<void> {
    await Promise.race([
      this.durationDropdown.waitFor({ state: 'visible', timeout }),
      this.partialDaysDropdown.waitFor({ state: 'visible', timeout }),
    ]);
  }

  /** Open the Duration dropdown if it is not already open (no selection made). */
  async openDuration(): Promise<void> {
    const dropdownList = this.page.locator('.oxd-select-dropdown');
    if (!(await dropdownList.isVisible())) {
      await this.durationDropdown.click();
    }
  }

  durationOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  async selectDuration(duration: string): Promise<void> {
    // Tab from fillToDate may auto-open the dropdown; only click if it is not already open.
    const dropdownList = this.page.locator('.oxd-select-dropdown');
    if (!await dropdownList.isVisible()) {
      await this.durationDropdown.click();
    }
    await this.page.getByRole('option', { name: duration, exact: true }).click();
  }

  /**
   * Selecting "Specify Time" auto-fills a valid default window (09:00 AM–05:00 PM).
   * The OXD time field is a 12-hour `hh:mm AM/PM` masked input backed by a pop-up
   * picker; setting a custom time means driving that picker (hour/minute spinners +
   * AM/PM toggle), not `.fill()`. Tests that only need *a* valid Specify-Time window
   * should use the defaults rather than typing into this field.
   */

  async fillComment(comment: string): Promise<void> {
    await this.commentsTextarea.fill(comment);
  }

  async assign(): Promise<void> {
    await this.assignButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  async getLeaveBalance(): Promise<string> {
    return ((await this.leaveBalanceText.textContent()) ?? '').trim();
  }

  /** Numeric leave balance parsed from the "N.NN Day(s)" text; NaN if not rendered. */
  async getLeaveBalanceDays(): Promise<number> {
    const text = await this.getLeaveBalance();
    const match = text.match(/[\d.]+/);
    return match ? Number(match[0]) : NaN;
  }
}
