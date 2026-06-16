import type { Locator, Page } from '@playwright/test';
import { timesheets } from '../../../test-data/time/frontend/timesheets';
import { BasePage } from '../BasePage';

/**
 * Time → Timesheets → My Timesheet: the self-scoped view (`time/viewMyTimesheet`) and the
 * Edit Timesheet form (`time/editTimesheet/{id}`).
 *
 * View: period selector (`‹`/`›` chevrons + range field), a grid (Project · Activity · 7 day
 * columns · Total) or a "No Timesheets Found" + Create Timesheet empty-state, a `Status:` line with
 * Edit (+ Submit when Not Submitted), and an "Actions Performed on the Timesheet" log.
 * Edit: rows of Project (autocomplete, option label `Customer - Project`) · Activity (OXD select) ·
 * seven day inputs (HH:MM or decimal) · row delete; with Cancel / Reset / Save.
 *
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-15).
 */
export class MyTimesheetPage extends BasePage {
  // ── View ────────────────────────────────────────────────────────────────────
  readonly viewHeading: Locator;
  readonly periodInput: Locator;
  readonly prevPeriodButton: Locator;
  readonly nextPeriodButton: Locator;
  readonly statusText: Locator;
  readonly editButton: Locator;
  readonly submitButton: Locator;
  readonly createButton: Locator;
  readonly noTimesheetsAlert: Locator;
  readonly noRecordsRow: Locator;
  readonly employeeNameLabel: Locator;
  readonly actionLogHeading: Locator;
  readonly actionLogTable: Locator;
  readonly gridRows: Locator;
  readonly grandTotalRow: Locator;

  // ── Edit ──────────────────────────────────────────────────────────────────
  readonly editHeading: Locator;
  readonly projectInput: Locator;
  readonly activityDropdown: Locator;
  readonly dayInputs: Locator;
  readonly rowDeleteButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly resetButton: Locator;
  readonly hoursError: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    super(page);

    this.viewHeading = page.getByRole('heading', { name: timesheets.headings.view, exact: true });
    this.periodInput = page.getByPlaceholder('yyyy-mm-dd');
    // Scope the chevrons to the period section so the sidebar's chevron-left is excluded.
    const periodSection = page
      .locator('div')
      .filter({ has: page.getByText('Timesheet Period', { exact: true }) })
      .filter({ has: this.periodInput })
      .last();
    this.prevPeriodButton = periodSection.locator('button:has(.bi-chevron-left)');
    this.nextPeriodButton = periodSection.locator('button:has(.bi-chevron-right)');
    this.statusText = page.locator('p').filter({ hasText: 'Status:' });
    this.editButton = page.getByRole('button', { name: 'Edit', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Submit', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create Timesheet' });
    this.noTimesheetsAlert = page.getByText(timesheets.messages.noTimesheetsFound, { exact: true });
    this.noRecordsRow = page.getByText(timesheets.messages.noRecordsFound, { exact: true });
    this.employeeNameLabel = page.getByText('Employee Name', { exact: true });
    this.actionLogHeading = page.getByRole('heading', { name: 'Actions Performed on the Timesheet' });
    this.actionLogTable = page.locator('.oxd-table').filter({ has: page.getByText('Performed By') });
    // The view timesheet uses a bespoke table (not the OXD card table); the footer carries `--total`.
    this.gridRows = page.locator('.orangehrm-timesheet-table-body-row');
    this.grandTotalRow = page.locator('.orangehrm-timesheet-table-body-row').filter({ hasText: 'Total' }).first();

    this.editHeading = page.getByRole('heading', { name: timesheets.headings.edit, exact: true });
    // First editable row = the row carrying the Project autocomplete.
    const editRow = page
      .locator('.oxd-table-body .oxd-table-row, table tbody tr')
      .filter({ has: page.getByPlaceholder('Type for hints...') })
      .first();
    this.projectInput = editRow.getByPlaceholder('Type for hints...');
    this.activityDropdown = editRow.locator('.oxd-select-text');
    this.dayInputs = editRow.locator('input.oxd-input');
    this.rowDeleteButton = editRow.locator('.oxd-icon-button').last();
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.resetButton = page.getByRole('button', { name: 'Reset', exact: true });
    this.hoursError = page.getByText(timesheets.messages.hoursInvalid);
    this.validationErrors = page.locator('.oxd-input-field-error-message');
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoView(): Promise<void> {
    await this.goto(timesheets.routes.view);
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoViewWeek(date: string): Promise<void> {
    await this.goto(timesheets.routes.viewWeek(date));
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoEdit(id: number): Promise<void> {
    await this.goto(timesheets.routes.edit(id));
    await this.waitUntilFormLoaderDissapear();
  }

  // ── View interactions ─────────────────────────────────────────────────────
  async readPeriod(): Promise<string> {
    return (await this.periodInput.inputValue()).trim();
  }

  async goPrevPeriod(): Promise<void> {
    await this.prevPeriodButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  async goNextPeriod(): Promise<void> {
    await this.nextPeriodButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  async clickCreateTimesheet(): Promise<void> {
    await this.createButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await this.editHeading.waitFor({ state: 'visible' });
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** A grid row in the view that matches the given text (e.g. a project/customer name). */
  gridRowByText(text: string): Locator {
    return this.gridRows.filter({ hasText: text });
  }

  // ── Edit interactions ───────────────────────────────────────────────────────
  /**
   * Selects a project via the row autocomplete. `searchText` drives the (project/customer) search;
   * `optionLabel` is the rendered `Customer - Project` option to click.
   */
  async selectProject(searchText: string, optionLabel: string): Promise<void> {
    await this.projectInput.click();
    await this.projectInput.fill(searchText);
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
  }

  async selectActivity(name: string): Promise<void> {
    await this.selectOxdOption(this.activityDropdown, name);
  }

  /** Sets a day cell by 0-based index (0 = first day column / week start). */
  async setDayHours(dayIndex: number, value: string): Promise<void> {
    await this.dayInputs.nth(dayIndex).fill(value);
    await this.dayInputs.nth(dayIndex).press('Tab');
  }

  async deleteFirstRow(): Promise<void> {
    await this.rowDeleteButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
    await this.waitUntilFormLoaderDissapear();
  }
}
