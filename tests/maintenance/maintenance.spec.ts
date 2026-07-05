import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { maintenance } from '../../test-data/maintenance/frontend/maintenance';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for the Maintenance module (Admin) — P0 + P1.
 * Source: docs/test-priority_Maintenance.md
 *
 * Covers:
 *   Gate    — TC-001 (+102 grant/500/504), TC-301 (+102 deny/503), TC-300, TC-103
 *   Purge   — TC-100 (+505), TC-003 (+502), TC-305 (+501), TC-002 (+104)
 *   Access  — TC-101, TC-004
 *   Security— TC-200, TC-202, TC-203
 *
 * Run:
 *   npx playwright test tests/maintenance/maintenance.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const ADMIN_PASSWORD = auth.getCredentials('admin').password;
const ESS = auth.essTestUser;

// Unique per-run token so seeded employees are found only by this suite's queries.
const RUN = `${Date.now()}`.slice(-6);
const TOKEN = `Mnt${RUN}`; // shared last name — matches all three seeds in one autocomplete query

type SeededEmployee = { firstName: string; lastName: string; employeeId: string; empNumber: number };

const seeded: Record<'current' | 'purge' | 'keep', SeededEmployee> = {
  current: { firstName: 'Curr', lastName: TOKEN, employeeId: `1${RUN}`, empNumber: 0 },
  purge: { firstName: 'Purge', lastName: TOKEN, employeeId: `2${RUN}`, empNumber: 0 },
  keep: { firstName: 'Keep', lastName: TOKEN, employeeId: `3${RUN}`, empNumber: 0 },
};

const fullName = (e: SeededEmployee) => `${e.firstName} ${e.lastName}`;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new EmployeesApi(orangehrmAdminApi.request);

  for (const key of ['current', 'purge', 'keep'] as const) {
    const e = seeded[key];
    await api.create({
      employeeId: e.employeeId,
      firstName: e.firstName,
      lastName: e.lastName,
      middleName: '',
    });
    const empNumber = await api.getEmpNumberByEmployeeId(e.employeeId);
    if (!empNumber) throw new Error(`Seed failed: could not resolve empNumber for ${e.employeeId}`);
    e.empNumber = empNumber;
  }

  // Terminate the two "past employee" fixtures so they surface on the Purge screen.
  const terminationReasonId = await api.getTerminationReasonId(
    maintenance.fixtures.terminationReasonName,
  );
  for (const key of ['purge', 'keep'] as const) {
    await api.terminate(seeded[key].empNumber, {
      date: maintenance.fixtures.terminationDate,
      terminationReasonId,
      note: 'maintenance suite fixture',
    });
  }
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const api = new EmployeesApi(orangehrmAdminApi.request);
  const ids = Object.values(seeded)
    .map((e) => e.empNumber)
    .filter((n) => n > 0);
  await api.deleteEmployees(ids); // purged employees may already be gone — deleteEmployees ignores that.
});

// ─── Administrator Access gate ───────────────────────────────────────────────
test.describe('Maintenance — Administrator Access gate', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  test('**TC-001** correct password unlocks the module | **TC-102** grant | **TC-500** gate copy | **TC-504** landing', async ({
    maintenancePage,
    page,
  }) => {
    await maintenancePage.gotoModule();
    await expect(maintenancePage.accessHeading).toBeVisible();
    await expect(page.getByText(maintenance.messages.accessCopy)).toBeVisible();

    await maintenancePage.unlock(ADMIN_PASSWORD);

    await expect(page).toHaveURL(maintenance.urlPatterns.purge);
    await expect(maintenancePage.purgeHeading).toBeVisible();
  });

  test('**TC-301** wrong password is rejected | **TC-102** deny | **TC-503** invalid-credentials alert', async ({
    maintenancePage,
    page,
  }) => {
    await maintenancePage.gotoModule();
    await maintenancePage.submitGate(auth.samples.wrongPassword);

    await expect(maintenancePage.invalidCredentialsAlert).toBeVisible();
    await expect(page).toHaveURL(maintenance.urlPatterns.adminVerify);
    await expect(maintenancePage.purgeHeading).toBeHidden();
  });

  test('**TC-300** empty password shows inline "Required" and stays on the gate', async ({
    maintenancePage,
  }) => {
    await maintenancePage.gotoModule();
    await maintenancePage.submitGate('');

    await expect(maintenancePage.gateFieldError).toHaveText(maintenance.messages.required);
    await expect(maintenancePage.accessHeading).toBeVisible();
  });

  test('**TC-103** the gate re-prompts on every entry to the module', async ({
    maintenancePage,
    page,
  }) => {
    await maintenancePage.openUnlocked(ADMIN_PASSWORD);
    await expect(maintenancePage.purgeHeading).toBeVisible();

    // Leave the module, then come back — the unlock must not be cached.
    await page.goto(auth.routes.dashboard, { waitUntil: 'domcontentloaded' });
    await maintenancePage.gotoModule();

    await expect(maintenancePage.accessHeading).toBeVisible();
  });
});

