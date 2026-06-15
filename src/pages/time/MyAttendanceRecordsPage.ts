import type { Locator, Page } from '@playwright/test';
import { attendance } from '../../../test-data/time/frontend/attendance';
import { BasePage } from '../BasePage';

/**
 * Time → Attendance → My Records (`/attendance/viewMyAttendanceRecord`).
 * A self-scoped, read-only grid of the logged-in employee's punch records for a chosen date, with a
 * collapsible Date filter (Date* + View), a "(N) Record(s) Found" counter, and a
 * "Total Duration (Hours): X" summary. There is no employee selector and no row edit/delete affordance
 * under the default config. Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-14).
 */
export class MyAttendanceRecordsPage extends BasePage {
  readonly heading: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly totalDurationText: Locator;
  readonly tableRows: Locator;

  // ── Date filter ───────────────────────────────────────────────────────────
  /** Caret icon-button beside the heading that expands/collapses the Date filter. */
  readonly filterToggle: Locator;
  readonly dateInput: Locator;
  readonly viewButton: Locator;
  readonly dateError: Locator;
  readonly requiredLegend: Locator;
  /** The employee autocomplete used on admin screens — asserted ABSENT here (self-scope). */
  readonly employeeAutocomplete: Locator;
  /** The "Employee Name" field label (present on admin Employee Records) — asserted ABSENT here. */
  readonly employeeNameLabel: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: attendance.headings.myRecords });
    // Anchor on the "(N)" counter so this never matches the "No Records Found" empty-state span.
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.totalDurationText = page.locator('span').filter({ hasText: /Total Duration \(Hours\)/ });
    this.tableRows = page.locator('.oxd-table-card');

    this.filterToggle = page
      .locator('.oxd-icon-button')
      .filter({ has: page.locator('.bi-caret-up-fill, .bi-caret-down-fill') });
    this.dateInput = page.locator('input[placeholder="yyyy-mm-dd"]');
    this.viewButton = page.getByRole('button', { name: 'View' });
    this.dateError = page.locator('.oxd-input-field-error-message');
    this.requiredLegend = page.getByText(attendance.messages.requiredLegend, { exact: true });
    this.employeeAutocomplete = page.getByPlaceholder('Type for hints...');
    this.employeeNameLabel = page.getByText('Employee Name', { exact: true });
  }

  async gotoMyRecords(): Promise<void> {
    await this.goto(attendance.routes.myRecords);
    await this.waitUntilTableLoaderDissapear();
  }

  /** Expands the Date filter panel if it is collapsed (idempotent). */
  async openFilter(): Promise<void> {
    if (!(await this.dateInput.isVisible())) {
      await this.filterToggle.click();
      await this.dateInput.waitFor({ state: 'visible' });
    }
  }

  /** Opens the filter, sets the Date, clicks View, and waits for the table to settle. */
  async viewDate(date: string): Promise<void> {
    await this.openFilter();
    await this.dateInput.fill(date);
    await this.viewButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Opens the filter, clears the Date, and clicks View (to exercise required-field validation). */
  async clearDateAndView(): Promise<void> {
    await this.openFilter();
    await this.dateInput.fill('');
    await this.viewButton.click();
  }

  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  /** Numeric value from the "(N) Record(s) Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }
}
