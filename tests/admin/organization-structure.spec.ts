import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { subunits } from '../../test-data/pim/api/subunits';
import { SubunitsApi } from '../../src/api/orangehrmOSAPI/SubunitsApi';

/**
 * E2E coverage for Admin → Organization → Structure (`/admin/viewCompanyStructure`) — P0 + P1.
 * Source: docs/test-priority_Organization Structure.md (P0+P1 = 14 IDs, folded into 10 tests).
 *
 * Two behaviours make this page unlike the other Admin CRUD suites (verified live 2026-06-11):
 *  • Mutations are gated behind the header "Edit" toggle (read-only by default).
 *  • Save produces NO success toast — success is asserted via the node text in the tree.
 *
 * TC-301 is a regression guard around a CONFIRMED app bug: editing a description-less unit
 * sends `description: null` → 422 and fails silently. The test asserts the buggy behaviour
 * and the suite REPORTS it; it must not be "fixed" by injecting a dummy description.
 *
 * Run:
 *   npx playwright test tests/admin/organization-structure.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const os = frontend.adminOrganizationStructure;
const ESS_TEST_USER = frontend.auth.essTestUser;

/** Every unit name created during the run (UI or API); resolved to ids and deleted in afterAll. */
const createdNames: string[] = [];
const stamp = () => `${Date.now()}`;

// ─── Suite setup / teardown ─────────────────────────────────────────────────
test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ masterDataReadiness }) => {
  void masterDataReadiness;
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdNames.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const api = new SubunitsApi(orangehrmAdminApi.request);
  await api.deleteByNamesIfPresent(createdNames);
});

// ─── P0/P1: tree render, read-only default, edit-mode gating, root protection ─────
test.describe('Organization Structure — view & edit-mode gating', () => {
  test.beforeEach(async ({ loginPage, organizationStructurePage }) => {
    await loginPage.loginAs('admin');
    await organizationStructurePage.gotoStructure();
  });

  test('TC-ADMIN-ORG-001 — Tree renders read-only by default; Edit toggle reveals Add + node actions; root is add-only', async ({
    organizationStructurePage: org,
  }) => {
    // -- TC-001: tree + root company node render --
    await expect(org.pageHeading).toBeVisible();
    await expect(org.rootContainer).toContainText(os.rootName);

    // -- TC-500: read-only by default — Add + node kebabs exist in the DOM but are hidden --
    await expect(org.rootAddButton).toBeHidden();
    await expect(org.nodeActionButtons.first()).toBeHidden();

    // -- TC-002: enabling Edit reveals the root Add button and per-node action kebabs --
    await org.enableEditMode();
    await expect(org.rootAddButton).toBeVisible();
    await expect(org.nodeActionButtons.first()).toBeVisible();

    // -- TC-103: the company root exposes Add only — it has no kebab and cannot be deleted --
    await expect(org.rootContainer.locator('.org-action')).toHaveCount(0);
  });
});

