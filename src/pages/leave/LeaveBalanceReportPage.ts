import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export type ReportData = {
  /** HTTP status of the `/leave/reports/data` response that backed this generation. */
  status: number;
  /** `meta.total` — equals the visible `(N) Records Found`. */
  total: number;
  /** The row objects the `revo-grid` is built from. */
  data: Array<Record<string, unknown>>;
};

/**
 * Leave → Reports → **Leave Entitlements and Usage Report** (`/leave/viewLeaveBalanceReport`,
 * Admin/Supervisor) and **My Leave Entitlements and Usage Report**
 * (`/leave/viewMyLeaveBalanceReport`, ESS/self).
 *
 * Admin criteria: a **Generate For** radio (`Leave Type` default | `Employee`). In Leave Type
 * mode the panel shows Leave Type / Leave Period* / Location / Sub Unit / Job Title /
 * Include Past Employees; in Employee mode it shows Employee Name* / Leave Period*. The action
 * button is **Generate**. The My report auto-generates for the logged-in user with no criteria.
 *
 * The results table is an `<revo-grid>` web component (shadow DOM) — its header/cell text is not
 * reachable via Playwright locators. This page object therefore exposes {@link generate} /
 * {@link loadMyReport}, which drive the UI and return the report's own
 * `GET /api/v2/leave/reports/data` payload (`{ status, total, data }`) for assertions, alongside
 * the light-DOM `(N) Records Found` indicator.
 */
export class LeaveBalanceReportPage extends BasePage {
  readonly heading: Locator;
  readonly generateForLeaveTypeRadio: Locator;
  readonly generateForEmployeeRadio: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly leavePeriodDropdown: Locator;
  readonly locationDropdown: Locator;
  readonly subUnitDropdown: Locator;
  readonly jobTitleDropdown: Locator;
  readonly includePastEmployeesCheckbox: Locator;
  readonly employeeNameInput: Locator;
  readonly employeeAutocompleteNoResults: Locator;
  readonly generateButton: Locator;
  readonly recordsFound: Locator;
  readonly reportTable: Locator;
  readonly validationErrors: Locator;
  readonly requiredNote: Locator;

  private readonly adminReportRoute = '/web/index.php/leave/viewLeaveBalanceReport';
  private readonly myReportRoute = '/web/index.php/leave/viewMyLeaveBalanceReport';

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole('heading', {
      name: 'Leave Entitlements and Usage Report',
      exact: true,
    });

    // "Generate For" radios — scope to the radio wrappers so the "Leave Type" dropdown label
    // (also the text "Leave Type") is never matched.
    this.generateForLeaveTypeRadio = page
      .locator('.oxd-radio-wrapper')
      .filter({ hasText: /^Leave Type$/ });
    this.generateForEmployeeRadio = page
      .locator('.oxd-radio-wrapper')
      .filter({ hasText: /^Employee$/ });

    this.leaveTypeDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Leave Type/ })
      .locator('.oxd-select-text');
    this.leavePeriodDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Leave Period/ })
      .locator('.oxd-select-text');
    this.locationDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Location/ })
      .locator('.oxd-select-text');
    this.subUnitDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Sub Unit/ })
      .locator('.oxd-select-text');
    this.jobTitleDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /^Job Title/ })
      .locator('.oxd-select-text');

    this.includePastEmployeesCheckbox = page
      .locator('.oxd-input-field-bottom-space', { hasText: 'Include Past Employees' })
      .locator('.oxd-checkbox-input');

    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.employeeAutocompleteNoResults = page
      .locator('.oxd-autocomplete-dropdown')
      .getByText('No Records Found', { exact: false });
    this.generateButton = page.getByRole('button', { name: 'Generate' });
    this.requiredNote = page.getByText('* Required', { exact: false });

    // Light-DOM record-count indicator that appears after a report is generated.
    this.recordsFound = page
      .locator('.oxd-report-table-header')
      .filter({ hasText: /Records Found/ });
    this.reportTable = page.locator('.oxd-report-table');
    this.validationErrors = page.locator('.oxd-input-field-error-message');
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoAdminReport(): Promise<void> {
    await this.goto(this.adminReportRoute);
    await this.heading.waitFor({ state: 'visible' });
  }

  async gotoMyReport(): Promise<void> {
    await this.goto(this.myReportRoute);
  }

  /** Navigate to the My report and return the auto-generated report payload. */
  async loadMyReport(): Promise<ReportData> {
    return this.captureReportData(() => this.goto(this.myReportRoute));
  }

  // ── Criteria ────────────────────────────────────────────────────────────────
  async selectGenerateFor(mode: 'leave_type' | 'employee'): Promise<void> {
    const radio =
      mode === 'employee' ? this.generateForEmployeeRadio : this.generateForLeaveTypeRadio;
    await radio.click();
  }

  async selectLeaveType(label: string): Promise<void> {
    await this.selectOxdOption(this.leaveTypeDropdown, label);
  }

  async selectSubUnit(name: string): Promise<void> {
    await this.selectOxdOption(this.subUnitDropdown, name);
  }

  /** Type into the Employee Name autocomplete WITHOUT selecting a hint (e.g. invalid input). */
  async typeEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
  }

  /** The currently selected Leave Period text (e.g. "2026-01-01 - 2026-12-31"). */
  async leavePeriodSelectedText(): Promise<string> {
    return (await this.leavePeriodDropdown.innerText()).trim();
  }

  /** Type into the Employee Name autocomplete and pick the exact hint. */
  async selectEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
    const option = this.page.getByRole('option', { name, exact: true });
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await option.click();
  }

  // ── Generate ──────────────────────────────────────────────────────────────--
  /** Click Generate and return the report's `/leave/reports/data` payload. */
  async generate(): Promise<ReportData> {
    return this.captureReportData(() => this.generateButton.click());
  }

  /**
   * Run `action`, capturing the `GET /leave/reports/data` response it triggers.
   * OXD's Generate click can occasionally no-op when fired right after a dropdown
   * re-render, so the trigger is retried (up to 3 attempts) if the request never fires.
   */
  private async captureReportData(action: () => Promise<void>): Promise<ReportData> {
    const isReportData = (r: { url(): string; request(): { method(): string } }) =>
      r.url().includes('/leave/reports/data') && r.request().method() === 'GET';

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const respPromise = this.page
        .waitForResponse(isReportData, { timeout: 10_000 })
        .catch(() => null);
      await action();
      const resp = await respPromise;
      if (resp) {
        const json = (await resp.json().catch(() => ({}))) as {
          meta?: { total?: number };
          data?: Array<Record<string, unknown>>;
        };
        return { status: resp.status(), total: json.meta?.total ?? 0, data: json.data ?? [] };
      }
    }
    throw new Error('Report data request never fired after 3 attempts');
  }

  /** Parse the integer out of the `(N) Records Found` indicator. */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFound.innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }
}
