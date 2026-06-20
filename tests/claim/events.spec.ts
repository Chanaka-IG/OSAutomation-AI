import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { ClaimEventsApi } from '../../src/api/orangehrmOSAPI/ClaimEventsApi';

/**
 * E2E coverage for Claim → Configuration → Events — P0 + P1 + P2.
 * Source: docs/test-priority_Claim -> Events.md
 *
 * Run:
 *   npx playwright test tests/claim/events.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ timeout: 90_000 });

const events = frontend.claimEvents;

// Unique-per-run suffix so seeded names never collide with a previous run's leftovers.
const RUN = `${Date.now()}`;
let seq = 0;
const uniqueName = (prefix: string) => `${prefix} ${RUN}-${seq++}`;

// ─── Suite-level state ──────────────────────────────────────────────────────
/** Names created during the run; resolved to ids and hard-deleted in afterAll. */
const createdEvents: string[] = [];

// Read-only seeds (created once in beforeAll, consumed by specific tests).
const DUP_EVENT = `Claim Dup Seed ${RUN}`;
const EDIT_EVENT = `Claim Edit Seed ${RUN}`;
const STATUS_EVENT = `Claim Status Seed ${RUN}`;
const DELETE_EVENT = `Claim Delete Seed ${RUN}`;
const DELETE_CANCEL_EVENT = `Claim Delete-Cancel Seed ${RUN}`;
const ACTIVE_SEED = `Claim Active Seed ${RUN}`;
const INACTIVE_SEED = `Claim Inactive Seed ${RUN}`;

const ESS_TEST_USER = auth.essTestUser;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new ClaimEventsApi(orangehrmAdminApi.request);

  // Seed read-only fixtures through the API so each test body stays focused on the behavior under test.
  await api.createIfAbsent({ name: DUP_EVENT, description: 'duplicate-name fixture', status: true });
  await api.createIfAbsent({ name: EDIT_EVENT, description: 'edit fixture', status: true });
  await api.createIfAbsent({ name: STATUS_EVENT, description: 'status-toggle fixture', status: true });
  await api.createIfAbsent({ name: DELETE_EVENT, description: 'delete fixture', status: true });
  await api.createIfAbsent({ name: DELETE_CANCEL_EVENT, description: 'delete-cancel fixture', status: true });
  await api.createIfAbsent({ name: ACTIVE_SEED, description: 'active fixture', status: true });
  await api.createIfAbsent({ name: INACTIVE_SEED, description: 'inactive fixture', status: false });

  // DELETE_EVENT is included so a retry that re-seeds it (after TC-006 removed it) is still cleaned up.
  createdEvents.push(DUP_EVENT, EDIT_EVENT, STATUS_EVENT, DELETE_EVENT, DELETE_CANCEL_EVENT, ACTIVE_SEED, INACTIVE_SEED);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new ClaimEventsApi(orangehrmAdminApi.request);
  await api.deleteByNames([...new Set(createdEvents)]);
});