// ─── P0/P1: add flows + client-side validation (Edit mode ON, tests own their data) ──
test.describe('Organization Structure — add & validation', () => {
  test.beforeEach(async ({ loginPage, organizationStructurePage }) => {
    await loginPage.loginAs('admin');
    await organizationStructurePage.gotoStructure();
    await organizationStructurePage.enableEditMode();
  });

  test('TC-ADMIN-ORG-003 — Add a top-level sub-unit under the company root (no toast; node appears)', async ({
    organizationStructurePage: org,
  }) => {
    const name = `OS E2E Root ${stamp()}`;

    await org.openRootAddDialog();
    await expect(org.dialogTitle).toHaveText(os.dialog.addTitle);
    await expect(org.dialog).toContainText(os.dialog.addUnderNote(os.rootName));

    await org.fillDialog({ unitId: 'E2E', name, description: os.samples.description });
    await org.saveDialogExpectingClose();
    createdNames.push(name);

    // Success has NO toast — assert via the new node in the tree.
    await expect(org.nodeLabel(name)).toBeVisible();
  });

  test('TC-ADMIN-ORG-004 — Add a child sub-unit under an existing node (nested; parent note correct)', async ({
    organizationStructurePage: org,
  }) => {
    const parentName = `OS E2E Parent ${stamp()}`;
    const childName = `OS E2E Child ${stamp()}`;

    // -- Create the parent (no unitId so its tree label equals the bare name → note matches) --
    await org.openRootAddDialog();
    await org.fillDialog({ name: parentName, description: os.samples.description });
    await org.saveDialogExpectingClose();
    createdNames.push(parentName);
    await expect(org.nodeLabel(parentName)).toBeVisible();

    // -- Add a child under it via the node kebab --
    await org.openNodeAction(parentName, 'Add');
    await expect(org.dialogTitle).toHaveText(os.dialog.addTitle);
    await expect(org.dialog).toContainText(os.dialog.addUnderNote(parentName));

    await org.fillDialog({ name: childName, description: os.samples.description });
    await org.saveDialogExpectingClose();
    createdNames.push(childName);

    await expect(org.nodeLabel(childName)).toBeVisible();
  });

  test('TC-ADMIN-ORG-100 — Duplicate name (global) shows the unique-name error and blocks save', async ({
    organizationStructurePage: org,
  }) => {
    // Seed a unit, then attempt to reuse its exact name from a fresh Add dialog.
    const existing = `OS E2E Dup ${stamp()}`;
    await org.openRootAddDialog();
    await org.fillDialog({ name: existing, description: os.samples.description });
    await org.saveDialogExpectingClose();
    createdNames.push(existing);
    await expect(org.nodeLabel(existing)).toBeVisible();

    await org.openRootAddDialog();
    await org.fillDialog({ name: existing });
    await expect(org.fieldError).toHaveText(os.messages.duplicateName);

    // Save is blocked client-side — dialog stays open, no second node created.
    await org.clickSave();
    await expect(org.dialog).toBeVisible();
    await expect(org.fieldError).toHaveText(os.messages.duplicateName);
    await org.cancelButton.click();
    await expect(org.dialog).toBeHidden();
    await expect(org.nodeLabel(existing)).toHaveCount(1);
  });

  test('TC-ADMIN-ORG-101 — Empty Name shows "Required" and blocks save', async ({
    organizationStructurePage: org,
  }) => {
    await org.openRootAddDialog();
    await org.clickSave();

    await expect(org.fieldError).toHaveText(os.messages.required);
    await expect(org.dialog).toBeVisible();
    await org.cancelButton.click();
    await expect(org.dialog).toBeHidden();
  });
});