// ─── Purge Employee Records ───────────────────────────────────────────────────
test.describe('Maintenance — Purge Employee Records', () => {
  test.beforeEach(async ({ loginPage, maintenancePage }) => {
    await loginPage.loginAs('admin');
    await maintenancePage.openUnlocked(ADMIN_PASSWORD);
  });

  test('**TC-100** autocomplete lists only past employees | **TC-505** "No Records Found"', async ({
    maintenancePage,
  }) => {
    // Querying the shared token returns the terminated seeds, never the still-active one.
    const labels = await maintenancePage.hintLabels(TOKEN);
    expect(labels.some((l) => l.includes(fullName(seeded.keep)))).toBe(true);
    expect(labels.some((l) => l.includes(fullName(seeded.current)))).toBe(false);

    // A fragment with no terminated match shows the empty option.
    const emptyLabels = await maintenancePage.hintLabels(`nomatch${RUN}`);
    expect(emptyLabels).toContain(maintenance.messages.noRecords);
  });

  test('**TC-003** Selected Employee panel shows the chosen past employee | **TC-502** read-only', async ({
    maintenancePage,
  }) => {
    await maintenancePage.selectEmployeeAndSearch(fullName(seeded.keep), seeded.keep.firstName);

    await expect(maintenancePage.panelFirstName).toHaveValue(seeded.keep.firstName);
    await expect(maintenancePage.panelLastName).toHaveValue(seeded.keep.lastName);
    await expect(maintenancePage.panelFirstName).toBeDisabled();
    await expect(maintenancePage.panelLastName).toBeDisabled();
  });

  test('**TC-305** Cancel on the purge confirmation aborts | **TC-501** dialog copy', async ({
    maintenancePage,
  }) => {
    await maintenancePage.selectEmployeeAndSearch(fullName(seeded.keep), seeded.keep.firstName);
    await maintenancePage.openPurgeDialog();

    await expect(maintenancePage.purgeDialogTitle).toBeVisible();
    await expect(maintenancePage.purgeDialogBody).toBeVisible();

    await maintenancePage.cancelPurge();
    await expect(maintenancePage.confirmPurgeButton).toBeHidden();

    // The employee still exists — it re-appears in the past-employee autocomplete.
    const labels = await maintenancePage.hintLabels(fullName(seeded.keep));
    expect(labels.some((l) => l.includes(fullName(seeded.keep)))).toBe(true);
  });

  test('**TC-002** purge a terminated employee (happy path) | **TC-104** record removed', async ({
    maintenancePage,
    page,
  }) => {
    await maintenancePage.selectEmployeeAndSearch(fullName(seeded.purge), seeded.purge.firstName);

    const purgeResponse = page.waitForResponse(
      (r) => r.url().includes('/api/v2/maintenance/purge') && r.request().method() === 'DELETE',
    );
    await maintenancePage.openPurgeDialog();
    await maintenancePage.confirmPurge();
    const response = await purgeResponse;
    expect(response.status()).toBe(200);

    // The form resets and the purged employee no longer resolves by name.
    await expect(maintenancePage.selectedEmployeeHeading).toBeHidden();
    const labels = await maintenancePage.hintLabels(fullName(seeded.purge));
    expect(labels.some((l) => l.includes(fullName(seeded.purge)))).toBe(false);
  });
});

// ─── Access Records — Download Personal Data ─────────────────────────────────
test.describe('Maintenance — Access Records (Download Personal Data)', () => {
  test.beforeEach(async ({ loginPage, maintenancePage }) => {
    await loginPage.loginAs('admin');
    await maintenancePage.openUnlocked(ADMIN_PASSWORD);
    await maintenancePage.goToAccessTab();
  });

  test('**TC-101** autocomplete lists current employees (currentAndPast)', async ({
    maintenancePage,
  }) => {
    const labels = await maintenancePage.hintLabels(fullName(seeded.current));
    expect(labels.some((l) => l.includes(fullName(seeded.current)))).toBe(true);
  });

  test('**TC-004** download an employee\'s personal data as JSON', async ({
    maintenancePage,
    page,
  }) => {
    await maintenancePage.selectEmployeeAndSearch(fullName(seeded.current), seeded.current.firstName);
    await expect(maintenancePage.panelFirstName).toHaveValue(seeded.current.firstName);

    const downloadPromise = page.waitForEvent('download');
    await maintenancePage.downloadButton.click();
    const download = await downloadPromise;

    // The export names the file after the employee's full name. With an empty middle name the
    // app leaves a double space ("First  Last") — normalise whitespace before comparing.
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.json$/);
    expect(filename.replace(/\s+/g, ' ')).toBe(`${fullName(seeded.current)}.json`);
  });
});

// ─── Security ─────────────────────────────────────────────────────────────────
test.describe('Maintenance — Security (ESS cannot access)', () => {
  test.beforeEach(async ({ maintenancePage }) => {
    await maintenancePage.loginWithCredentials(ESS.username, ESS.password);
  });

  test('**TC-200** ESS has no Maintenance menu and is blocked on the module URL', async ({
    maintenancePage,
    page,
  }) => {
    await page.goto(maintenance.routes.module, { waitUntil: 'domcontentloaded' });
    await expect(maintenancePage.credentialRequiredAlert).toBeVisible();
    await expect(maintenancePage.purgeHeading).toBeHidden();
    await expect(maintenancePage.mainMenuItem('Maintenance')).toHaveCount(0);
  });

  test('**TC-202** ESS is blocked on the Access Records URL', async ({ maintenancePage, page }) => {
    await page.goto(maintenance.routes.access, { waitUntil: 'domcontentloaded' });
    await expect(maintenancePage.credentialRequiredAlert).toBeVisible();
    await expect(maintenancePage.downloadHeading).toBeHidden();
  });
});

test.describe('Maintenance — Security (gate guards deep links)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  test('**TC-203** admin deep-link to a sub-page still hits the Administrator Access gate', async ({
    maintenancePage,
    page,
  }) => {
    await page.goto(maintenance.routes.purge, { waitUntil: 'domcontentloaded' });
    await expect(maintenancePage.accessHeading).toBeVisible();
    await expect(maintenancePage.purgeHeading).toBeHidden();
  });
});
