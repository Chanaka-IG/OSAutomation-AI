import type { Locator, Page } from '@playwright/test';
import { maintenance } from '../../../test-data/maintenance/frontend/maintenance';
import { BasePage } from '../BasePage';

/**
 * Maintenance module — Administrator Access gate + Purge Employee Records + Access Records
 * (Download Personal Data). Selectors verified live via Playwright MCP against OrangeHRM OS 5.8.
 *
 * The module re-prompts for the admin password on every entry; once unlocked, the Purge/Access
 * topbar tabs switch client-side (no re-gate), so tab helpers click the tabs rather than navigate.
 */
export class MaintenancePage extends BasePage {
  // ── Administrator Access gate ─────────────────────────────────────────────
  readonly accessHeading: Locator;
  readonly gatePasswordInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly invalidCredentialsAlert: Locator;
  readonly gateFieldError: Locator;

  // ── Topbar tabs ───────────────────────────────────────────────────────────
  readonly accessTab: Locator;

  // ── Sub-page headings ──────────────────────────────────────────────────────
  readonly purgeHeading: Locator;
  readonly downloadHeading: Locator;
  readonly selectedEmployeeHeading: Locator;
  readonly credentialRequiredAlert: Locator;

  // ── Search form (shared by Purge + Access) ─────────────────────────────────
  readonly employeeInput: Locator;
  readonly searchButton: Locator;

  // ── Selected Employee panel ─────────────────────────────────────────────────
  readonly panelFirstName: Locator;
  readonly panelLastName: Locator;
  readonly purgeButton: Locator;
  readonly downloadButton: Locator;

  // ── Purge confirmation dialog ───────────────────────────────────────────────
  readonly purgeDialogTitle: Locator;
  readonly purgeDialogBody: Locator;
  readonly confirmPurgeButton: Locator;
  readonly cancelPurgeButton: Locator;
  searchFieldError: Locator;

  constructor(page: Page) {
    super(page);

    this.accessHeading = page.getByRole('heading', { name: maintenance.messages.accessHeading });
    this.gatePasswordInput = page.locator('input[type="password"]');
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.invalidCredentialsAlert = page.getByText(maintenance.messages.invalidCredentials, {
      exact: true,
    });
    this.gateFieldError = page.locator('.oxd-input-field-error-message');

    this.accessTab = page.getByRole('link', { name: 'Access Records' });

    this.purgeHeading = page.getByRole('heading', { name: maintenance.messages.purgeHeading });
    this.downloadHeading = page.getByRole('heading', { name: maintenance.messages.accessDataHeading });
    this.selectedEmployeeHeading = page.getByRole('heading', {
      name: maintenance.messages.selectedEmployee,
    });
    this.credentialRequiredAlert = page.getByText(maintenance.messages.credentialRequired, {
      exact: true,
    });

    this.employeeInput = page.getByPlaceholder('Type for hints...');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.searchFieldError = page.locator('.oxd-input-field-error-message');

    this.panelFirstName = page.getByPlaceholder('First Name');
    this.panelLastName = page.getByPlaceholder('Last Name');
    // Exact match so the panel's "Purge" button never collides with "Yes, Purge" in the dialog.
    this.purgeButton = page.getByRole('button', { name: 'Purge', exact: true });
    this.downloadButton = page.getByRole('button', { name: 'Download' });

    this.purgeDialogTitle = page.getByText(maintenance.purgeDialog.title, { exact: true });
    this.purgeDialogBody = page.getByText(maintenance.purgeDialog.body);
    this.confirmPurgeButton = page.getByRole('button', { name: maintenance.purgeDialog.confirm });
    this.cancelPurgeButton = page.getByRole('button', { name: maintenance.purgeDialog.cancel });
  }

  // ── Navigation / gate ──────────────────────────────────────────────────────
  /** Navigates to the module entry; lands on the Administrator Access gate. */
  async gotoModule(): Promise<void> {
    await this.goto(maintenance.routes.module);
    await this.accessHeading.waitFor({ state: 'visible' });
  }

  /** Fills the gate password and submits, without waiting for the outcome (for negative paths). */
  async submitGate(password: string): Promise<void> {
    if (password.length > 0) {
      await this.gatePasswordInput.fill(password);
    }
    await this.confirmButton.click();
  }

  /** Unlocks the module with the given password and waits for the Purge landing page. */
  async unlock(password: string): Promise<void> {
    await this.submitGate(password);
    await this.purgeHeading.waitFor({ state: 'visible' });
  }

  /** Full entry: navigate to the module and unlock it. */
  async openUnlocked(password: string): Promise<void> {
    await this.gotoModule();
    await this.unlock(password);
  }

  // ── Tabs (client-side; no re-gate) ──────────────────────────────────────────
  async goToAccessTab(): Promise<void> {
    await this.accessTab.click();
    await this.downloadHeading.waitFor({ state: 'visible' });
  }

  // ── Employee search (shared) ─────────────────────────────────────────────────
  /** Types into the autocomplete and waits for the employee-lookup response to land. */
  async typeEmployeeQuery(query: string): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (r) =>
        r.url().includes('/api/v2/pim/employees') && r.url().includes('includeEmployees='),
    );
    await this.employeeInput.click();
    await this.employeeInput.fill(query);
    await responsePromise;
  }

  /** All hint labels currently offered for `query` (e.g. "Jane Doe (Past Employee)"). */
  async hintLabels(query: string): Promise<string[]> {
    await this.typeEmployeeQuery(query);
    const options = this.page.getByRole('option');
    await options.first().waitFor({ state: 'visible', timeout: 15_000 });
    return (await options.allInnerTexts()).map((t) => t.trim());
  }

  /** Clicks the hint whose label contains `text`. */
  async selectHint(text: string): Promise<void> {
    const option = this.page.getByRole('option', { name: text });
    await option.first().waitFor({ state: 'visible', timeout: 15_000 });
    await option.first().click();
  }

  /** Type → pick the matching hint → Search. */
  async selectEmployeeAndSearch(query: string, hintText: string): Promise<void> {
    await this.typeEmployeeQuery(query);
    await this.selectHint(hintText);
    await this.searchButton.click();
    await this.selectedEmployeeHeading.waitFor({ state: 'visible' });
  }

  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }

  // ── Purge ─────────────────────────────────────────────────────────────────
  async openPurgeDialog(): Promise<void> {
    await this.purgeButton.click();
    await this.confirmPurgeButton.waitFor({ state: 'visible' });
  }

  async confirmPurge(): Promise<void> {
    await this.confirmPurgeButton.click();
  }

  async cancelPurge(): Promise<void> {
    await this.cancelPurgeButton.click();
  }
}
