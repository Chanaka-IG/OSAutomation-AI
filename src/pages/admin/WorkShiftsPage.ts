import type { Locator, Page } from '@playwright/test';
import { adminWorkShifts } from '../../../test-data/admin/frontend/workShifts';
import { BasePage } from '../BasePage';

type TimeParts = { hour: string; minute: string; meridiem: 'AM' | 'PM' };

/**
 * Admin → Job → Work Shifts: list page (`workShift`) + add form (`saveWorkShifts`).
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export class WorkShiftsPage extends BasePage {
  // ── Add form ────────────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly shiftNameGroup: Locator;
  readonly shiftNameInput: Locator;
  readonly shiftNameError: Locator;
  readonly fromGroup: Locator;
  readonly toGroup: Locator;
  readonly fromInput: Locator;
  readonly toInput: Locator;
  readonly durationGroup: Locator;
  readonly durationValue: Locator;
  readonly assignedEmployeesInput: Locator;
  readonly assignedEmployeesGroup: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── List page ───────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly tableRows: Locator;

  // ── Delete confirmation dialog ──────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.addFormHeading = page.getByRole('heading', { name: 'Add Work Shift' });
    this.shiftNameGroup = page.locator('.oxd-input-group').filter({ hasText: 'Shift Name' });
    this.shiftNameInput = this.shiftNameGroup.locator('input.oxd-input');
    this.shiftNameError = this.shiftNameGroup.locator('.oxd-input-field-error-message');

    // Exact label match — 'To'/'From' are short substrings, so scope by the label node.
    this.fromGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('From', { exact: true }) });
    this.toGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('To', { exact: true }) });
    this.fromInput = this.fromGroup.locator('input[placeholder="hh:mm"]');
    this.toInput = this.toGroup.locator('input[placeholder="hh:mm"]');

    this.durationGroup = page.locator('.oxd-input-group').filter({ hasText: 'Duration Per Day' });
    // The value is the last <p> in the group — resilient to an added hint/sub-label paragraph.
    this.durationValue = this.durationGroup.locator('p').last();

    this.assignedEmployeesGroup = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Assigned Employees' });
    this.assignedEmployeesInput = page.getByPlaceholder('Type for hints...');

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.listHeading = page.getByRole('heading', { name: 'Work Shifts' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    // Anchor on the "(N)" counter so this can never match the "No Records Found" empty-state span.
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    // Scope to the list span — an info toast renders the same copy in a <p>.
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.tableRows = page.locator('.oxd-table-card');

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoList(): Promise<void> {
    await this.goto(adminWorkShifts.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(adminWorkShifts.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ───────────────────────────────────────────────────────

  async fillName(name: string): Promise<void> {
    await this.shiftNameInput.fill(name);
  }

  /**
   * Drives the OXD 12-hour time picker for the From/To field: opens the pop-up,
   * sets the hour/minute spinners and the AM/PM toggle, then closes it so the
   * read-only Duration Per Day recomputes. `.fill()` on the masked input alone
   * does not trigger the recalculation — the pop-up spinners must be used.
   */
  async setTime(which: 'from' | 'to', time: TimeParts): Promise<void> {
    const group = which === 'from' ? this.fromGroup : this.toGroup;
    const input = which === 'from' ? this.fromInput : this.toInput;

    await input.click();
    await group.locator('.oxd-time-hour-input-text').fill(time.hour);
    await group.locator('.oxd-time-minute-input-text').fill(time.minute);
    const radioName = time.meridiem === 'AM' ? 'am' : 'pm';
    await group.locator(`input[name="${radioName}"]`).click();

    // Close the pop-up (blur) so Duration Per Day recomputes.
    await this.addFormHeading.click();
  }

  /** The auto-computed Duration Per Day value (e.g. "8.00"). */
  async readDuration(): Promise<string> {
    return (await this.durationValue.innerText()).trim();
  }

  /** Types a query into Assigned Employees and selects the named option from the hint list. */
  async assignEmployee(query: string, optionName: string): Promise<void> {
    await this.assignedEmployeesInput.fill(query);
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  /** A selected employee chip inside the Assigned Employees field, matched by name. */
  employeeChip(name: string): Locator {
    return this.assignedEmployeesGroup.locator('.oxd-chip').filter({ hasText: name });
  }

  /** Removes a selected employee chip via its × button. */
  async removeEmployeeChip(name: string): Promise<void> {
    await this.employeeChip(name).locator('.bi-x').first().click();
  }

  /**
   * Clicks Save and verifies the success toast via the shared BasePage check
   * (asserts the Success header + "Successfully Saved" message), then waits for
   * the list grid to settle after the SPA redirect.
   */
  async saveAndVerifyToast(): Promise<void> {
    await this.saveButton.click();
    await this.verifySuccessToastForSave();
    await this.waitUntilTableLoaderDissapear();
  }

  // ── List interactions ───────────────────────────────────────────────────────

  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Numeric value from the "(N) Record(s) Found" counter. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  /** Opens the delete confirmation dialog via the row's trash icon (first action button). */
  async openDeleteDialogForName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button').first().click();
    await this.deleteDialog.waitFor({ state: 'visible' });
  }

  /** Deletes a row via the trash icon + confirmation dialog. */
  async deleteRowByName(name: string): Promise<void> {
    await this.openDeleteDialogForName(name);
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }
}
