import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Leave → My Leave (ESS, `/leave/viewMyLeaveList`, top-bar tab "My Leave").
 *
 * The employee's OWN leave list. Search form: From Date, To Date,
 * **Show Leave with Status** (a REQUIRED OXD multi-select — all five statuses are
 * pre-selected by default) and Leave Type. There is intentionally **no Employee Name
 * field** (self-only). Results grid columns (verified against OXD 5.8):
 * Date · Employee Name · Leave Type · Leave Balance (Days) · Number of Days · Status ·
 * Comments · Actions.
 *
 * Row actions for an own request: an inline **Cancel** button
 * (`.oxd-button--label-warn`) on cancellable rows (Pending Approval / Scheduled) plus a
 * "⋮" dropdown. There is NO Approve/Reject on own leave (self-approval is blocked).
 */
export class MyLeavePage extends BasePage {
  readonly pageHeading: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly statusGroup: Locator;
  readonly statusSelectText: Locator;
  readonly statusChips: Locator;
  readonly statusRequiredError: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly noRecordsFound: Locator;
  readonly employeeNameAutocomplete: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'My Leave List', exact: true });
    this.fromDateInput = page.locator('input[placeholder="yyyy-mm-dd"]').first();
    this.toDateInput = page.locator('input[placeholder="yyyy-mm-dd"]').nth(1);

    this.statusGroup = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Show Leave with Status/i });
    this.statusSelectText = this.statusGroup.locator('.oxd-select-text');
    this.statusChips = this.statusGroup.locator('.oxd-multiselect-chips-selected');
    this.statusRequiredError = this.statusGroup.locator('.oxd-input-field-error-message');

    // The Leave Type group's text is "Leave Type-- Select --"; match the label as a
    // substring (the status multi-select group text never contains "Leave Type").
    this.leaveTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Leave Type/i })
      .locator('.oxd-select-text');

    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.successToast = page.locator('.oxd-toast--success');
    this.errorToast = page.locator('.oxd-toast--error');
    // Grid empty-state is a <span class="oxd-text--span">. Scope to the span so we don't
    // also match the transient "Info: No Records Found" toast (<p>), which would otherwise
    // trip Playwright's strict-mode (two matches).
    this.noRecordsFound = page
      .locator('span.oxd-text--span')
      .filter({ hasText: 'No Records Found' });
    // Self-only page: this autocomplete must NOT exist here.
    this.employeeNameAutocomplete = page.getByPlaceholder('Type for hints...');
  }

  async gotoMyLeaveList(): Promise<void> {
    await this.goto('/web/index.php/leave/viewMyLeaveList');
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  /** Remove every selected status chip (the filter starts with all five selected). */
  async clearAllStatuses(): Promise<void> {
    // Each chip carries a `bi-x --clear` icon; clicking it deselects that status.
    // Clicking a chip can pop the option listbox open, which then overlays the remaining
    // chips and intercepts the next click — close it (Escape) before each removal.
    let guard = 0;
    while ((await this.statusChips.count()) > 0 && guard < 12) {
      await this.page.keyboard.press('Escape');
      await this.statusChips.first().locator('i.--clear').click();
      guard += 1;
    }
  }

  /** Open the multi-select and tick a single status option. */
  async addStatus(label: string): Promise<void> {
    await this.statusSelectText.click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
  }

  /** Deselect everything, then select exactly one status. */
  async selectOnlyStatus(label: string): Promise<void> {
    await this.clearAllStatuses();
    await this.addStatus(label);
  }

  async selectLeaveType(label: string): Promise<void> {
    await this.selectOxdOption(this.leaveTypeDropdown, label);
  }

  async setDateRange(fromDate: string, toDate: string): Promise<void> {
    // fill() commits the value via the input event (OXD v-model). Press Escape (not Tab)
    // afterwards to close the date-picker popup without moving focus onto the next control
    // — a lingering calendar/dropdown can otherwise intercept a subsequent Reset/Search click.
    await this.fromDateInput.fill(fromDate);
    await this.toDateInput.fill(toDate);
    await this.page.keyboard.press('Escape');
  }

  async search(): Promise<void> {
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async reset(): Promise<void> {
    // Close any open multi-select/date dropdown first — clicking Reset while the status
    // listbox is still open leaves the form half-reset (status emptied, dates not restored).
    await this.page.keyboard.press('Escape');
    await this.resetButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** The currently selected status labels (chip texts). */
  async selectedStatusLabels(): Promise<string[]> {
    const texts = await this.statusChips.allInnerTexts();
    return texts.map((t) => t.trim());
  }

  /** All result rows. */
  rows(): Locator {
    return this.page.locator('.oxd-table-card');
  }

  /** A single grid row located by any contained text (typically the leave date). */
  rowByText(text: string): Locator {
    return this.rows().filter({ hasText: text });
  }

  /** The inline "Cancel" button within a specific row. */
  cancelButton(rowText: string): Locator {
    return this.rowByText(rowText).getByRole('button', { name: 'Cancel' });
  }

  /** "Number of Days" cell value for a row (6th cell: ☐·Date·Emp·Type·Balance·Days·…). */
  async numberOfDaysFor(rowText: string): Promise<string> {
    const cell = this.rowByText(rowText).locator('[role="cell"]').nth(5);
    return (await cell.innerText()).trim();
  }

  /** Employee-name cell (3rd cell) of a row — as a Locator, for assertions in tests. */
  employeeNameCell(row: Locator): Locator {
    return row.locator('[role="cell"]').nth(2);
  }

  /** Employee-name cell value for a row (3rd cell). */
  async employeeNameFor(rowText: string): Promise<string> {
    const cell = this.rowByText(rowText).locator('[role="cell"]').nth(2);
    return (await cell.innerText()).trim().replace(/\s+/g, ' ');
  }

  /** Click the inline Cancel on a row and wait for the success toast + grid reload. */
  async cancelRow(rowText: string): Promise<void> {
    await this.cancelButton(rowText).click();
    await this.successToast.waitFor({ state: 'visible' });
    await this.waitUntilTableLoaderDissapear();
  }

  /** "Leave Balance (Days)" cell value for a row (5th cell). */
  async balanceFor(rowText: string): Promise<string> {
    const cell = this.rowByText(rowText).locator('[role="cell"]').nth(4);
    return (await cell.innerText()).trim();
  }

  /** Open a row's "⋮" dropdown menu. */
  async openRowMenu(rowText: string): Promise<void> {
    await this.rowByText(rowText).locator('.oxd-table-dropdown button').click();
  }

  /** A menu item inside an open "⋮" dropdown (e.g. "View Leave Details"). */
  rowMenuItem(label: string): Locator {
    return this.page.locator('.oxd-dropdown-menu').getByText(label, { exact: true });
  }

  /** Open the status multi-select and return its option labels (then close it). */
  async statusOptionTexts(): Promise<string[]> {
    await this.statusSelectText.click();
    const options = this.page.getByRole('option');
    await options.first().waitFor({ state: 'visible' });
    const texts = await options.allInnerTexts();
    await this.page.keyboard.press('Escape');
    return texts.map((t) => t.trim());
  }

  /** Open the Leave Type dropdown and return its option labels (then close it). */
  async leaveTypeOptionTexts(): Promise<string[]> {
    await this.leaveTypeDropdown.click();
    const options = this.page.locator('.oxd-select-dropdown [role="option"]');
    await options.first().waitFor({ state: 'visible' });
    const texts = await options.allInnerTexts();
    await this.page.keyboard.press('Escape');
    return texts.map((t) => t.trim());
  }

  /** A result-grid column header by its label. */
  columnHeader(name: string): Locator {
    return this.page.getByRole('columnheader', { name, exact: true });
  }
}
