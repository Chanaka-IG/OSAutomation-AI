import type { Locator, Page } from '@playwright/test';
import { attendance } from '../../../test-data/time/frontend/attendance';
import { BasePage } from '../BasePage';

/**
 * Time → Attendance → Configuration (`/attendance/configure`).
 *
 * Admin-only single screen with three OXD **switch** toggles (`canUserChangeCurrentTime`,
 * `canUserModifyAttendance`, `canSupervisorModifyAttendance`) + Save. The config is a global **singleton**
 * — suites that write it must capture and restore the prior values. The underlying `input[type="checkbox"]`
 * is intercepted, so toggling clicks the `.oxd-switch-input` span (per `[[pim-optional-fields]]`).
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-14).
 */
export class AttendanceConfigPage extends BasePage {
  readonly heading: Locator;
  readonly saveButton: Locator;
  readonly credentialRequired: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: attendance.headings.configuration });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.credentialRequired = page.getByText(attendance.messages.credentialRequired, { exact: true });
  }

  async gotoConfig(): Promise<void> {
    await this.goto(attendance.routes.configure);
    await this.waitUntilFormLoaderDissapear();
  }

  /** The toggle row (label + switch) for a given config label. */
  private configRow(label: string): Locator {
    return this.page.locator('.orangehrm-attendance-field-row').filter({ hasText: label });
  }

  label(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** Whether the switch for `label` is currently ON (reads the underlying checkbox). */
  async isEnabled(label: string): Promise<boolean> {
    return this.configRow(label).locator('input[type="checkbox"]').isChecked();
  }

  /** Sets the switch for `label` to `on` (no-op if already in that state). */
  async setSwitch(label: string, on: boolean): Promise<void> {
    if ((await this.isEnabled(label)) !== on) {
      await this.configRow(label).locator('.oxd-switch-input').click();
    }
  }

  /**
   * Clicks Save, waits for the config PUT to actually land, then verifies the success toast.
   * Awaiting the response (not just the toast) is essential for back-to-back saves: the previous
   * save's toast can linger, so a toast-only wait could return before the new PUT completes.
   */
  async save(): Promise<void> {
    const response = this.page.waitForResponse(
      (r) => r.url().includes(attendance.apiPaths.configs) && r.request().method() === 'PUT',
    );
    await this.saveButton.click();
    await response;
    await this.verifySuccessToastForSave();
  }
}
