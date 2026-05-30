import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Leave → Leave List (Admin/Supervisor, `/leave/viewLeaveList`).
 *
 * Search/filter the leave-requests grid, read row status, and take row actions
 * (Approve / Reject / Cancel) on already-applied leave.
 *
 * Action controls (verified against OXD 5.8): each row's Actions cell holds inline
 * `Approve` and `Reject` buttons plus a "⋮" dropdown (`.oxd-table-dropdown`) whose menu
 * contains "Cancel Leave" / "Add Comment". All three actions apply immediately (no modal)
 * and surface a success toast.
 */
export class LeaveListPage extends BasePage {
  readonly pageHeading: Locator;
  readonly employeeNameInput: Locator;
  readonly statusDropdown: Locator;
  readonly searchButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly noRecordsFound: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'Leave List', exact: true });
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.statusDropdown = page
      .locator('.oxd-input-group')
      .filter({ hasText: /Show Leave with Status/i })
      .locator('.oxd-select-text');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.successToast = page.locator('.oxd-toast--success');
    this.errorToast = page.locator('.oxd-toast--error');
    this.noRecordsFound = page.getByText('No Records Found', { exact: false });
  }

  async gotoLeaveList(): Promise<void> {
    await this.goto('/web/index.php/leave/viewLeaveList');
    await this.pageHeading.waitFor({ state: 'visible' });
    // The list auto-loads with the default "Pending Approval" filter.
    await this.waitUntilTableLoaderDissapear();
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

  /** Convenience: scope the grid to one employee in a given status, then Search. */
  async filterBy(employeeName: string, statusLabel: string): Promise<void> {
    await this.clearStatusChip();
    await this.selectStatus(statusLabel);
    await this.searchByEmployee(employeeName);
    await this.search();
  }

  /** Table rows whose text contains the given text (e.g. a date or employee name). */
  rowsWithStatus(status: string): Locator {
    return this.page.locator('.oxd-table-card').filter({ hasText: new RegExp(status, 'i') });
  }

  /** A single grid row located by any contained text (typically the leave date). */
  rowByText(text: string): Locator {
    return this.page.locator('.oxd-table-card').filter({ hasText: text });
  }

  /** The inline "Approve" button within a specific row. */
  approveButton(rowText: string): Locator {
    return this.rowByText(rowText).getByRole('button', { name: 'Approve' });
  }

  /** The inline "Reject" button within a specific row. */
  rejectButton(rowText: string): Locator {
    return this.rowByText(rowText).getByRole('button', { name: 'Reject' });
  }

  /** The "Cancel Leave" item inside a row's open "⋮" dropdown menu. */
  cancelMenuItem(rowText: string): Locator {
    return this.rowByText(rowText).getByText('Cancel Leave', { exact: true });
  }

  async approveRow(rowText: string): Promise<void> {
    await this.approveButton(rowText).click();
    // Catch the (auto-dismissing) success toast BEFORE the grid reload, then settle.
    await this.successToast.waitFor({ state: 'visible' });
    await this.waitUntilTableLoaderDissapear();
  }

  async rejectRow(rowText: string): Promise<void> {
    await this.rejectButton(rowText).click();
    await this.successToast.waitFor({ state: 'visible' });
    await this.waitUntilTableLoaderDissapear();
  }

  /** Open the row "⋮" dropdown and click the "Cancel Leave" menu item. */
  async cancelRow(rowText: string): Promise<void> {
    await this.openRowMenu(rowText);
    await this.cancelMenuItem(rowText).click();
    await this.successToast.waitFor({ state: 'visible' });
    await this.waitUntilTableLoaderDissapear();
  }

  /** Open the row "⋮" dropdown (without selecting), e.g. to assert which actions exist. */
  async openRowMenu(rowText: string): Promise<void> {
    await this.rowByText(rowText).locator('.oxd-table-dropdown button.oxd-icon-button').click();
  }
}
