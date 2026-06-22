import type { Locator, Page } from '@playwright/test';
import { employeeClaims } from '../../../test-data/claim/frontend/employeeClaims';
import { BasePage } from '../BasePage';

/**
 * Admin Claim → Employee Claims: the searchable list of ALL employee claim requests
 * (`/claim/viewAssignClaim`, page heading "Employee Claims").
 *
 * NOTE (verified live, OS 5.8): the filter panel is COLLAPSED by default — its fields
 * are not in the DOM until the chevron beside the heading is clicked. Always call
 * `gotoList()` (which expands the panel) before interacting with any filter.
 */
export class EmployeeClaimsPage extends BasePage {
  // ── Header / filter panel ─────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly filterToggle: Locator;
  readonly employeeNameInput: Locator;
  readonly referenceIdInput: Locator;
  readonly eventNameDropdown: Locator;
  readonly statusDropdown: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly includeDropdown: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  // ── Results ────────────────────────────────────────────────────────────────
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly claimRows: Locator;

  constructor(page: Page) {
    super(page);

    this.listHeading = page.getByRole('heading', { name: employeeClaims.headings.list });
    // The caret button that collapses/expands the filter panel (sole button in the filter header).
    this.filterToggle = page.locator('.oxd-table-filter-header .oxd-icon-button');

    this.employeeNameInput = this.filterGroup('Employee Name').locator('input');
    this.referenceIdInput = this.filterGroup('Reference Id').locator('input');
    this.eventNameDropdown = this.filterGroup('Event Name').locator('.oxd-select-text');
    this.statusDropdown = this.filterGroup('Status').locator('.oxd-select-text');
    this.fromDateInput = this.filterGroup('From Date').locator('input.oxd-input');
    this.toDateInput = this.filterGroup('To Date').locator('input.oxd-input');
    this.includeDropdown = this.filterGroup('Include').locator('.oxd-select-text');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    // Scope to the leaf record-count span. Plain getByText also matches the "No Records Found"
    // toast (<p>) and ancestor <div>s — restricting to span.oxd-text--span keeps it unambiguous.
    this.recordsFoundText = page
      .locator('span.oxd-text--span')
      .filter({ hasText: /\(\s*\d+\s*\)\s*Records Found/ });
    this.noRecordsText = page
      .locator('span.oxd-text--span')
      .filter({ hasText: employeeClaims.messages.noRecords });
    this.claimRows = page.locator('.oxd-table-card');
  }

  /** An OXD input-group scoped by its exact label text. */
  private filterGroup(label: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(label, { exact: true }) });
  }

  /**
   * Runs `action` and waits for the list endpoint (`GET …/claim/employees/requests`) to respond,
   * then for the table loader to clear. Anchoring on the actual response — rather than only the
   * 2s table-loader heuristic — keeps search/reset deterministic on a slow environment.
   */
  private async runAndAwaitList(action: () => Promise<void>): Promise<void> {
    const response = this.page
      .waitForResponse(
        (r) => /\/claim\/employees\/requests/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 30_000 },
      )
      .catch(() => undefined);
    await action();
    await response;
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoList(): Promise<void> {
    await this.runAndAwaitList(() => this.goto(employeeClaims.routes.list));
    await this.expandFilters();
  }

  /** The filter panel is collapsed by default; expand it if the Search button is hidden. */
  async expandFilters(): Promise<void> {
    if (await this.searchButton.isVisible()) return;
    await this.filterToggle.click();
    await this.searchButton.waitFor({ state: 'visible' });
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  employeeOption(label: string): Locator {
    return this.page.getByRole('option', { name: label });
  }

  async selectEmployee(query: string, optionLabel: string): Promise<void> {
    await this.employeeNameInput.fill(query);
    await this.employeeOption(optionLabel).click();
  }

  async selectEventName(name: string): Promise<void> {
    await this.selectOxdOption(this.eventNameDropdown, name);
  }

  async selectStatus(name: string): Promise<void> {
    await this.selectOxdOption(this.statusDropdown, name);
  }

  async getEventNameOptions(): Promise<string[]> {
    return this.getOxdDropdownOptions(this.eventNameDropdown);
  }

  async includeValue(): Promise<string> {
    return (await this.includeDropdown.innerText()).trim();
  }

  async setFromDate(date: string): Promise<void> {
    await this.setDate(this.fromDateInput, date);
  }

  async setToDate(date: string): Promise<void> {
    await this.setDate(this.toDateInput, date);
  }

  private async setDate(input: Locator, date: string): Promise<void> {
    await input.fill(date);
    // Filling a date opens the OXD calendar overlay; Escape closes it so it can't intercept clicks.
    await this.page.keyboard.press('Escape');
  }

  /** Sets a From/To window in one call. */
  async setDateRange(from: string, to: string): Promise<void> {
    await this.setFromDate(from);
    await this.setToDate(to);
  }

  async clickSearch(): Promise<void> {
    await this.runAndAwaitList(() => this.searchButton.click());
  }

  async clickReset(): Promise<void> {
    await this.runAndAwaitList(() => this.resetButton.click());
  }

  async searchByReference(referenceId: string): Promise<void> {
    await this.referenceIdInput.fill(referenceId);
    await this.clickSearch();
  }

  // ── Results helpers ───────────────────────────────────────────────────────────
  claimRowByReference(referenceId: string): Locator {
    return this.claimRows.filter({ hasText: referenceId });
  }

  /** Parses the integer in the "(N) Records Found" header (0 if the header never appears). */
  async recordsFoundCount(): Promise<number> {
    try {
      await this.recordsFoundText.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      return 0;
    }
    const text = await this.recordsFoundText.innerText();
    const match = text.match(/\(\s*(\d+)\s*\)/);
    return match ? Number(match[1]) : 0;
  }

  /** Reference Id values (15-digit numbers) for every visible row, top-to-bottom. */
  async visibleReferenceIds(): Promise<string[]> {
    const count = await this.claimRows.count();
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await this.claimRows.nth(i).innerText();
      const match = text.match(/\d{12,}/);
      if (match) ids.push(match[0]);
    }
    return ids;
  }

  /** Opens the detail page for the first listed claim. */
  async openFirstClaimDetails(): Promise<void> {
    await this.claimRows.first().getByRole('button', { name: 'View Details' }).click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** The Claim module top-menu navigation (used to assert role-based menu visibility). */
  get topbarMenu(): Locator {
    return this.page.locator('.oxd-topbar-body-nav');
  }
}
