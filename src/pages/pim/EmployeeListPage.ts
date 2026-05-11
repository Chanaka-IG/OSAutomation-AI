import type { Locator, Page } from '@playwright/test';
import { pim } from '../../../test-data/frontend/pim';
import { BasePage } from '../BasePage';

/**
 * PIM → Employee List (`viewEmployeeList`). Selectors target OrangeHRM OS OXD UI;
 * fallbacks cover minor layout differences.
 */
export class EmployeeListPage extends BasePage {
  /** Primary filter: Employee Name (label text varies slightly by build). */
  readonly employeeNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly jobTitleDropdown: Locator;
  readonly employmentStatusDropdown: Locator;
  readonly subUnitDropdown: Locator;
  readonly supervisorNameInput: Locator;
  readonly searchButton: Locator;
  readonly addButton: Locator;
  readonly tableRows: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  constructor(page: Page) {
    super(page);
    /** OXD uses hint placeholder "Type for hints..." — scope by grid row label (not aria-labelledby). */
    const nameCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Employee Name', { exact: true }),
    });
    const idCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Employee Id', { exact: true }),
    });
    const jobTitleCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Job Title', { exact: true }),
    });
    const employmentStatusCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Employment Status', { exact: true }),
    });
    const subUnitCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Sub Unit', { exact: true }),
    });
    const supervisorCell = page.locator('.oxd-grid-item').filter({
      has: page.getByText('Supervisor Name', { exact: true }),
    });

    this.employeeNameInput = nameCell
      .locator('input')
      .first()
      .or(page.getByLabel(/employee name/i))
      .or(page.locator('.oxd-input-field').filter({ hasText: /employee name/i }).locator('input').first());

    this.employeeIdInput = idCell
      .locator('input')
      .first()
      .or(page.getByLabel(/employee id/i))
      .or(page.locator('.oxd-input-field').filter({ hasText: /employee id/i }).locator('input').first());

    this.jobTitleDropdown = jobTitleCell.locator('.oxd-select-wrapper');
    this.employmentStatusDropdown = employmentStatusCell.locator('.oxd-select-wrapper');
    this.subUnitDropdown = subUnitCell.locator('.oxd-select-wrapper');
    this.supervisorNameInput = supervisorCell.locator('input').first();

    this.searchButton = page.getByRole('button', { name: /search/i });
    this.addButton = page.getByRole('button', { name: /add/i }).first();
    this.tableRows = page
      .locator('.oxd-table-body .oxd-table-card')
      .or(page.locator('table.oxd-table tbody tr'))
      .or(page.locator('table tbody tr'));
    this.nextPageButton = page.getByRole('button', { name: /next/i }).first();
    this.previousPageButton = page.getByRole('button', { name: /previous/i }).first();
  }

  async gotoEmployeeList(): Promise<void> {
    await this.goto(pim.routes.employeeList);
    await this.waitForListReady();
  }

  /**
   * Waits until filters are usable and the grid shows at least one row or an empty-state message.
   * Prefer this over `waitForLoadState('networkidle')` or large fixed timeouts.
   */
  async waitForListReady(): Promise<void> {
    await this.searchButton.waitFor({ state: 'visible' });
    await this.employeeNameInput.waitFor({ state: 'visible' });
    const firstRowOrEmpty = this.tableRows
      .first()
      .or(this.page.getByText(/no records found|no records/i).first());
    await firstRowOrEmpty.waitFor({ state: 'visible' });
  }

  /** Sidebar: PIM → Employee List (validates TC-PIM-EL-002 navigation path). */
  async openViaSidebar(): Promise<void> {
    await this.page.getByRole('link', { name: /^PIM$/i }).click();
    await this.page.getByRole('link', { name: /employee list/i }).click();
    await this.waitForListReady();
  }

  async runSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async clearEmployeeNameFilter(): Promise<void> {
    await this.employeeNameInput.clear();
  }

  async clearEmployeeIdFilter(): Promise<void> {
    await this.employeeIdInput.clear();
  }

  /**
   * Selects an option from an OXD select dropdown (Job Title, Employment Status, Sub Unit).
   * Clicks the wrapper to open the panel, then clicks the matching option span.
   */
  private async selectOxdOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    await this.page
      .locator('.oxd-select-dropdown')
      .getByText(optionText, { exact: true })
      .click();
  }

  async selectJobTitle(title: string): Promise<void> {
    await this.selectOxdOption(this.jobTitleDropdown, title);
  }

  async selectEmploymentStatus(status: string): Promise<void> {
    await this.selectOxdOption(this.employmentStatusDropdown, status);
  }

  async selectSubUnit(subUnit: string): Promise<void> {
    await this.selectOxdOption(this.subUnitDropdown, subUnit);
  }

  /**
   * Fills the Supervisor Name autocomplete and selects the first suggestion containing `name`.
   * Types the search term, waits for the dropdown, then clicks the matching entry.
   */
  async fillSupervisorName(name: string): Promise<void> {
    await this.supervisorNameInput.fill(name);
    await this.page
      .locator('.oxd-autocomplete-dropdown')
      .getByText(name)
      .first()
      .click();
  }
}