// ─── Admin CRUD + validation ────────────────────────────────────────────────
test.describe('Admin — Claim Events configuration', () => {
  test.beforeEach(async ({ claimEventsPage }) => {
    await claimEventsPage.loginAs('admin');
  });

  test('**TC-001** | Add an active event | **TC-504** save toast | **TC-505** Active status', async ({ claimEventsPage }) => {
    const name = uniqueName('Conference Travel');
    createdEvents.push(name);

    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillEvent({ name, description: events.samples.description });
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForSave();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.rowByName(name)).toBeVisible();
    await expect(claimEventsPage.statusBadge(name, 'Active')).toBeVisible();
  });

  test('**TC-002** | Add an event with only the required Event Name', async ({ claimEventsPage }) => {
    const name = uniqueName('Minimal Event');
    createdEvents.push(name);

    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillEvent({ name });
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForSave();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.rowByName(name)).toBeVisible();
  });

  test('**TC-003** | Add an inactive event | **TC-505** Inactive status', async ({ claimEventsPage }) => {
    const name = uniqueName('Inactive Event');
    createdEvents.push(name);

    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillEvent({ name, active: false });
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForSave();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.statusBadge(name, 'Inactive')).toBeVisible();
  });

  test('**TC-004** | Edit an event name/description | **TC-504** update toast', async ({ claimEventsPage }) => {
    const newName = uniqueName(events.samples.updatedName);
    createdEvents.push(newName);

    await claimEventsPage.gotoList();
    await claimEventsPage.clickEdit(EDIT_EVENT);
    await expect(claimEventsPage.editFormHeading).toBeVisible();
    await claimEventsPage.fillName(newName);
    await claimEventsPage.fillDescription(events.samples.updatedDescription);
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForUpdate();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.rowByName(newName)).toBeVisible();
    await expect(claimEventsPage.rowByName(EDIT_EVENT)).toHaveCount(0);
  });

  test('**TC-005** | Toggle an event status Active → Inactive via edit', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoList();
    await claimEventsPage.clickEdit(STATUS_EVENT);
    await claimEventsPage.setActive(false);
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForUpdate();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.statusBadge(STATUS_EVENT, 'Inactive')).toBeVisible();
  });

  test('**TC-006** | Delete an event via the confirmation dialog | **TC-504** delete toast', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoList();
    await claimEventsPage.openDeleteDialog(DELETE_EVENT);
    await claimEventsPage.confirmDelete();
    await claimEventsPage.verifySuccessToastforDeletion();

    await expect(claimEventsPage.rowByName(DELETE_EVENT)).toHaveCount(0);
  });

  test('**TC-100** | Duplicate Event Name shows "Already exists" | **TC-301** no partial save', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillName(DUP_EVENT);
    await claimEventsPage.clickSave();
    await expect(claimEventsPage.nameError).toHaveText(events.messages.alreadyExists);

    // No second copy was persisted.
    await claimEventsPage.gotoList();
    await expect(claimEventsPage.rowByName(DUP_EVENT)).toHaveCount(1);
  });

  test('**TC-101** | Empty Event Name shows "Required" | **TC-502** clears on input', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoAddForm();
    await claimEventsPage.clickSave();
    await expect(claimEventsPage.nameError).toHaveText(events.messages.required);

    await claimEventsPage.fillName(uniqueName('Cleared'));
    await expect(claimEventsPage.nameError).toHaveCount(0);
  });

  test('**TC-300** | Whitespace-only Event Name is rejected', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillName(events.samples.whitespaceName);
    await claimEventsPage.clickSave();
    await expect(claimEventsPage.nameError).toHaveText(events.messages.required);
  });

  test('**TC-203** | XSS / special chars in name render as inert text', async ({ claimEventsPage, page }) => {
    // The script payload must never execute — guard against any dialog it would raise.
    let dialogFired = false;
    page.on('dialog', async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    const name = `${events.samples.xssName} ${RUN}`;
    createdEvents.push(name);

    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillEvent({ name });
    await claimEventsPage.clickSave();
    await claimEventsPage.verifySuccessToastForSave();

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.rowByName(name)).toBeVisible();
    expect(dialogFired).toBe(false);
  });

  test('**TC-304** | Cancel on the Delete dialog keeps the record | **TC-503** dialog content', async ({ claimEventsPage }) => {
    await claimEventsPage.gotoList();
    await claimEventsPage.openDeleteDialog(DELETE_CANCEL_EVENT);
    await expect(claimEventsPage.deleteDialog).toContainText(events.deleteDialog.title);
    await expect(claimEventsPage.deleteDialog).toContainText(events.deleteDialog.body);
    await claimEventsPage.cancelDelete();

    await expect(claimEventsPage.rowByName(DELETE_CANCEL_EVENT)).toHaveCount(1);
  });

  test('**TC-007** | Cancel on Add form returns to list without creating', async ({ claimEventsPage }) => {
    const name = uniqueName('Cancelled Event');

    await claimEventsPage.gotoAddForm();
    await claimEventsPage.fillName(name);
    await claimEventsPage.clickCancel();

    await expect(claimEventsPage.page).toHaveURL(events.urlPatterns.list);
    await expect(claimEventsPage.rowByName(name)).toHaveCount(0);
  });

  test('**TC-501** | Record count reflects the number of events', async ({ claimEventsPage, orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const apiCount = (await new ClaimEventsApi(orangehrmAdminApi.request).getAll()).length;

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.recordsFoundText).toBeVisible();
    expect(await claimEventsPage.recordsFoundCount()).toBe(apiCount);
  });

  // No search/filter exists on the Events list, so the empty state is exercised deterministically
  // by route-mocking the list endpoint to an empty set (sanctioned for empty-state UI checks).
  test('**TC-500** | Empty list renders "No Records Found"', async ({ claimEventsPage, page }) => {
    await page.route(events.listApiPattern, async (route) => {
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

    await claimEventsPage.gotoList();
    await expect(claimEventsPage.noRecordsText).toBeVisible();
    await expect(claimEventsPage.tableRows).toHaveCount(0);
  });

  test('**TC-103** | Only active events are selectable in Submit Claim | **TC-008**', async ({ claimEventsPage }) => {
    const options = await claimEventsPage.getSubmitClaimEventOptions();
    expect(options).toContain(ACTIVE_SEED);
    expect(options).not.toContain(INACTIVE_SEED);
  });
});

// ─── Security: ESS cannot reach Events configuration ────────────────────────
test.describe('Security — ESS cannot access Claim Events configuration', () => {
  test.beforeEach(async ({ claimEventsPage }) => {
    await claimEventsPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('**TC-200** | ESS direct access to Events list → Credential Required', async ({ claimEventsPage, page }) => {
    await page.goto(events.routes.list, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(events.messages.credentialRequired, { exact: true })).toBeVisible();
    await expect(claimEventsPage.addButton).toHaveCount(0);
  });

  test('**TC-202** | ESS direct access to Add Event form → Credential Required', async ({ page }) => {
    await page.goto(events.routes.add, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(events.messages.credentialRequired, { exact: true })).toBeVisible();
  });
});
