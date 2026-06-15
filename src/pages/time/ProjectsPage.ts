import type { Locator, Page } from '@playwright/test';
import { projects } from '../../../test-data/time/frontend/projects';
import { BasePage } from '../BasePage';

/**
 * Time → Project Info → Projects: list (`time/viewProjects`) + add/edit form (`time/saveProject[/{id}]`).
 * A project requires a Customer (autocomplete, with an inline Add Customer modal). The list rows carry
 * delete (`bi-trash`) and edit (`bi-pencil-fill`) icon buttons, and a collapsible search filter.
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-14).
 */
export class ProjectsPage extends BasePage {
  // ── List ──────────────────────────────────────────────────────────────────
  readonly listHeading: Locator;
  readonly addButton: Locator;
  readonly recordsFoundText: Locator;
  readonly noRecordsText: Locator;
  readonly tableRows: Locator;
  readonly filterToggle: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;

  // ── Add / Edit form ─────────────────────────────────────────────────────────
  readonly addFormHeading: Locator;
  readonly nameGroup: Locator;
  readonly nameInput: Locator;
  readonly nameError: Locator;
  readonly customerGroup: Locator;
  readonly customerInput: Locator;
  readonly customerError: Locator;
  readonly addCustomerButton: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly activitiesHeading: Locator;

  // ── Add Customer modal ────────────────────────────────────────────────────
  readonly customerModal: Locator;

  // ── Delete dialog ───────────────────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;

  readonly credentialRequired: Locator;

  constructor(page: Page) {
    super(page);

    this.listHeading = page.getByRole('heading', { name: projects.headings.list, exact: true });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.recordsFoundText = page.locator('span').filter({ hasText: /\(\d+\)\s*Record/ });
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });
    this.tableRows = page.locator('.oxd-table-card');
    this.filterToggle = page
      .locator('.oxd-icon-button')
      .filter({ has: page.locator('.bi-caret-up-fill, .bi-caret-down-fill') });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });

    this.addFormHeading = page.getByRole('heading', { name: projects.headings.add });
    this.nameGroup = page.locator('.oxd-input-group').filter({ has: page.getByText('Name', { exact: true }) });
    this.nameInput = this.nameGroup.locator('input.oxd-input');
    this.nameError = this.nameGroup.locator('.oxd-input-field-error-message');
    this.customerGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Customer Name', { exact: true }) });
    this.customerInput = this.customerGroup.getByPlaceholder('Type for hints...');
    this.customerError = this.customerGroup.locator('.oxd-input-field-error-message');
    this.addCustomerButton = page.getByRole('button', { name: 'Add Customer' });
    this.descriptionInput = page.getByPlaceholder('Type description here');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.activitiesHeading = page.getByRole('heading', { name: projects.headings.activities });

    this.customerModal = page.locator('.oxd-dialog-container, .orangehrm-dialog-modal').first();

    this.deleteDialog = page.locator('.orangehrm-dialog-popup');
    this.confirmDeleteButton = page.getByRole('button', { name: projects.deleteDialog.confirm });

    this.credentialRequired = page.getByText(projects.messages.credentialRequired, { exact: true });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  async gotoList(): Promise<void> {
    await this.goto(projects.routes.list);
    await this.waitUntilTableLoaderDissapear();
  }

  async gotoAddForm(): Promise<void> {
    await this.goto(projects.routes.add);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Selects an existing customer via the autocomplete. */
  async selectCustomer(name: string): Promise<void> {
    await this.customerInput.fill(name);
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  /** Creates a customer through the inline Add Customer modal (auto-selected on save). */
  async addCustomerInline(name: string): Promise<void> {
    await this.addCustomerButton.click();
    const modal = this.page.getByRole('dialog');
    await modal.locator('input.oxd-input').first().fill(name);
    await modal.getByRole('button', { name: 'Save' }).click();
    await this.waitUntilFormLoaderDissapear();
  }

  /** Clicks Save and verifies the success toast (BasePage check). */
  async saveAndVerifyToast(): Promise<void> {
    await this.saveButton.click();
    await this.verifySuccessToastForSave();
  }

  // ── List interactions ─────────────────────────────────────────────────────
  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async openSearchFilter(): Promise<void> {
    if (!(await this.searchButton.isVisible())) {
      await this.filterToggle.click();
      await this.searchButton.waitFor({ state: 'visible' });
    }
  }

  /** The "Project" filter autocomplete (distinct from "Customer Name"/"Project Admin"). */
  private get projectFilterInput(): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText('Project', { exact: true }) })
      .getByPlaceholder('Type for hints...');
  }

  /** Searches the list by project name via the filter autocomplete. */
  async searchByProject(name: string): Promise<void> {
    await this.openSearchFilter();
    await this.projectFilterInput.fill(name);
    await this.page.getByRole('option', { name, exact: true }).click();
    await this.searchButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async recordsFoundCount(): Promise<number> {
    const text = (await this.recordsFoundText.first().innerText()).trim();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : NaN;
  }

  async deleteProjectByName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-trash)').click();
    await this.deleteDialog.waitFor({ state: 'visible' });
    await this.confirmDeleteButton.click();
    await this.waitUntilTableLoaderDissapear();
  }

  async editProjectByName(name: string): Promise<void> {
    await this.rowByName(name).locator('.oxd-icon-button:has(.bi-pencil-fill)').click();
    await this.waitUntilFormLoaderDissapear();
  }
}
