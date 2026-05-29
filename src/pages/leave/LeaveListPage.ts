import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Leave → Leave List (Admin/Supervisor, `/leave/viewLeaveList`).
 * Search/filter the leave requests grid and read row status.
 */
export class LeaveListPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly statusDropdown: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page);

    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.statusDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Show Leave with Status/i })
      .locator('.oxd-select-text');
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async gotoLeaveList(): Promise<void> {
    await this.goto('/web/index.php/leave/viewLeaveList');
  }

  /** The list defaults to a "Pending Approval" status chip — remove it if present. */
  async clearStatusChip(label = 'Pending Approval'): Promise<void> {
    const chip = this.page.locator('.oxd-chip').filter({ hasText: new RegExp(label, 'i') });
    if ((await chip.count()) > 0) {
      await chip.locator('i.bi-x').click();
    }
  }

  async selectStatus(status: string): Promise<void> {
    await this.statusDropdown.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  async searchByEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
    const option = this.page.getByRole('option', { name: new RegExp(name, 'i') }).first();
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await option.click();
  }

  async search(): Promise<void> {
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  /** Table rows whose text contains the given status label. */
  rowsWithStatus(status: string): Locator {
    return this.page.locator('.oxd-table-card').filter({ hasText: new RegExp(status, 'i') });
  }
}
