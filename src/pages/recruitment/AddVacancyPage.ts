import type { Locator, Page } from '@playwright/test';
import { recruitment } from '../../../test-data/recruitment/frontend/recruitment';
import { BasePage } from '../BasePage';

export class AddVacancyPage extends BasePage {
  // ── Form inputs ────────────────────────────────────────────────────────────
  readonly vacancyNameInput: Locator;
  readonly jobTitleGroup: Locator;
  readonly descriptionInput: Locator;
  readonly hiringManagerInput: Locator;
  readonly numPositionsInput: Locator;
  readonly activeToggle: Locator;
  readonly publishToggle: Locator;

  // ── Buttons ────────────────────────────────────────────────────────────────
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addButton: Locator;

  // ── Feedback & validation ──────────────────────────────────────────────────
  readonly allValidationErrors: Locator;

  // ── List page elements ─────────────────────────────────────────────────────
  readonly tableRows: Locator;
  readonly noRecordsText: Locator;

  constructor(page: Page) {
    super(page);

    // Form inputs — OXD input groups filtered by label text
    this.vacancyNameInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Vacancy Name' })
      .locator('input.oxd-input');

    this.jobTitleGroup = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Job Title' });

    this.descriptionInput = page.getByPlaceholder('Type description here');

    this.hiringManagerInput = page.getByPlaceholder('Type for hints...');

    this.numPositionsInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Number of Positions' })
      .locator('input.oxd-input');

    // Active / Publish toggles (OXD switch inputs — pre-checked by default)
    this.activeToggle = page.locator('.oxd-switch-input').nth(0);
    this.publishToggle = page.locator('.oxd-switch-input').nth(1);

    // Buttons
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.addButton = page.getByRole('button', { name: 'Add' });

    // Validation
    this.allValidationErrors = page.locator('.oxd-input-field-error-message');

    // List
    this.tableRows = page.locator('.oxd-table-card');
    this.noRecordsText = page.locator('.oxd-text').filter({ hasText: 'No Records Found' });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoVacanciesList(): Promise<void> {
    await this.goto(recruitment.routes.vacancies);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddVacancy(): Promise<void> {
    await this.goto(recruitment.routes.addVacancy);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form interactions ──────────────────────────────────────────────────────

  async selectJobTitle(title: string): Promise<void> {
    await this.jobTitleGroup.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: title, exact: true }).click();
  }

  async selectHiringManager(query: string, fullName: string): Promise<void> {
    await this.hiringManagerInput.fill(query);
    await this.page.getByRole('option', { name: fullName, exact: true }).click();
  }

  /**
   * Fills the Add Vacancy form. numPositions defaults to '1' when not provided.
   */
  async fillForm(opts: {
    name: string;
    jobTitle: string;
    hiringManagerQuery: string;
    hiringManagerName: string;
    numPositions?: string;
    description?: string;
  }): Promise<void> {
    await this.vacancyNameInput.fill(opts.name);
    await this.selectJobTitle(opts.jobTitle);
    if (opts.description) await this.descriptionInput.fill(opts.description);
    await this.selectHiringManager(opts.hiringManagerQuery, opts.hiringManagerName);
    if (opts.numPositions) await this.numPositionsInput.fill(opts.numPositions);
  }

  /**
   * Clicks Save and waits for the redirect to the Edit Vacancy URL (/addJobVacancy/{id}).
   * OrangeHRM does not show a toast for vacancy saves — success is confirmed by the URL change.
   */
  async saveVacancy(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForURL(/addJobVacancy\/\d+/, { timeout: 15_000 });
  }

  /**
   * Returns the vacancy name visible in the first matching table row.
   * Waits for the table to finish loading first.
   */
  async findVacancyInList(name: string): Promise<Locator> {
    await this.waitUntilTableLoaderDissapear();
    return this.tableRows.filter({ hasText: name });
  }

  /** Extracts the vacancy ID from the edit-page URL (/addJobVacancy/{id}). */
  getCreatedVacancyId(): number | null {
    const match = this.page.url().match(/addJobVacancy\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }
}
