import type { Locator, Page } from '@playwright/test';
import { recruitment } from '../../../test-data/recruitment/frontend/recruitment';
import { BasePage } from '../BasePage';

export class CandidatesListPage extends BasePage {
  // ── Filter groups (OXD custom dropdowns) ───────────────────────────────────
  readonly jobTitleFilterGroup: Locator;
  readonly vacancyFilterGroup: Locator;
  readonly hiringManagerFilterGroup: Locator;
  readonly statusFilterGroup: Locator;
  readonly methodFilterGroup: Locator;

  // ── Filter text inputs ─────────────────────────────────────────────────────
  readonly candidateNameInput: Locator;
  readonly keywordsInput: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;

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
  /** All per-row action icons (view/delete) across the table — admin-only controls. */
  readonly rowActionIcons: Locator;

  // ── Delete confirmation dialog ─────────────────────────────────────────────
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.jobTitleFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Job Title' });
    this.vacancyFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Vacancy' }).first();
    this.hiringManagerFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Hiring Manager' });
    this.statusFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Status' });
    this.methodFilterGroup = page.locator('.oxd-input-group').filter({ hasText: 'Method of Application' });

    // Candidate Name autocomplete
    this.candidateNameInput = page.getByPlaceholder('Type for hints...');

    // Keywords text input (shares placeholder with Add Candidate form — safe here since different page)
    this.keywordsInput = page.getByPlaceholder('Enter comma seperated words...');

    // Date range inputs — placeholders are "From" / "To" on this page
    this.fromDateInput = page.getByPlaceholder('From');
    this.toDateInput = page.getByPlaceholder('To');

    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.deleteSelectedButton = page.getByRole('button', { name: 'Delete Selected' });

    this.tableRows = page.locator('.oxd-table-card');
    this.recordCountText = page.locator('.oxd-text--span').filter({ hasText: /Records? Found/ });
    this.noRecordsText = page.locator('span.oxd-text--span').filter({ hasText: /^No Records Found$/ });
    this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-input');
    this.rowActionIcons = page.locator('.oxd-table-card .oxd-icon-button');

    this.confirmDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
    this.cancelDeleteButton = page.getByRole('button', { name: 'No, Cancel' });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoCandidatesList(): Promise<void> {
    await this.goto(recruitment.routes.candidates);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Filter interactions ────────────────────────────────────────────────────

  private async selectFromGroup(group: Locator, optionText: string): Promise<void> {
    await group.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  async selectVacancyFilter(name: string): Promise<void> {
    await this.selectFromGroup(this.vacancyFilterGroup, name);
  }

  /** Opens the Vacancy filter dropdown without selecting (e.g. to inspect its options). */
  async openVacancyFilterDropdown(): Promise<void> {
    await this.vacancyFilterGroup.locator('.oxd-select-text').click();
  }

  /** Returns an option locator within an open OXD dropdown by its exact label. */
  filterOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /** Closes an open OXD dropdown. */
  async closeDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async selectStatusFilter(status: string): Promise<void> {
    await this.selectFromGroup(this.statusFilterGroup, status);
  }

  async selectMethodFilter(method: 'Manual' | 'Online'): Promise<void> {
    await this.selectFromGroup(this.methodFilterGroup, method);
  }

  async fillKeywordsFilter(keywords: string): Promise<void> {
    await this.keywordsInput.fill(keywords);
  }

  async fillDateRange(fromDate: string, toDate: string): Promise<void> {
    await this.fromDateInput.fill(fromDate);
    await this.fromDateInput.press('Tab');
    await this.toDateInput.fill(toDate);
    await this.toDateInput.press('Tab');
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

  async clickDeleteForRow(candidateName: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: candidateName });
    await row.locator('.oxd-icon-button:has(.bi-trash)').click();
  }

  // Candidates list uses bi-eye-fill (view/profile) not bi-pencil-fill
  async clickEditForRow(candidateName: string): Promise<void> {
    const row = this.tableRows.filter({ hasText: candidateName });
    await row.locator('.oxd-icon-button:has(.bi-eye-fill)').click();
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /** Returns the numeric record count from "(N) Records Found" text. */
  async getRecordCount(): Promise<number> {
    const text = await this.recordCountText.textContent();
    const match = text?.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Returns the Status cell locator for a given row.
   *  Columns: checkbox(0) | Vacancy(1) | Candidate(2) | Hiring Manager(3) | Date of Application(4) | Status(5) | Actions(6)
   */
  getStatusCell(row: Locator): Locator {
    return row.getByRole('cell').nth(5);
  }

  /** Returns the Vacancy cell locator for a given row. */
  getVacancyCell(row: Locator): Locator {
    return row.getByRole('cell').nth(1);
  }
}
