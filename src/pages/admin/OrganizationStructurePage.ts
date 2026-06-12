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
  /** In-dialog loading spinner; on a swallowed 422 it gets stuck and even blocks Cancel (TC-301). */
  readonly dialogFormLoader: Locator;
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
    this.dialogFormLoader = this.dialog.locator('.oxd-form-loader');
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

  /** The tree-node wrapper for a node (carries `--open` when expanded; holds the expand toggle). */
  nodeWrapper(name: string): Locator {
    return this.page
      .locator('.oxd-tree-node-wrapper')
      .filter({ has: this.page.locator('.org-structure-card .org-name', { hasText: name }) });
  }

  /**
   * Expands a parent node so its children render. The tree lazy-renders children and starts
   * COLLAPSED (chevron-down = collapsed, chevron-up = expanded) — a child node is not in the
   * DOM until its parent is expanded. No-op if the node has no toggle or is already expanded.
   */
  async expandNode(name: string): Promise<void> {
    const collapsedToggle = this.nodeWrapper(name)
      .locator('.oxd-tree-node-toggle:has(.bi-chevron-down)')
      .first();
    if (await collapsedToggle.isVisible().catch(() => false)) {
      await collapsedToggle.click();
    }
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

  /** Bootstrap-icon class for each node action (the `.org-action` inline icon buttons). */
  private static readonly ACTION_ICON = {
    Delete: 'bi-trash-fill',
    Edit: 'bi-pencil-fill',
    Add: 'bi-plus',
  } as const;

  /**
   * Triggers a node's Delete / Edit / Add action. Requires Edit mode ON.
   *
   * The action area is RESPONSIVE (verified live, 1280px viewport): at the test's default
   * width each node renders three inline `.org-action` icon buttons — trash (Delete), pencil
   * (Edit), plus (Add). At narrow widths it collapses to a kebab (`.org-action > li > button`)
   * that opens an `.oxd-dropdown-menu` of Delete / Edit / Add `<li>`s. This handles both so the
   * suite is robust to viewport changes.
   */
  async openNodeAction(name: string, action: 'Delete' | 'Edit' | 'Add'): Promise<void> {
    const card = this.card(name);
    const icon = OrganizationStructurePage.ACTION_ICON[action];
    const inlineButton = card.locator(`.org-action button:has(.${icon})`).first();

    if (await inlineButton.isVisible().catch(() => false)) {
      await inlineButton.click();
    } else {
      // Narrow layout: open the kebab, then click the menu item by its label.
      await card.locator('.org-action > li > button').first().click();
      await card.locator('.oxd-dropdown-menu li').filter({ hasText: action }).first().click();
    }

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

  /**
   * Types the Name character-by-character. The async unique-name validator runs on each input
   * event, so a single `fill()` can race its data load and miss the duplicate; per-character
   * typing fires repeated input events and reliably surfaces the "should be unique" error.
   */
  async typeName(name: string): Promise<void> {
    await this.nameInput.click();
    await this.nameInput.fill('');
    await this.nameInput.pressSequentially(name, { delay: 30 });
  }

  /** Clicks Save when a save is expected to be BLOCKED (validation) or to fail (the silent
   *  description-null edit bug): the dialog stays open. Returns without waiting for a close. */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Returns a promise for the next `PUT /api/v2/admin/subunits/{id}` response (the edit save).
   * Call BEFORE clicking Save so the listener is armed, then `await` it to inspect the status.
   */
  waitForSubunitPut() {
    return this.page.waitForResponse(
      (r) => /\/api\/v2\/admin\/subunits\/\d+$/.test(r.url()) && r.request().method() === 'PUT',
    );
  }

  /** Deletes a node via its kebab → Delete → "Yes, Delete" confirmation. */
  async deleteNode(name: string): Promise<void> {
    await this.openNodeAction(name, 'Delete');
    await this.confirmDeleteButton.click();
    await this.waitUntilFormLoaderDissapear();
  }
}
