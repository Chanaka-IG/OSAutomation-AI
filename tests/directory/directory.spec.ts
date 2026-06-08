import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { LocationsApi } from '../../src/api/orangehrmOSAPI/LocationsApi';

/**
 * E2E coverage for the Directory module — P0 + P1.
 * Covers: TC-500, TC-001 (+100 plural), TC-002 (+100 singular), TC-101 (+403),
 * TC-003, TC-004, TC-006, TC-007, TC-300, TC-301, TC-200, TC-202 (+503).
 * Source: docs/test-priority_Directory.md
 *
 * Run:
 *   npx playwright test tests/directory/directory.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const directoryData = frontend.directory;
const STAMP = Date.now();

// ─── Suite-owned test data ──────────────────────────────────────────────────
/**
 * Disposable employee this suite fully owns: created in beforeAll with a job title,
 * location, and work contact info; hard-deleted in afterAll. Seeded directory
 * employees (Ruwan/Marcus/...) are never touched — they carry no job data.
 */
const SUITE_EMPLOYEE = {
  // Max ~10 chars accepted by POST /pim/employees — short but unique per run
  employeeId: `D${String(STAMP).slice(-8)}`,
  firstName: 'Dirsuite',
  lastName: `Emp${STAMP}`,
  middleName: '',
};
const SUITE_EMPLOYEE_FULL_NAME = `${SUITE_EMPLOYEE.firstName} ${SUITE_EMPLOYEE.lastName}`;
const SUITE_CONTACT = {
  workEmail: `dirsuite.${STAMP}@example.com`,
  workTelephone: '+1 555 0142',
};

let suiteEmpNumber: number;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  void masterDataReadiness;
  await orangehrmAdminApi.loginAsAdmin();

  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  await employeesApi.create(SUITE_EMPLOYEE);
  const empNumber = await employeesApi.getEmpNumberByEmployeeId(SUITE_EMPLOYEE.employeeId);
  if (!empNumber) throw new Error('Suite employee was not created — cannot run Directory suite.');
  suiteEmpNumber = empNumber;

  const jobTitleId = await new JobTitlesApi(orangehrmAdminApi.request).getIdByTitle(
    directoryData.masterData.suiteJobTitle,
  );
  const locationId = (await new LocationsApi(orangehrmAdminApi.request).getAll()).find(
    (l) => l.name === directoryData.masterData.suiteLocation,
  )?.id;
  if (!jobTitleId || !locationId) {
    throw new Error('Master data missing: suite job title or location not found.');
  }
  await employeesApi.updateJobDetails(suiteEmpNumber, { jobTitleId, locationId });
  await employeesApi.updateContactDetails(suiteEmpNumber, SUITE_CONTACT);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (!suiteEmpNumber) return;
  await orangehrmAdminApi.loginAsAdmin();
  await new EmployeesApi(orangehrmAdminApi.request).deleteEmployees([suiteEmpNumber]);
});

