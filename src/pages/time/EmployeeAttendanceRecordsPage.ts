import type { Locator, Page } from '@playwright/test';
import { attendance } from '../../../test-data/time/frontend/attendance';
import { BasePage } from '../BasePage';

/**
 * Time → Attendance → Employee Records (`/attendance/viewAttendanceRecord`).
 *
 * Admin/supervisor-only. Two surfaces on one route:
 *  - **Summary list** (no query): one row per employee — Employee Name · Total Duration (Hours) · View.
 *  - **Detail** (`?employeeId=<N>&date=<YYYY-MM-DD>`): that employee's punch records (same grid as My Records).
 *
 * A collapsible filter (caret button beside the heading) holds an optional **Employee Name** autocomplete
 * and a required **Date**; **View** with an employee selected — or a row's **View** — opens that employee's
 * detail. Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-14).
 */
export class EmployeeAttendanceRecordsPage extends BasePage {
  readonly heading: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly tableRows: Locator;
  readonly credentialRequired: Locator;

  // ── Filter ────────────────────────────────────────────────────────────────
  readonly filterToggle: Locator;
  readonly employeeAutocomplete: Locator;
  readonly dateInput: Locator;
  /** The View button inside the filter form (distinct from the per-row View buttons in the table). */
  readonly filterViewButton: Locator;
  readonly dateError: Locator;
  readonly requiredLegend: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: attendance.headings.employeeRecords });
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.tableRows = page.locator('.oxd-table-card');
    this.credentialRequired = page.getByText(attendance.messages.credentialRequired, { exact: true });

    this.filterToggle = page
      .locator('.oxd-icon-button')
      .filter({ has: page.locator('.bi-caret-up-fill, .bi-caret-down-fill') });
    this.employeeAutocomplete = page.getByPlaceholder('Type for hints...');
    this.dateInput = page.locator('input[placeholder="yyyy-mm-dd"]');
    this.filterViewButton = page.locator('form').getByRole('button', { name: 'View' });
    this.dateError = page.locator('.oxd-input-field-error-message');
    this.requiredLegend = page.getByText(attendance.messages.requiredLegend, { exact: true });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoSummary(): Promise<void> {
    await this.goto(attendance.routes.employeeRecords);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoDetail(employeeId: number, date: string): Promise<void> {
    await this.goto(`${attendance.routes.employeeRecords}?employeeId=${employeeId}&date=${date}`);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  /** Expands the filter panel if collapsed (idempotent). */
  async openFilter(): Promise<void> {
    if (!(await this.dateInput.isVisible())) {
      await this.filterToggle.click();
      await this.dateInput.waitFor({ state: 'visible' });
    }
  }

  /** Sets the Date and runs the summary query (no employee → all employees). */
  async filterByDate(date: string): Promise<void> {
    await this.openFilter();
    await this.dateInput.fill(date);
    await this.filterViewButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Picks an employee from the autocomplete and clicks View (→ that employee's detail). */
  async selectEmployeeAndView(query: string, optionName: string): Promise<void> {
    await this.openFilter();
    await this.employeeAutocomplete.fill(query);
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
    await this.filterViewButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Clears the Date and clicks View (to exercise required-field validation). */
  async clearDateAndView(): Promise<void> {
    await this.openFilter();
    await this.dateInput.fill('');
    await this.filterViewButton.click();
  }

  // ── Rows ────────────────────────────────────────────────────────────────

  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  /** The per-row View button for a named employee in the summary list. */
  rowViewButton(employeeName: string): Locator {
    return this.rowByText(employeeName).getByRole('button', { name: 'View' });
  }

  /** Clicks a summary row's View button to open that employee's detail. */
  async viewEmployeeRow(employeeName: string): Promise<void> {
    await this.rowViewButton(employeeName).click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Numeric value from the "(N) Record(s) Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }
}
