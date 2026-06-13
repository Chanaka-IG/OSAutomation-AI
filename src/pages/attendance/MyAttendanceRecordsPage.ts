import type { Locator, Page } from '@playwright/test';
import { attendance } from '../../../test-data/time/frontend/attendance';
import { BasePage } from '../BasePage';

/**
 * Time → Attendance → My Records (`/attendance/viewMyAttendanceRecord`).
 * A self-scoped grid of the logged-in employee's punch records for a date, with a
 * "(N) Record(s) Found" counter and a "Total Duration (Hours): X" summary.
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export class MyAttendanceRecordsPage extends BasePage {
  readonly heading: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly totalDurationText: Locator;
  readonly tableRows: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', { name: attendance.headings.myRecords });
    // Anchor on the "(N)" counter so this never matches the "No Records Found" empty-state span.
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.totalDurationText = page.locator('span').filter({ hasText: /Total Duration \(Hours\)/ });
    this.tableRows = page.locator('.oxd-table-card');
  }

  async gotoMyRecords(): Promise<void> {
    await this.goto(attendance.routes.myRecords);
    await this.waitUntilTableLoaderDissapear();
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
