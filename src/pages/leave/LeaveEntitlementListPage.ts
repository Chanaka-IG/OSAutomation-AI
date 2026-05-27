import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class LeaveEntitlementListPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/viewLeaveEntitlements', { waitUntil: 'domcontentloaded' });
  }

  async searchByEmployee(name: string): Promise<void> {
    await this.employeeNameInput.click();
    await this.employeeNameInput.pressSequentially(name);
    const option = this.page.getByRole('option', { name, exact: true });
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await option.click();
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  getEntitlementRow(leaveType: string): Locator {
    return this.page.locator('.oxd-table-card').filter({ hasText: leaveType });
  }

  // Column order: checkbox(0) | Leave Type(1) | Entitlement Type(2) | Valid From(3) | Valid To(4) | Days(5) | Actions(6)
  getDaysCell(leaveType: string): Locator {
    return this.getEntitlementRow(leaveType).locator('.oxd-table-cell').nth(5);
  }
}
