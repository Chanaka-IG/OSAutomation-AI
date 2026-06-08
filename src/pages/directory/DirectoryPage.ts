import type { Locator, Page } from '@playwright/test';
import { directory } from '../../../test-data/directory/frontend/directory';
import { BasePage } from '../BasePage';

/**
 * Directory module (`/directory/viewDirectory`): filter panel + employee card grid +
 * per-employee detail sidebar. Selectors verified live via Playwright MCP (2026-06-07).
 */
export class DirectoryPage extends BasePage {
  // ── Filter panel ────────────────────────────────────────────────────────────
  readonly pageHeading: Locator;
  readonly employeeNameInput: Locator;
  readonly employeeNameFieldError: Locator;
  readonly jobTitleDropdown: Locator;
  readonly locationDropdown: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  // ── Results grid ────────────────────────────────────────────────────────────
  /** "(N) Records Found" / "(1) Record Found" / "No Records Found" counter span. */
  readonly recordsFoundText: Locator;
  /**
   * All employee cards. The detail sidebar reuses the same card class, so grid-only
   * counts must run while the sidebar is closed (grid cards precede it in the DOM).
   */
  readonly directoryCards: Locator;
  readonly cardHeaders: Locator;

  // ── Detail sidebar (opens on card click) ────────────────────────────────────
  readonly sidebar: Locator;
  readonly sidebarEmployeeName: Locator;
  readonly sidebarBackArrow: Locator;

  constructor(page: Page) {
    super(page);

    // Topbar renders a level-6 "Directory" heading; the filter card heading is level 5.
    this.pageHeading = page.getByRole('heading', { name: 'Directory', level: 5 });
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.employeeNameFieldError = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('.oxd-label', { hasText: 'Employee Name' }) })
      .locator('.oxd-input-field-error-message');
    this.jobTitleDropdown = this.filterGroup('Job Title').locator('.oxd-select-text');
    this.locationDropdown = this.filterGroup('Location').locator('.oxd-select-text');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    // Scoped to the results header so the autocomplete's "No Records Found" hint can never collide
    this.recordsFoundText = page
      .locator('.orangehrm-horizontal-padding span')
      .filter({ hasText: /Records? Found/ });
    this.directoryCards = page.locator('.orangehrm-directory-card');
    this.cardHeaders = page.locator('.orangehrm-directory-card-header');

    this.sidebar = page.locator('.orangehrm-corporate-directory-sidebar');
    this.sidebarEmployeeName = this.sidebar.locator('.orangehrm-directory-card-header');
    this.sidebarBackArrow = this.sidebar.locator('.bi-arrow-right');
  }

  /** OXD filter group anchored by its label text. */
  private filterGroup(labelText: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('.oxd-label', { hasText: labelText }) });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoDirectory(): Promise<void> {
    await this.goto(directory.routes.view);
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Filter interactions ─────────────────────────────────────────────────────

  /** A hint row in the Employee Name autocomplete dropdown (also matches "No Records Found"). */
  autocompleteOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /** Types into the Employee Name autocomplete and clicks the hint with the given full name. */
  async pickEmployee(query: string, fullName: string): Promise<void> {
    await this.employeeNameInput.fill(query);
    await this.autocompleteOption(fullName).click();
  }

  async selectJobTitle(title: string): Promise<void> {
    await this.selectOxdOption(this.jobTitleDropdown, title);
  }

  async selectLocation(name: string): Promise<void> {
    await this.selectOxdOption(this.locationDropdown, name);
  }

  async runSearch(): Promise<void> {
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  // ── Grid / sidebar interactions ─────────────────────────────────────────────

  /**
   * Grid card for the given employee. `.first()` keeps the locator unambiguous when
   * the sidebar shows the same employee (grid cards precede the sidebar in the DOM).
   */
  cardByName(fullName: string): Locator {
    return this.directoryCards.filter({ hasText: fullName }).first();
  }

  async openEmployeeCard(fullName: string): Promise<void> {
    await this.cardByName(fullName).click();
  }

  /** "Work Email" / "Work Telephone" value in the open detail sidebar. */
  sidebarContactValue(label: 'Work Email' | 'Work Telephone'): Locator {
    return this.sidebar
      .locator('.orangehrm-directory-card-hover')
      .filter({ hasText: label })
      .locator('.oxd-text--toast-title');
  }

  /** Numeric value from the "(N) Records Found" counter; 0 for "No Records Found". */
  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