// ─── P0: edit an existing sub-unit that HAS a description (clean update path) ─────────
test.describe('Organization Structure — edit (with description)', () => {
  let seededName: string;

  test.beforeEach(async ({ loginPage, organizationStructurePage, orangehrmAdminApi }) => {
    seededName = `OS E2E Edit ${stamp()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const api = new SubunitsApi(orangehrmAdminApi.request);
    await api.create({ parentId: 1, unitId: '', name: seededName, description: os.samples.description });
    createdNames.push(seededName);

    await loginPage.loginAs('admin');
    await organizationStructurePage.gotoStructure();
    await organizationStructurePage.enableEditMode();
    await expect(organizationStructurePage.nodeLabel(seededName)).toBeVisible();
  });

  test('TC-ADMIN-ORG-005 — Rename a sub-unit (description present) updates the tree (no toast)', async ({
    organizationStructurePage: org,
  }) => {
    const renamed = `OS E2E Edited ${stamp()}`;

    await org.openNodeAction(seededName, 'Edit');
    await expect(org.dialogTitle).toHaveText(os.dialog.editTitle);
    await expect(org.nameInput).toHaveValue(seededName);

    await org.fillDialog({ name: renamed });
    await org.saveDialogExpectingClose();
    createdNames.push(renamed);

    await expect(org.nodeLabel(renamed)).toBeVisible();
    await expect(org.nodeLabel(seededName)).toHaveCount(0);
  });
});

// ─── P0: delete a leaf, and cascade delete of a parent with a child ───────────────────
test.describe('Organization Structure — delete & cascade', () => {
  test.beforeEach(async ({ loginPage, organizationStructurePage }) => {
    await loginPage.loginAs('admin');
    await organizationStructurePage.gotoStructure();
    await organizationStructurePage.enableEditMode();
  });

  test('TC-ADMIN-ORG-006 — Delete a leaf sub-unit removes it from the tree', async ({
    organizationStructurePage: org,
    orangehrmAdminApi,
  }) => {
    const name = `OS E2E Leaf ${stamp()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const api = new SubunitsApi(orangehrmAdminApi.request);
    await api.create({ parentId: 1, unitId: '', name, description: os.samples.description });
    createdNames.push(name);

    await org.gotoStructure();
    await org.enableEditMode();
    await expect(org.nodeLabel(name)).toBeVisible();

    await org.deleteNode(name);
    await expect(org.nodeLabel(name)).toHaveCount(0);
  });

  test('TC-ADMIN-ORG-102 — Deleting a parent cascades to its descendants', async ({
    organizationStructurePage: org,
    orangehrmAdminApi,
  }) => {
    const parentName = `OS E2E CascadeP ${stamp()}`;
    const childName = `OS E2E CascadeC ${stamp()}`;
    await orangehrmAdminApi.loginAsAdmin();
    const api = new SubunitsApi(orangehrmAdminApi.request);
    const parentId = await api.createAndGetId({
      parentId: 1,
      unitId: '',
      name: parentName,
      description: os.samples.description,
    });
    await api.createAndGetId({
      parentId,
      unitId: '',
      name: childName,
      description: os.samples.description,
    });
    createdNames.push(parentName, childName);

    await org.gotoStructure();
    await org.enableEditMode();
    await expect(org.nodeLabel(parentName)).toBeVisible();
    await expect(org.nodeLabel(childName)).toBeVisible();

    // -- Delete the parent → both parent and child disappear --
    await org.deleteNode(parentName);
    await expect(org.nodeLabel(parentName)).toHaveCount(0);
    await expect(org.nodeLabel(childName)).toHaveCount(0);
  });
});

// ─── P0: CONFIRMED BUG — editing a description-less unit fails silently (regression guard) ──
test.describe('Organization Structure — silent description-null edit bug', () => {
  test.beforeEach(async ({ loginPage, organizationStructurePage }) => {
    await loginPage.loginAs('admin');
    await organizationStructurePage.gotoStructure();
    await organizationStructurePage.enableEditMode();
  });

  test('TC-ADMIN-ORG-301 — Editing a unit created WITHOUT a description PUTs description:null → 422; dialog stays open, rename lost', async ({
    organizationStructurePage: org,
    page,
  }) => {
    // -- Create a description-less unit via the UI (the API always sends a description) --
    const name = `OS E2E NoDesc ${stamp()}`;
    const attempted = `OS E2E NoDesc Renamed ${stamp()}`;
    await org.openRootAddDialog();
    await org.fillDialog({ name }); // Name only — no Unit Id, no Description
    await org.saveDialogExpectingClose();
    createdNames.push(name);
    await expect(org.nodeLabel(name)).toBeVisible();

    // -- Edit it: change the Name, leave Description empty --
    await org.openNodeAction(name, 'Edit');
    await expect(org.dialogTitle).toHaveText(os.dialog.editTitle);
    await expect(org.nameInput).toHaveValue(name);
    await expect(org.descriptionInput).toHaveValue('');
    await org.fillDialog({ name: attempted });

    // -- The UI sends description:null → the backend rejects it with 422 --
    const putResponse = page.waitForResponse(
      (r) =>
        r.url().includes(subunits.adminPath.replace('/web/index.php', '')) &&
        r.request().method() === 'PUT',
    );
    await org.clickSave();
    const res = await putResponse;
    expect(res.status()).toBe(422);

    // -- Bug symptom: no toast, dialog stays open, the rename is lost --
    await expect(org.dialog).toBeVisible();
    await org.cancelButton.click();
    await expect(org.dialog).toBeHidden();
    await expect(org.nodeLabel(name)).toBeVisible();
    await expect(org.nodeLabel(attempted)).toHaveCount(0);
  });
});

// ─── P0: ESS security lockout ──────────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Organization Structure', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-ADMIN-ORG-200 — ESS user: no Admin menu; deep link renders Credential Required (no tree/Add/Edit)', async ({
    organizationStructurePage: org,
    page,
  }) => {
    // -- Admin module absent from the side navigation --
    await expect(org.mainMenuItem('Admin')).toHaveCount(0);

    // -- Deep link to the structure page renders no tree, no controls --
    await org.goto(os.routes.list);
    await expect(page.getByText(os.messages.credentialRequired)).toBeVisible();
    await expect(org.rootAddButton).toHaveCount(0);
    await expect(org.editToggle).toHaveCount(0);
  });
});
