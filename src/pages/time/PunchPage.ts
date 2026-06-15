import type { Locator, Page } from '@playwright/test';
import { attendance } from '../../../test-data/time/frontend/attendance';
import { BasePage } from '../BasePage';

/**
 * Time → Attendance → Punch In/Out (`/attendance/punchIn` ⇄ `/attendance/punchOut`).
 *
 * The two routes share one component: when the employee is already punched in, `/attendance/punchIn`
 * redirects to `/attendance/punchOut` (heading "Punch Out", **Out** button + a read-only punched-in
 * summary); otherwise it shows "Punch In" + **In**. With `canUserChangeCurrentTime = false` (default)
 * the Date/Time fields are disabled and the server's current time is submitted.
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export class PunchPage extends BasePage {
  readonly punchInHeading: Locator;
  readonly punchOutHeading: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly noteInput: Locator;
  readonly inButton: Locator;
  readonly outButton: Locator;
  readonly requiredLegend: Locator;
  readonly punchedInTimeLabel: Locator;
  readonly punchedInNoteLabel: Locator;
  readonly credentialRequired: Locator;
  /** Admin-only screen headings — asserted ABSENT for ESS denial checks. */
  readonly attendanceConfigHeading: Locator;
  readonly employeeRecordsHeading: Locator;

  constructor(page: Page) {
    super(page);

    this.punchInHeading = page.getByRole('heading', { name: attendance.headings.punchIn });
    this.punchOutHeading = page.getByRole('heading', { name: attendance.headings.punchOut });
    this.dateInput = page.locator('input[placeholder="yyyy-mm-dd"]');
    this.timeInput = page.locator('input[placeholder="hh:mm"]');
    this.noteInput = page.locator('textarea.oxd-textarea');
    this.inButton = page.getByRole('button', { name: 'In', exact: true });
    this.outButton = page.getByRole('button', { name: 'Out', exact: true });
    this.requiredLegend = page.getByText(attendance.messages.requiredLegend, { exact: true });
    this.punchedInTimeLabel = page.getByText(attendance.messages.punchedInTimeLabel, { exact: true });
    this.punchedInNoteLabel = page.getByText(attendance.messages.punchedInNoteLabel, { exact: true });
    this.credentialRequired = page.getByText(attendance.messages.credentialRequired, { exact: true });
    this.attendanceConfigHeading = page.getByRole('heading', { name: attendance.headings.configuration });
    this.employeeRecordsHeading = page.getByRole('heading', { name: attendance.headings.employeeRecords });
  }

  /** Opens the punch screen; the app redirects to punchIn or punchOut based on current state. */
  async gotoPunch(): Promise<void> {
    await this.goto(attendance.routes.punchIn);
    await this.waitUntilFormLoaderDissapear();
  }

  /** Opens the punch-out route directly; the app redirects to punchIn when no record is open. */
  async gotoPunchOut(): Promise<void> {
    await this.goto(attendance.routes.punchOut);
    await this.waitUntilFormLoaderDissapear();
  }

  /** Clicks **In** (optionally typing a note first) and waits for the save/redirect to settle. */
  async punchIn(note?: string): Promise<void> {
    if (note) await this.noteInput.fill(note);
    await this.inButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** Clicks **Out** (optionally typing a note first) and waits for the save/redirect to settle. */
  async punchOut(note?: string): Promise<void> {
    if (note) await this.noteInput.fill(note);
    await this.outButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  noteText(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
