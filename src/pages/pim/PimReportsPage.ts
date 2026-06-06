import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class PimReportsPage extends BasePage {
  // ── List page ──────────────────────────────────────────────────────────────
  readonly pageHeading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly addButton: Locator;
  readonly tableRows: Locator;
  readonly recordCountBadge: Locator;

  // ── Add / Edit form ────────────────────────────────────────────────────────
  readonly reportNameInput: Locator;
  readonly selectionCriteriaDropdown: Locator;
  readonly selectionCriteriaAddButton: Locator;
  readonly includeDropdown: Locator;
  readonly displayFieldGroupDropdown: Locator;
  readonly displayFieldDropdown: Locator;
  readonly displayFieldAddButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    super(page);

    // List
    this.pageHeading = page.getByRole('heading', { name: 'Employee Reports' });
    this.searchInput = page.getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.addButton = page.locator('.orangehrm-header-container').getByRole('button', { name: 'Add' });
    this.tableRows = page.locator('.oxd-table-card');
    this.recordCountBadge = page.locator('span').filter({ hasText: /Record[s]? Found/ });

    // Form — Report Name
    this.reportNameInput = page.getByPlaceholder('Type here ...');

    // Form — Selection Criteria section (scoped to the section div containing h6 "Selection Criteria")
    const selCriteriaSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Selection Criteria', level: 6 }),
    }).last();
    this.selectionCriteriaDropdown = selCriteriaSection.locator('.oxd-select-text').first();
    this.selectionCriteriaAddButton = selCriteriaSection.getByRole('button').first();
    this.includeDropdown = page.locator('.oxd-input-group').filter({ hasText: /^Include/ }).locator('.oxd-select-text');

    // Form — Display Fields section (scoped to the section div containing h6 "Display Fields")
    const dispFieldsSection = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Display Fields', level: 6 }),
    }).last();
    this.displayFieldGroupDropdown = dispFieldsSection.locator('.oxd-select-text').first();
    this.displayFieldDropdown = dispFieldsSection.locator('.oxd-select-text').nth(1);
    this.displayFieldAddButton = dispFieldsSection.getByRole('button').first();

    // Form — Footer buttons
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.validationErrors = page.locator('.oxd-input-field-error-message');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoReportsList(): Promise<void> {
    await this.goto('/web/index.php/pim/viewDefinedPredefinedReports');
    await this.waitUntilTableLoaderDissapear();
    await this.pageHeading.waitFor({ state: 'visible' });
  }

  async gotoAddReport(): Promise<void> {
    await this.goto('/web/index.php/pim/definePredefinedReport');
    await this.reportNameInput.waitFor({ state: 'visible' });
  }

  // ── List interactions ──────────────────────────────────────────────────────

  async searchByName(name: string): Promise<void> {
    await this.searchInput.click();
    await this.searchInput.pressSequentially(name);
    // The search input is an autocomplete — commit the value by selecting the matching option
    const option = this.page.getByRole('option', { name, exact: true });
    try {
      await option.waitFor({ state: 'visible', timeout: 8_000 });
      await option.click();
    } catch {
      // No matching autocomplete suggestion; proceed to submit with typed text
    }
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async resetSearch(): Promise<void> {
    await this.resetButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async getRecordCount(): Promise<number> {
    const text = await this.recordCountBadge.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  getRowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  private getActionButton(rowName: string, iconClass: string): Locator {
    return this.getRowByName(rowName).locator(`.oxd-icon-button:has(.${iconClass})`);
  }

  async clickViewIcon(rowName: string): Promise<void> {
    await this.getActionButton(rowName, 'bi-file-text-fill').click();
  }

  async clickEditIcon(rowName: string): Promise<void> {
    await this.getActionButton(rowName, 'bi-pencil-fill').click();
  }

  async clickDeleteIcon(rowName: string): Promise<void> {
    await this.getActionButton(rowName, 'bi-trash').click();
  }

  async deleteReportByName(name: string): Promise<void> {
    await this.clickDeleteIcon(name);
    const confirmBtn = this.page.getByRole('button', { name: /yes|confirm|delete/i });
    if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Form interactions ──────────────────────────────────────────────────────

  async fillReportName(name: string): Promise<void> {
    await this.reportNameInput.fill(name);
  }

  async editReportName(name: string): Promise<void> {
    await this.reportNameInput.click({ clickCount: 3 });
    await this.reportNameInput.pressSequentially(name);
  }

  async selectCriteria(option: string): Promise<void> {
    await this.selectOxdOption(this.selectionCriteriaDropdown, option);
  }

  async addCriteria(): Promise<void> {
    await this.selectionCriteriaAddButton.click();
  }

  async selectAddedCriteriaValue(value: string): Promise<void> {
    const criteriaSection = this.page.locator('div').filter({
      has: this.page.getByRole('heading', { name: 'Selection Criteria', level: 6 }),
    }).last();
    await this.selectOxdOption(criteriaSection.locator('.oxd-select-text').last(), value);
  }

  async selectInclude(option: string): Promise<void> {
    await this.selectOxdOption(this.includeDropdown, option);
  }

  async selectDisplayFieldGroup(group: string): Promise<void> {
    await this.selectOxdOption(this.displayFieldGroupDropdown, group);
  }

  async selectDisplayField(field: string): Promise<void> {
    await this.selectOxdOption(this.displayFieldDropdown, field);
  }

  async addDisplayField(): Promise<void> {
    await this.displayFieldAddButton.click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async addMinimalDisplayField(): Promise<void> {
    await this.selectDisplayFieldGroup('Personal');
    await this.selectDisplayField('Employee Id');
    await this.addDisplayField();
  }

  getAddedCriteriaRow(criteriaName: string): Locator {
    return this.page.locator('p.orangehrm-report-criteria-name').filter({ hasText: criteriaName });
  }

  getDisplayFieldChip(fieldName: string): Locator {
    return this.page.locator('.oxd-multiselect-chips-selected').filter({ hasText: fieldName });
  }

  async removeDisplayField(fieldName: string): Promise<void> {
    await this.getDisplayFieldChip(fieldName).locator('.bi-x').click();
  }

  async saveAndWaitForList(): Promise<void> {
    await this.saveButton.click();
    await this.waitUntilFormLoaderDissapear();
    await this.gotoReportsList();
  }
}
