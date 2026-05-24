import type { Locator, Page } from '@playwright/test';
import { recruitment } from '../../../test-data/recruitment/frontend/recruitment';
import { BasePage } from '../BasePage';

export class VacanciesListPage extends BasePage {
  // ── Filter groups ──────────────────────────────────────────────────────────
  readonly jobTitleFilterGroup: Locator;
  readonly vacancyFilterGroup: Locator;
  readonly hiringManagerFilterGroup: Locator;
  readonly statusFilterGroup: Locator;

  // ── Buttons ────────────────────────────────────────────────────────────────
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly addButton: Locator;
  readonly deleteSelectedButton: Locator;

  // ── Table ──────────────────────────────────────────────────────────────────
  readonly tableRows: Locator;
  readonly recordCountText: Locator;
  readonly noRecordsText: Locator;
  readonly selectAllCheckbox: Locator;

  // ── Delete confirmation dialog ─────────────────────────────────────────────
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.jobTitleFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Job Title' });
    this.vacancyFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Vacancy' });
    this.hiringManagerFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Hiring Manager' });
    this.statusFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Status' });

    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.deleteSelectedButton = page.getByRole('button', { name: 'Delete Selected' });

    this.tableRows = page.locator('.oxd-table-card');
    this.recordCountText = page.locator('.oxd-text--span').filter({ hasText: /Records? Found/ });
    this.noRecordsText = page.locator('span.oxd-text--span').filter({ hasText: /^No Records Found$/ });
    this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-input');

    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoVacanciesList(): Promise<void> {
    await this.goto(recruitment.routes.vacancies);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Filter interactions ────────────────────────────────────────────────────

  private async selectFromGroup(group: Locator, optionText: string): Promise<void> {
    await group.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  async selectJobTitleFilter(title: string): Promise<void> {
    await this.selectFromGroup(this.jobTitleFilterGroup, title);
  }

  async selectVacancyFilter(name: string): Promise<void> {
    await this.selectFromGroup(this.vacancyFilterGroup, name);
  }

  async selectHiringManagerFilter(name: string): Promise<void> {
    await this.selectFromGroup(this.hiringManagerFilterGroup, name);
  }

  async selectStatusFilter(status: 'Active' | 'Closed'): Promise<void> {
    await this.selectFromGroup(this.statusFilterGroup, status);
  }

  async search(): Promise<void> {
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Row actions ────────────────────────────────────────────────────────────

  /** Opens the delete confirmation dialog for the row matching vacancyName. */
  async clickDeleteForRow(vacancyName: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: vacancyName });
    await row.locator('.oxd-icon-button:has(.bi-trash)').click();
  }

  /** Clicks the edit button for the row matching vacancyName. */
  async clickEditForRow(vacancyName: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: vacancyName });
    await row.locator('.oxd-icon-button:has(.bi-pencil-fill)').click();
  }

  /** Selects the row checkbox for bulk operations. */
  async selectRowCheckbox(vacancyName: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: vacancyName });
    await row.locator('.oxd-checkbox-input').click();
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /** Returns the numeric record count from "(N) Records Found" text. */
  async getRecordCount(): Promise<number> {
    const text = await this.recordCountText.textContent();
    const match = text?.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Returns the status cell (index 4) locator for a given row. */
  getStatusCell(row: Locator): Locator {
    return row.getByRole('cell').nth(4);
  }
}
