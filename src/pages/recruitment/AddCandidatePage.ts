import type { Locator, Page } from '@playwright/test';
import { recruitment } from '../../../test-data/recruitment/frontend/recruitment';
import { BasePage } from '../BasePage';

export class AddCandidatePage extends BasePage {
  // ── Form inputs ────────────────────────────────────────────────────────────
  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly vacancyGroup: Locator;
  readonly emailInput: Locator;
  readonly contactNumberInput: Locator;
  readonly keywordsInput: Locator;
  readonly dateOfApplicationInput: Locator;
  readonly notesInput: Locator;
  readonly consentCheckbox: Locator;

  // ── Buttons ────────────────────────────────────────────────────────────────
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addButton: Locator;

  // ── Feedback & validation ──────────────────────────────────────────────────
  readonly allValidationErrors: Locator;

  // ── List & profile ─────────────────────────────────────────────────────────
  readonly tableRows: Locator;
  readonly statusParagraph: Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' });
    this.middleNameInput = page.getByRole('textbox', { name: 'Middle Name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' });

    this.vacancyGroup = page.locator('.oxd-input-group').filter({ hasText: 'Vacancy' });

    // Email and Contact Number both have placeholder "Type here"; scope by label
    this.emailInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Email' })
      .locator('input.oxd-input');

    this.contactNumberInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Contact Number' })
      .locator('input.oxd-input');

    this.keywordsInput = page.getByPlaceholder('Enter comma seperated words...');

    // Date input — pre-filled with today; use placeholder to target it
    this.dateOfApplicationInput = page.getByPlaceholder('yyyy-mm-dd');

    // Notes textarea — scope by label to avoid collision with other textareas
    this.notesInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Notes' })
      .locator('textarea.oxd-textarea');

    // OXD checkbox: clicking the raw <input> fails because the icon intercepts;
    // click the active-state span wrapper instead
    this.consentCheckbox = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Consent to keep data' })
      .locator('.oxd-checkbox-input--active');

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.addButton = page.getByRole('button', { name: 'Add' });

    this.allValidationErrors = page.locator('.oxd-input-field-error-message');
    this.tableRows = page.locator('.oxd-table-card');

    // Profile page: "Status: Application Initiated"
    this.statusParagraph = page.locator('p').filter({ hasText: 'Status:' });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoAddCandidate(): Promise<void> {
    await this.goto(recruitment.routes.addCandidate);
    await this.waitUntilFormLoaderDissapear();
  }

  async gotoCandidatesList(): Promise<void> {
    await this.goto(recruitment.routes.candidates);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Form interactions ──────────────────────────────────────────────────────

  async selectVacancy(vacancyName: string): Promise<void> {
    await this.vacancyGroup.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: vacancyName, exact: true }).click();
  }

  async tickConsent(): Promise<void> {
    await this.consentCheckbox.click();
  }

  async fillForm(opts: {
    firstName: string;
    lastName: string;
    email: string;
    vacancyName: string;
    middleName?: string;
    contactNumber?: string;
    keywords?: string;
    notes?: string;
    dateOfApplication?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(opts.firstName);
    if (opts.middleName) await this.middleNameInput.fill(opts.middleName);
    await this.lastNameInput.fill(opts.lastName);
    await this.selectVacancy(opts.vacancyName);
    await this.emailInput.fill(opts.email);
    if (opts.contactNumber) await this.contactNumberInput.fill(opts.contactNumber);
    if (opts.keywords) await this.keywordsInput.fill(opts.keywords);
    if (opts.notes) await this.notesInput.fill(opts.notes);
    if (opts.dateOfApplication) {
      await this.dateOfApplicationInput.fill(opts.dateOfApplication);
      await this.dateOfApplicationInput.press('Tab');
    }
  }

  /** Clicks Save and waits for redirect to the candidate profile URL (/addCandidate/{id}).
   *  Also waits for the profile "Application Stage" section to appear so the server-side
   *  API calls that populate it complete before any subsequent navigation.
   */
  async saveCandidate(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForURL(/addCandidate\/\d+/, { timeout: 15_000 });
    await this.statusParagraph.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  }

  /** Extracts the candidate ID from the profile URL (/addCandidate/{id}). */
  getCreatedCandidateId(): number | null {
    const match = this.page.url().match(/addCandidate\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /** Finds a candidate row in the list by the displayed full name. */
  async findCandidateInList(fullName: string): Promise<Locator> {
    await this.waitUntilTableLoaderDissapear();
    return this.tableRows.filter({ hasText: fullName });
  }
}
