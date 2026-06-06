import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Leave → Apply Leave (ESS, `/leave/applyLeave`).
 * Mirrors Assign Leave but applies for the logged-in user only — there is NO
 * employee selector, and the submit button is "Apply".
 */
export class ApplyLeavePage extends BasePage {
  readonly pageHeading: Locator;
  readonly employeeNameInput: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly leaveBalanceText: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly durationDropdown: Locator;
  readonly partialDaysDropdown: Locator;
  readonly commentsTextarea: Locator;
  readonly applyButton: Locator;
  readonly validationErrors: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'Apply Leave', exact: true });
    // Apply Leave has no employee field; this locator is used to assert its ABSENCE.
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');

    this.leaveTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Leave Type/ })
      .locator('.oxd-select-text');

    this.leaveBalanceText = page.locator('.orangehrm-leave-balance-text');

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

    this.commentsTextarea = page.locator('textarea.oxd-textarea');
    this.applyButton = page.getByRole('button', { name: 'Apply' });
    this.validationErrors = page.locator('.oxd-input-field-error-message');
    this.successToast = page.locator('.oxd-toast--success');
    this.errorToast = page.locator('.oxd-toast--error');
  }

  async gotoApplyLeave(): Promise<void> {
    await this.goto('/web/index.php/leave/applyLeave');
    await this.pageHeading.waitFor({ state: 'visible' });
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

  /** Wait for the Duration dropdown (single-day leave). */
  async waitForDurationDropdown(timeout = 6_000): Promise<void> {
    await this.durationDropdown.waitFor({ state: 'visible', timeout });
  }

  /** Single-day shows "Duration"; multi-day shows "Partial Days". */
  async waitForFormReady(timeout = 8_000): Promise<void> {
    await Promise.race([
      this.durationDropdown.waitFor({ state: 'visible', timeout }),
      this.partialDaysDropdown.waitFor({ state: 'visible', timeout }),
    ]);
  }

  async selectDuration(duration: string): Promise<void> {
    const dropdownList = this.page.locator('.oxd-select-dropdown');
    if (!(await dropdownList.isVisible())) {
      await this.durationDropdown.click();
    }
    await this.page.getByRole('option', { name: duration, exact: true }).click();
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentsTextarea.fill(comment);
  }

  async apply(): Promise<void> {
    await this.applyButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  /**
   * Click Apply for a failure-path attempt (over-balance, invalid dates, overlap).
   * The button may be disabled or the submit may be rejected — neither fails the
   * action; callers assert the outcome (no toast / conflict panel / API delta).
   */
  async attemptApply(): Promise<void> {
    await this.applyButton.click({ timeout: 5_000 }).catch(() => {});
    await this.waitUntilFormLoaderDissapear();
  }

  /**
   * A row of the inline "(N) Record Found" overlap-conflict table that OrangeHRM
   * renders above the form instead of saving an overlapping request (no toast fires).
   */
  overlapConflictRow(text: string): Locator {
    return this.page.locator('.oxd-table-card').filter({ hasText: text });
  }

  /** A Leave Type option by label — only ENTITLED types are listed for ESS users. */
  leaveTypeOption(label: string): Locator {
    return this.page.getByRole('option', { name: label, exact: true });
  }

  /** Open the Leave Type dropdown (e.g. to assert which options are offered). */
  async openLeaveTypeDropdown(): Promise<void> {
    await this.leaveTypeDropdown.click();
  }

  async getLeaveBalance(): Promise<string> {
    return ((await this.leaveBalanceText.textContent()) ?? '').trim();
  }

  async getLeaveBalanceDays(): Promise<number> {
    const match = (await this.getLeaveBalance()).match(/[\d.]+/);
    return match ? Number(match[0]) : NaN;
  }
}
