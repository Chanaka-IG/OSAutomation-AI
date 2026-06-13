import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * PIM → Employee Details → Report-to tab (`/pim/viewReportToDetails/empNumber/{n}`).
 * Minimal page object — currently used to verify a reporting method propagates into the
 * "Add Supervisor" inline form's Reporting Method dropdown.
 * Selectors verified live via Playwright MCP (OrangeHRM OS 5.8, 2026-06-13).
 */
export class ReportToPage extends BasePage {
  readonly heading: Locator;
  /** The "Add" button scoped to the Assigned Supervisors action-header (not positional). */
  readonly addSupervisorButton: Locator;
  readonly reportingMethodDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Report to' });
    this.addSupervisorButton = page
      .locator('.orangehrm-action-header')
      .filter({ has: page.getByRole('heading', { name: 'Assigned Supervisors' }) })
      .getByRole('button', { name: 'Add' });
    this.reportingMethodDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Reporting Method' })
      .locator('.oxd-select-wrapper');
  }

  async gotoReportTo(empNumber: number): Promise<void> {
    await this.goto(`/web/index.php/pim/viewReportToDetails/empNumber/${empNumber}`);
    await this.addSupervisorButton.waitFor({ state: 'visible' });
  }

  /** Opens the Add Supervisor inline form and the Reporting Method dropdown. */
  async openAddSupervisorReportingMethod(): Promise<void> {
    await this.addSupervisorButton.click();
    await this.reportingMethodDropdown.waitFor({ state: 'visible' });
    await this.reportingMethodDropdown.click();
  }

  reportingMethodOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
