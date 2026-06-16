import type { Locator, Page } from '@playwright/test';
import { employeeTimesheets } from '../../../test-data/time/frontend/employeeTimesheets';
import { BasePage } from '../BasePage';

/**
 * Time → Timesheets → Employee Timesheets — the supervisor/admin view.
 *
 * Select view (`time/viewEmployeeTimesheet`): a **Select Employee** card (Employee Name autocomplete +
 * View) and a "Timesheets Pending Action" panel. Detail view
 * (`time/viewTimesheet/employeeId/{empNumber}?startDate=…`): the employee's grid, a `Status:` line, and —
 * only while the timesheet is **Submitted** and it is not the viewer's own — an inline **"Timesheet
 * Action"** card with a Comment textbox + Reject/Approve buttons (no modal). An "Actions Performed on
 * the Timesheet" log sits below.
 *
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-16).
 */
export class EmployeeTimesheetPage extends BasePage {
  // ── Select view ──────────────────────────────────────────────────────────────
  readonly selectHeading: Locator;
  readonly employeeNameInput: Locator;
  readonly viewButton: Locator;
  readonly credentialRequired: Locator;

  // ── Detail view ────────────────────────────────────────────────────────────
  readonly detailHeading: Locator;
  readonly periodInput: Locator;
  readonly statusText: Locator;
  readonly gridRows: Locator;
  readonly editButton: Locator;
  // Timesheet Action card
  readonly actionCardHeading: Locator;
  readonly commentInput: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  // Action log
  readonly actionLogHeading: Locator;
  readonly actionLogTable: Locator;

  constructor(page: Page) {
    super(page);

    this.selectHeading = page.getByRole('heading', { name: employeeTimesheets.headings.select, exact: true });
    this.employeeNameInput = page.getByPlaceholder(employeeTimesheets.placeholders.employeeName);
    // The select card is the smallest block carrying BOTH the employee input and a View button —
    // this excludes the "Timesheets Pending Action" rows, which also render View buttons.
    const selectCard = page
      .locator('div')
      .filter({ has: this.employeeNameInput })
      .filter({ has: page.getByRole('button', { name: 'View', exact: true }) })
      .last();
    this.viewButton = selectCard.getByRole('button', { name: 'View', exact: true });
    this.credentialRequired = page.getByText(employeeTimesheets.messages.credentialRequired, { exact: true });

    this.detailHeading = page
      .getByRole('heading', { level: 6 })
      .filter({ hasText: employeeTimesheets.headings.detailPrefix });
    this.periodInput = page.getByPlaceholder('yyyy-mm-dd');
    this.statusText = page.locator('p').filter({ hasText: 'Status:' });
    this.gridRows = page.locator('.orangehrm-timesheet-table-body-row');
    this.editButton = page.getByRole('button', { name: 'Edit', exact: true });

    this.actionCardHeading = page.getByRole('heading', { name: employeeTimesheets.headings.action, exact: true });
    this.commentInput = page.getByPlaceholder(employeeTimesheets.placeholders.comment);
    this.approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    this.rejectButton = page.getByRole('button', { name: 'Reject', exact: true });

    this.actionLogHeading = page.getByRole('heading', { name: employeeTimesheets.headings.actionLog, exact: true });
    this.actionLogTable = page.locator('.oxd-table').filter({ has: page.getByText('Performed By') });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoSelect(): Promise<void> {
    await this.goto(employeeTimesheets.routes.selectView);
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoDetail(empNumber: number, date: string): Promise<void> {
    await this.goto(employeeTimesheets.routes.detail(empNumber, date));
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Select interactions ──────────────────────────────────────────────────────
  /** Picks an employee from the autocomplete by visible `First Last` option, then clicks View. */
  async selectEmployeeAndView(fullName: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.fill(fullName);
    await this.page.getByRole('option', { name: fullName, exact: true }).click();
    await this.viewButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Detail interactions ───────────────────────────────────────────────────────
  async approve(): Promise<void> {
    await this.approveButton.click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** Rejects the timesheet; the comment is optional in OS 5.8. */
  async reject(comment?: string): Promise<void> {
    if (comment != null) await this.commentInput.fill(comment);
    await this.rejectButton.click();
    await this.waitUntilFormLoaderDissapear();
  }
}
