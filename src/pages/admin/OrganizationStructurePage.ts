import type { Locator, Page } from '@playwright/test';
import { adminOrganizationStructure } from '../../../test-data/admin/frontend/organizationStructure';
import { BasePage } from '../BasePage';

/**
 * Admin → Organization → Structure (`/admin/viewCompanyStructure`).
 *
 * This page is a TREE, not a table, and has TWO behaviours that differ from every other
 * Admin CRUD page in this suite (both verified live via Playwright MCP, 2026-06-11):
 *  1. Mutation controls are gated behind a header "Edit" toggle (read-only by default).
 *  2. Save produces NO success toast — the dialog closes and the tree re-renders, so success
 *     MUST be asserted via the node text in the tree, never `waitForSuccessToast()`.
 *
 * Each node renders as `.org-structure-card` containing a `.org-name` label (`unitId: name`,
 * or just `name` when unitId is blank) and, in edit mode, a `.org-action` kebab whose menu
 * (`.oxd-dropdown-menu`) offers Delete / Edit / Add. The company root (`.org-root-container`)
 * exposes only an Add button — it has no kebab and cannot be deleted.
 */
export class OrganizationStructurePage extends BasePage {
  // ── Page chrome ─────────────────────────────────────────────────────────────
  readonly pageHeading: Locator;
  readonly editToggle: Locator;
  readonly rootAddButton: Locator;
  readonly rootContainer: Locator;
  /** All per-node kebab buttons currently rendered (empty when Edit is OFF). */
  readonly nodeActionButtons: Locator;

  // ── Add / Edit dialog ────────────────────────────────────────────────────────
  readonly dialog: Locator;
  readonly dialogTitle: Locator;
  readonly unitIdInput: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly dialogNote: Locator;
  readonly fieldError: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // ── Delete confirmation dialog ─────────────────────────────────────────────────
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageHeading = page.getByRole('heading', { name: 'Organization Structure' });
    this.editToggle = page.getByRole('checkbox', { name: 'Edit' });
    this.rootContainer = page.locator('.org-root-container');
    this.rootAddButton = page.locator('.org-structure-add');
    this.nodeActionButtons = page.locator('.org-action .oxd-icon-button');

    this.dialog = page.locator('.orangehrm-dialog-modal');
    this.dialogTitle = this.dialog.locator('.orangehrm-modal-header p');
    // The dialog has exactly two inputs (Unit Id, Name) and one textarea (Description),
    // scoped by their OXD input-group label so order changes can't break them.
    this.unitIdInput = this.dialog
      .locator('.oxd-input-group', { hasText: 'Unit Id' })
      .locator('input');
    this.nameInput = this.dialog
      .locator('.oxd-input-group', { hasText: 'Name' })
      .locator('input');
    this.descriptionInput = this.dialog.locator('textarea');
    this.dialogNote = this.dialog.locator('p.oxd-text--p');
    this.fieldError = this.dialog.locator('.oxd-input-field-error-message');
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });

    this.confirmDeleteButton = page.getByRole('button', {
      name: adminOrganizationStructure.deleteDialog.confirm,
    });
    this.cancelDeleteButton = page.getByRole('button', {
      name: adminOrganizationStructure.deleteDialog.cancel,
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  async gotoStructure(): Promise<void> {
    await this.goto(adminOrganizationStructure.routes.list);
    await this.waitUntilFormLoaderDissapear();
  }

  // ── Tree locators ──────────────────────────────────────────────────────────────

  /** A node's card, matched by the text of its `.org-name` label (use the full unique name). */
  card(name: string): Locator {
    return this.page.locator('.org-structure-card').filter({ hasText: name });
  }

  /** A node's `.org-name` label element — used for visibility / removal assertions. */
  nodeLabel(name: string): Locator {
    return this.page.locator('.org-name').filter({ hasText: name });
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────────

  async enableEditMode(): Promise<void> {
    // The OXD "Edit" toggle is a custom checkbox; a click reliably flips it ON (the tree
    // reloads OFF on every navigation, so this is never a double-toggle within a test).
    await this.editToggle.click();
    await this.rootAddButton.waitFor({ state: 'visible' });
  }

  // ── Dialog flows ─────────────────────────────────────────────────────────────────

  /** Opens the Add dialog at the company root. Requires Edit mode ON. */
  async openRootAddDialog(): Promise<void> {
    await this.rootAddButton.click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  /**
   * Opens a node's kebab and clicks one of Delete / Edit / Add. Requires Edit mode ON.
   *
   * The kebab trigger is the DIRECT button under `.org-action > li`; the opened menu renders
   * as a nested `.oxd-dropdown-menu` whose items also contain `.oxd-icon-button`s — so the
   * trigger must be selected as a direct child, never as `.org-action .oxd-icon-button`
   * (which would match the menu icons too once the menu is open). The menu is opened only if
   * the target item isn't already visible, so a pre-open menu never gets toggled shut.
   */
  async openNodeAction(name: string, action: 'Delete' | 'Edit' | 'Add'): Promise<void> {
    const card = this.card(name);
    const item = card.locator('.oxd-dropdown-menu li').filter({ hasText: action }).first();
    if (!(await item.isVisible().catch(() => false))) {
      await card.locator('.org-action > li > button').first().click();
      await item.waitFor({ state: 'visible' });
    }
    await item.click();
    if (action !== 'Delete') {
      await this.dialog.waitFor({ state: 'visible' });
    }
  }

  /** Fills the dialog. Pass `undefined` to leave a field untouched (used to reproduce the
   *  description-less edit path), or `''` to explicitly clear it. */
  async fillDialog(fields: { unitId?: string; name?: string; description?: string }): Promise<void> {
    if (fields.unitId !== undefined) await this.unitIdInput.fill(fields.unitId);
    if (fields.name !== undefined) await this.nameInput.fill(fields.name);
    if (fields.description !== undefined) await this.descriptionInput.fill(fields.description);
  }

  /**
   * Clicks Save and waits for the dialog to close (success has NO toast — the tree re-renders).
   * The caller asserts success via the node text afterwards.
   */
  async saveDialogExpectingClose(): Promise<void> {
    await this.saveButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitUntilFormLoaderDissapear();
  }

  /** Clicks Save when a save is expected to be BLOCKED (validation) or to fail (the silent
   *  description-null edit bug): the dialog stays open. Returns without waiting for a close. */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /** Deletes a node via its kebab → Delete → "Yes, Delete" confirmation. */
  async deleteNode(name: string): Promise<void> {
    await this.openNodeAction(name, 'Delete');
    await this.confirmDeleteButton.click();
    await this.waitUntilFormLoaderDissapear();
  }
}
