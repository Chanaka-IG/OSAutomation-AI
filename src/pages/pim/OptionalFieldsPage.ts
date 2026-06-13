import type { Locator, Page } from '@playwright/test';
import { optionalFields } from '../../../test-data/pim/frontend/optionalFields';
import type { OptionalFieldKey } from '../../../test-data/pim/frontend/optionalFields';
import { BasePage } from '../BasePage';

/**
 * PIM → Configuration → Optional Fields (`/pim/configurePim`).
 * Each field is an OXD **switch** — a hidden `input[type=checkbox]` behind a
 * `span.oxd-switch-input` that intercepts clicks, inside `.orangehrm-optional-field-row`.
 * Toggle by clicking the span; read state from the underlying checkbox.
 * Selectors verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export class OptionalFieldsPage extends BasePage {
  readonly title: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    // The page title is a <p>; anchor the exact text so it can't clash with the nav menu
    // item or a future descriptive paragraph mentioning "Optional Fields".
    this.title = page.locator('p').filter({ hasText: /^Optional Fields$/ });
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async gotoConfig(): Promise<void> {
    await this.goto(optionalFields.routes.config);
    await this.saveButton.waitFor({ state: 'visible' });
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────────

  /** The row container for a field, scoped by its unique caption substring. */
  row(field: OptionalFieldKey): Locator {
    return this.page
      .locator('.orangehrm-optional-field-row')
      .filter({ hasText: optionalFields.fields[field].rowCaption });
  }

  /** The clickable switch control for a field (the input itself is pointer-intercepted). */
  switchControl(field: OptionalFieldKey): Locator {
    return this.row(field).locator('.oxd-switch-input');
  }

  /** The underlying checkbox, used to read on/off state. */
  checkbox(field: OptionalFieldKey): Locator {
    return this.row(field).locator('input[type="checkbox"]');
  }

  async isOn(field: OptionalFieldKey): Promise<boolean> {
    return this.checkbox(field).isChecked();
  }

  /** Sets a single toggle to the desired state (no-op if already there). Does not save. */
  async setToggle(field: OptionalFieldKey, on: boolean): Promise<void> {
    if ((await this.isOn(field)) !== on) {
      await this.switchControl(field).click();
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Clicks Save and verifies the success toast via the shared BasePage check
   * (asserts the Success header + "Successfully Saved" message).
   */
  async saveAndVerifyToast(): Promise<void> {
    await this.saveButton.click();
    await this.verifySuccessToastForSave();
  }
}
