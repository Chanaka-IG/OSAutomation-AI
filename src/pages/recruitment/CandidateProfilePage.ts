import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CandidateProfilePage extends BasePage {
  // ── Profile page ───────────────────────────────────────────────────────────
  readonly statusParagraph: Locator;
  readonly actionsContainer: Locator;

  // ── Action confirmation page (changeCandidateVacancyStatus) ────────────────
  readonly notesTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── Schedule Interview form fields ─────────────────────────────────────────
  readonly interviewTitleInput: Locator;
  readonly interviewerInput: Locator;
  readonly interviewDateInput: Locator;

  constructor(page: Page) {
    super(page);

    this.statusParagraph = page.locator('.orangehrm-recruitment-status p');
    this.actionsContainer = page.locator('.orangehrm-recruitment-actions');

    this.notesTextarea = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Notes' })
      .locator('textarea');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    this.interviewTitleInput = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Interview Title' })
      .locator('input');
    this.interviewerInput = page.getByPlaceholder('Type for hints...');
    this.interviewDateInput = page.getByPlaceholder('yyyy-mm-dd');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  async gotoProfile(candidateId: number): Promise<void> {
    await this.page.goto(
      `/web/index.php/recruitment/addCandidate/${candidateId}`,
      { waitUntil: 'domcontentloaded', timeout: 120_000 },
    );
    await this.statusParagraph.waitFor({ state: 'visible', timeout: 30_000 });
    // Wait for Vue to finish rendering action buttons after the status paragraph appears
    await this.page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
  }

  // ── Profile assertions ─────────────────────────────────────────────────────

  async getStatus(): Promise<string> {
    const text = await this.statusParagraph.textContent();
    return (text ?? '').replace('Status:', '').trim();
  }

  async getActionButtonLabels(): Promise<string[]> {
    const buttons = this.actionsContainer.getByRole('button');
    const count = await buttons.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(((await buttons.nth(i).textContent()) ?? '').trim());
    }
    return labels;
  }

  // ── Action page interactions ───────────────────────────────────────────────

  async clickAction(name: string): Promise<void> {
    await this.actionsContainer.getByRole('button', { name }).click();
    await this.page.waitForURL(/changeCandidateVacancyStatus/, { timeout: 30_000 });
    await this.saveButton.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async saveAction(): Promise<void> {
    await this.saveButton.click();
    await this.page.waitForURL(/addCandidate\/\d+/, { timeout: 30_000 });
    await this.statusParagraph.waitFor({ state: 'visible', timeout: 20_000 });
    await this.page
      .waitForLoadState('networkidle', { timeout: 5_000 })
      .catch(() => {});
  }

  async saveActionWithNote(note: string): Promise<void> {
    await this.notesTextarea.fill(note);
    await this.saveAction();
  }

  // ── Schedule Interview helpers ─────────────────────────────────────────────

  async fillInterviewForm(
    title: string,
    interviewerSearch: string,
    date: string,
  ): Promise<void> {
    await this.interviewTitleInput.fill(title);
    // pressSequentially fires per-keystroke events that Vue's OXD autocomplete requires
    await this.interviewerInput.pressSequentially(interviewerSearch, { delay: 80 });
    // Match the first option whose text contains the search term (regex, case-insensitive)
    await this.page.getByRole('option', { name: new RegExp(interviewerSearch, 'i') }).first().click();
    await this.interviewDateInput.fill(date);
    await this.interviewDateInput.press('Tab');
  }

  async scheduleInterviewAndSave(
    title: string,
    interviewerSearch: string,
    date: string,
  ): Promise<void> {
    await this.fillInterviewForm(title, interviewerSearch, date);
    await this.saveAction();
  }
}
