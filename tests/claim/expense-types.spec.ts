import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ClaimExpenseTypesApi } from '../../src/api/orangehrmOSAPI/ClaimExpenseTypesApi';

/**
 * E2E coverage for Claim → Configuration → Expense Types — P0 + P1 + P2.
 * Source: docs/test-priority_Claim -> Expense Types.md
 * (TC-106 "active types in claim expense dropdown" is deferred — see the priority doc.)
 *
 * Run:
 *   npx playwright test tests/claim/expense-types.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 90_000 });

const types = frontend.claimExpenseTypes;

// Unique-per-run suffix so seeded names never collide with a previous run's leftovers.
const RUN = `${Date.now()}`;
let seq = 0;
const uniqueName = (prefix: string) => `${prefix} ${RUN}-${seq++}`;

// ─── Suite-level state ──────────────────────────────────────────────────────
const createdTypes: string[] = [];

const DUP_TYPE = `Expense Dup Seed ${RUN}`;
const EDIT_TYPE = `Expense Edit Seed ${RUN}`;
const STATUS_TYPE = `Expense Status Seed ${RUN}`;
const DELETE_TYPE = `Expense Delete Seed ${RUN}`;
const DELETE_CANCEL_TYPE = `Expense Delete-Cancel Seed ${RUN}`;

const ESS_TEST_USER = auth.essTestUser;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new ClaimExpenseTypesApi(orangehrmAdminApi.request);

  await api.createIfAbsent({ name: DUP_TYPE, description: 'duplicate-name fixture', status: true });
  await api.createIfAbsent({ name: EDIT_TYPE, description: 'edit fixture', status: true });
  await api.createIfAbsent({ name: STATUS_TYPE, description: 'status-toggle fixture', status: true });
  await api.createIfAbsent({ name: DELETE_TYPE, description: 'delete fixture', status: true });
  await api.createIfAbsent({ name: DELETE_CANCEL_TYPE, description: 'delete-cancel fixture', status: true });

  // DELETE_TYPE is included so a retry that re-seeds it (after TC-006 removed it) is still cleaned up.
  createdTypes.push(DUP_TYPE, EDIT_TYPE, STATUS_TYPE, DELETE_TYPE, DELETE_CANCEL_TYPE);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new ClaimExpenseTypesApi(orangehrmAdminApi.request);
  await api.deleteByNames([...new Set(createdTypes)]);
});

// ─── Admin CRUD + validation ────────────────────────────────────────────────
test.describe('Admin — Claim Expense Types configuration', () => {
  test.beforeEach(async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.loginAs('admin');
  });

  test('**TC-001** | Add an active expense type | **TC-504** save toast | **TC-505** Active status', async ({ claimExpenseTypesPage }) => {
    const name = uniqueName('Travel Expense');
    createdTypes.push(name);

    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillExpenseType({ name, description: types.samples.description });
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForSave();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.rowByName(name)).toBeVisible();
    await expect(claimExpenseTypesPage.statusBadge(name, 'Active')).toBeVisible();
  });

  test('**TC-002** | Add an expense type with only the required Name', async ({ claimExpenseTypesPage }) => {
    const name = uniqueName('Minimal Expense');
    createdTypes.push(name);

    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillExpenseType({ name });
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForSave();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.rowByName(name)).toBeVisible();
  });

  test('**TC-003** | Add an inactive expense type | **TC-505** Inactive status', async ({ claimExpenseTypesPage }) => {
    const name = uniqueName('Inactive Expense');
    createdTypes.push(name);

    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillExpenseType({ name, active: false });
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForSave();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.statusBadge(name, 'Inactive')).toBeVisible();
  });

  test('**TC-004** | Edit an expense type name/description | **TC-504** update toast', async ({ claimExpenseTypesPage }) => {
    const newName = uniqueName(types.samples.updatedName);
    createdTypes.push(newName);

    await claimExpenseTypesPage.gotoList();
    await claimExpenseTypesPage.clickEdit(EDIT_TYPE);
    await expect(claimExpenseTypesPage.editFormHeading).toBeVisible();
    await claimExpenseTypesPage.fillName(newName);
    await claimExpenseTypesPage.fillDescription(types.samples.updatedDescription);
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForUpdate();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.rowByName(newName)).toBeVisible();
    await expect(claimExpenseTypesPage.rowByName(EDIT_TYPE)).toHaveCount(0);
  });

  test('**TC-005** | Toggle an expense type status Active → Inactive via edit', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoList();
    await claimExpenseTypesPage.clickEdit(STATUS_TYPE);
    await claimExpenseTypesPage.setActive(false);
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForUpdate();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.statusBadge(STATUS_TYPE, 'Inactive')).toBeVisible();
  });

  test('**TC-006** | Delete an expense type via the confirmation dialog | **TC-504** delete toast', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoList();
    await claimExpenseTypesPage.openDeleteDialog(DELETE_TYPE);
    await claimExpenseTypesPage.confirmDelete();
    await claimExpenseTypesPage.verifySuccessToastforDeletion();

    await expect(claimExpenseTypesPage.rowByName(DELETE_TYPE)).toHaveCount(0);
  });

  test('**TC-100** | Duplicate Name shows "Already exists" | **TC-301** no partial save', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillName(DUP_TYPE);
    await claimExpenseTypesPage.clickSave();
    await expect(claimExpenseTypesPage.nameError).toHaveText(types.messages.alreadyExists);

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.rowByName(DUP_TYPE)).toHaveCount(1);
  });

  test('**TC-101** | Empty Name shows "Required" | **TC-502** clears on input', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.clickSave();
    await expect(claimExpenseTypesPage.nameError).toHaveText(types.messages.required);

    await claimExpenseTypesPage.fillName(uniqueName('Cleared'));
    await expect(claimExpenseTypesPage.nameError).toHaveCount(0);
  });

  test('**TC-300** | Whitespace-only Name is rejected', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillName(types.samples.whitespaceName);
    await claimExpenseTypesPage.clickSave();
    await expect(claimExpenseTypesPage.nameError).toHaveText(types.messages.required);
  });

  test('**TC-203** | XSS / special chars in name render as inert text', async ({ claimExpenseTypesPage, page }) => {
    // The script payload must never execute — guard against any dialog it would raise.
    let dialogFired = false;
    page.on('dialog', async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const name = `${types.samples.xssName} ${RUN}`;
    createdTypes.push(name);

    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillExpenseType({ name });
    await claimExpenseTypesPage.clickSave();
    await claimExpenseTypesPage.verifySuccessToastForSave();

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.rowByName(name)).toBeVisible();
    expect(dialogFired).toBe(false);
  });

  test('**TC-304** | Cancel on the Delete dialog keeps the record | **TC-503** dialog content', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoList();
    await claimExpenseTypesPage.openDeleteDialog(DELETE_CANCEL_TYPE);
    await expect(claimExpenseTypesPage.deleteDialog).toContainText(types.deleteDialog.title);
    await expect(claimExpenseTypesPage.deleteDialog).toContainText(types.deleteDialog.body);
    await claimExpenseTypesPage.cancelDelete();

    await expect(claimExpenseTypesPage.rowByName(DELETE_CANCEL_TYPE)).toHaveCount(1);
  });

  test('**TC-007** | Cancel on Add form returns to list without creating', async ({ claimExpenseTypesPage }) => {
    const name = uniqueName('Cancelled Expense');

    await claimExpenseTypesPage.gotoAddForm();
    await claimExpenseTypesPage.fillName(name);
    await claimExpenseTypesPage.clickCancel();

    await expect(claimExpenseTypesPage.page).toHaveURL(types.urlPatterns.list);
    await expect(claimExpenseTypesPage.rowByName(name)).toHaveCount(0);
  });

  test('**TC-501** | Record count reflects the number of rendered rows', async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.recordsFoundText).toBeVisible();
    // Seed volume is well under one page, so the "(N) Record(s) Found" counter equals the rendered rows.
    const count = await claimExpenseTypesPage.recordsFoundCount();
    await expect(claimExpenseTypesPage.tableRows).toHaveCount(count);
  });

  // No search/filter exists on the list, so the empty state is exercised deterministically by
  // route-mocking the list endpoint to an empty set (sanctioned for empty-state UI checks).
  test('**TC-500** | Empty list renders "No Records Found"', async ({ claimExpenseTypesPage, page }) => {
    await page.route(types.listApiPattern, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0 }, rels: [] }),
        });
        return;
      }
      await route.continue();
    });

    await claimExpenseTypesPage.gotoList();
    await expect(claimExpenseTypesPage.noRecordsText).toBeVisible();
    await expect(claimExpenseTypesPage.tableRows).toHaveCount(0);
  });
});

// ─── Security: ESS cannot reach Expense Types configuration ──────────────────
test.describe('Security — ESS cannot access Claim Expense Types configuration', () => {
  test.beforeEach(async ({ claimExpenseTypesPage }) => {
    await claimExpenseTypesPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('**TC-200** | ESS direct access to Expense Types list → Credential Required', async ({ claimExpenseTypesPage, page }) => {
    await page.goto(types.routes.list, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(types.messages.credentialRequired, { exact: true })).toBeVisible();
    await expect(claimExpenseTypesPage.addButton).toHaveCount(0);
  });

  test('**TC-202** | ESS direct access to Add Expense Type form → Credential Required', async ({ page }) => {
    await page.goto(types.routes.add, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(types.messages.credentialRequired, { exact: true })).toBeVisible();
  });
});