// ─── Admin — Directory grid and filters ─────────────────────────────────────
test.describe('Directory — search, filters, and detail panel', () => {
  test.beforeEach(async ({ loginPage, directoryPage }) => {
    await loginPage.loginAs('admin');
    await directoryPage.gotoDirectory();
  });

  // ── P1 smoke first: fails fast on any page-level breakage ────────────────

  test('TC-DIR-500 — Default state: empty filters, "-- Select --" dropdowns, populated grid', async ({
    directoryPage,
  }) => {
    await expect(directoryPage.pageHeading).toBeVisible();
    await expect(directoryPage.employeeNameInput).toBeEmpty();
    await expect(directoryPage.jobTitleDropdown).toContainText(
      directoryData.messages.defaultSelect,
    );
    await expect(directoryPage.locationDropdown).toContainText(
      directoryData.messages.defaultSelect,
    );
    await expect(directoryPage.searchButton).toBeEnabled();
    await expect(directoryPage.resetButton).toBeEnabled();
    await expect(directoryPage.directoryCards.first()).toBeVisible();
  });

  // ── P0 ────────────────────────────────────────────────────────────────────

  test('TC-DIR-001 — Landing page lists every active employee; count matches the API total', async ({
    directoryPage,
    orangehrmAdminApi,
  }) => {
    // -- Step 1: the page reports a plural record count (folds TC-100) --
    const uiCount = await directoryPage.recordsFoundCount();
    expect(uiCount).toBeGreaterThan(1);
    await expect(directoryPage.recordsFoundText).toHaveText(`(${uiCount}) Records Found`);

    // -- Step 2: cross-check against the directory API total --
    await orangehrmAdminApi.loginAsAdmin();
    const response = await orangehrmAdminApi.request.get(
      `${directoryData.apiPath}?limit=14&offset=0`,
      { headers: { Accept: 'application/json' } },
    );
    expect(response.ok()).toBe(true);
    const { meta } = (await response.json()) as { meta: { total: number } };
    expect(uiCount).toBe(meta.total);

    // -- Step 3: one card per employee on the first page (server pages at 14) --
    await expect(directoryPage.directoryCards).toHaveCount(Math.min(meta.total, 14));
    await expect(directoryPage.cardByName(SUITE_EMPLOYEE_FULL_NAME)).toBeVisible();
  });

  test('TC-DIR-002 — Name search via hint selection returns exactly that employee', async ({
    directoryPage,
  }) => {
    // -- Step 1: bind the autocomplete to the suite employee's hint --
    await directoryPage.pickEmployee(SUITE_EMPLOYEE.firstName, SUITE_EMPLOYEE_FULL_NAME);
    await directoryPage.runSearch();

    // -- Step 2: exactly one card; the counter uses the singular form (folds TC-100) --
    await expect(directoryPage.recordsFoundText).toHaveText('(1) Record Found');
    await expect(directoryPage.directoryCards).toHaveCount(1);
    await expect(directoryPage.cardByName(SUITE_EMPLOYEE_FULL_NAME)).toBeVisible();
  });

  test('TC-DIR-300 — Free-typed name never bound to a hint blocks search with "Invalid"', async ({
    directoryPage,
  }) => {
    const cardsBefore = await directoryPage.directoryCards.count();

    await directoryPage.employeeNameInput.fill(directoryData.samples.unknownEmployeeQuery);
    await directoryPage.searchButton.click();

    await expect(directoryPage.employeeNameFieldError).toHaveText(directoryData.messages.invalid);
    // The blocked search must leave the grid untouched
    await expect(directoryPage.directoryCards).toHaveCount(cardsBefore);
  });

  // ── P1 ────────────────────────────────────────────────────────────────────

  test('TC-DIR-101 — Hints offer matching employees while typing (case-insensitive)', async ({
    directoryPage,
  }) => {
    // Lower-case query (folds TC-403) still resolves the employee's hint
    await directoryPage.employeeNameInput.fill(SUITE_EMPLOYEE.firstName.toLowerCase());
    await expect(directoryPage.autocompleteOption(SUITE_EMPLOYEE_FULL_NAME)).toBeVisible();
  });

  test('TC-DIR-003 — Job Title filter returns only employees holding that title', async ({
    directoryPage,
  }) => {
    const initialCount = await directoryPage.recordsFoundCount();

    await directoryPage.selectJobTitle(directoryData.masterData.suiteJobTitle);
    await directoryPage.runSearch();

    // Retrying anchor: only a refreshed (narrowed) grid can satisfy this
    await expect(directoryPage.recordsFoundText).not.toHaveText(
      `(${initialCount}) Records Found`,
    );
    await expect(directoryPage.cardByName(SUITE_EMPLOYEE_FULL_NAME)).toBeVisible();

    // Every returned card must carry the filtered job title as its subtitle
    const cardCount = await directoryPage.directoryCards.count();
    expect(await directoryPage.recordsFoundCount()).toBe(cardCount);
    for (let i = 0; i < cardCount; i++) {
      await expect(
        directoryPage.directoryCards.nth(i).locator('.orangehrm-directory-card-subtitle'),
      ).toHaveText(directoryData.masterData.suiteJobTitle);
    }
  });

  test('TC-DIR-004 — Location filter returns only employees at that location', async ({
    directoryPage,
  }) => {
    await directoryPage.selectLocation(directoryData.masterData.suiteLocation);
    await directoryPage.runSearch();

    const suiteCard = directoryPage.cardByName(SUITE_EMPLOYEE_FULL_NAME);
    await expect(suiteCard).toBeVisible();
    // The card body renders the matched location under the geo icon
    await expect(suiteCard.locator('.orangehrm-directory-card-body')).toContainText(
      directoryData.masterData.suiteLocation,
    );
  });

  test('TC-DIR-301 — Filter combination with no matches shows "No Records Found"', async ({
    directoryPage,
  }) => {
    // Only the suite employee holds this title — and it sits in a different location
    await directoryPage.selectJobTitle(directoryData.masterData.suiteJobTitle);
    await directoryPage.selectLocation(directoryData.masterData.nonMatchingLocation);
    await directoryPage.runSearch();

    await expect(directoryPage.recordsFoundText).toHaveText(
      directoryData.messages.noRecordsFound,
    );
    await expect(directoryPage.directoryCards).toHaveCount(0);
  });

  test('TC-DIR-006 — Employee card opens the detail panel with work contact info', async ({
    directoryPage,
  }) => {
    await directoryPage.openEmployeeCard(SUITE_EMPLOYEE_FULL_NAME);

    await expect(directoryPage.sidebar).toBeVisible();
    await expect(directoryPage.sidebarEmployeeName).toHaveText(SUITE_EMPLOYEE_FULL_NAME);
    await expect(directoryPage.sidebarContactValue('Work Email')).toHaveText(
      SUITE_CONTACT.workEmail,
    );
    await expect(directoryPage.sidebarContactValue('Work Telephone')).toHaveText(
      SUITE_CONTACT.workTelephone,
    );
  });

  test('TC-DIR-007 — Reset clears filters and restores the full list', async ({
    directoryPage,
  }) => {
    const initialCount = await directoryPage.recordsFoundCount();

    // -- Step 1: narrow the grid --
    await directoryPage.selectJobTitle(directoryData.masterData.suiteJobTitle);
    await directoryPage.runSearch();
    // Retrying anchor: only a refreshed (narrowed) grid can satisfy this
    await expect(directoryPage.recordsFoundText).not.toHaveText(
      `(${initialCount}) Records Found`,
    );
    expect(await directoryPage.recordsFoundCount()).toBeLessThan(initialCount);

    // -- Step 2: Reset returns the defaults and the unfiltered list --
    await directoryPage.resetFilters();
    await expect(directoryPage.jobTitleDropdown).toContainText(
      directoryData.messages.defaultSelect,
    );
    await expect(directoryPage.recordsFoundText).toHaveText(`(${initialCount}) Records Found`);
  });
});

// ─── P0: access control ─────────────────────────────────────────────────────
test.describe('Directory — access control', () => {
  test('TC-DIR-200 — Unauthenticated deep link redirects to the login page', async ({
    directoryPage,
    page,
  }) => {
    await page.context().clearCookies();
    await directoryPage.goto(directoryData.routes.view);

    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
    await expect(directoryPage.directoryCards).toHaveCount(0);
  });

  test('TC-DIR-202 — ESS user sees the Directory menu and the full employee list', async ({
    loginPage,
    directoryPage,
  }) => {
    await loginPage.loginWithCredentials(
      frontend.auth.essTestUser.username,
      frontend.auth.essTestUser.password,
    );

    // Folds TC-503: Directory is part of the default ESS menu
    await expect(directoryPage.mainMenuItem('Directory')).toBeVisible();

    // The corporate directory is org-wide: an ESS user sees co-workers, not just self
    await directoryPage.gotoDirectory();
    await expect(directoryPage.pageHeading).toBeVisible();
    expect(await directoryPage.recordsFoundCount()).toBeGreaterThan(1);
    await expect(directoryPage.cardByName(SUITE_EMPLOYEE_FULL_NAME)).toBeVisible();
  });
});
