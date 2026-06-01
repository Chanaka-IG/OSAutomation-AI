import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { VacanciesApi } from '../../src/api/orangehrmOSAPI/VacanciesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for Vacancies List & Filter — P0 (release-blocking) and P1 (high business impact).
 * Covers: TC-001, TC-002, TC-003, TC-004, TC-005, TC-006, TC-009, TC-010, TC-011, TC-012,
 *         TC-018, TC-200, TC-201, TC-202, TC-300, TC-302, TC-501, TC-505
 *
 * Run:
 *   npx playwright test tests/recruitment/vacancies-list.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

// ─── Suite-level state ──────────────────────────────────────────────────────
const createdVacancyIds: number[] = [];

const ACTIVE_VACANCY_NAME = 'VL Test Suite Active';
const CLOSED_VACANCY_NAME = 'VL Test Suite Closed';
const DELETE_VACANCY_NAME = 'VL Test Suite Delete';
const BULK_A_VACANCY_NAME = 'VL Test Suite Bulk A';
const BULK_B_VACANCY_NAME = 'VL Test Suite Bulk B';

/** Env-overridable seeded ESS user (centralized in test-data/auth). */
const ESS_TEST_USER = frontend.auth.essTestUser;
const JOB_TITLE = frontend.recruitment.masterData.jobTitle;
/** Display name shown in the Hiring Manager filter dropdown on the vacancies list page. */
const HIRING_MANAGER_FILTER_NAME = frontend.recruitment.masterData.hiringManagerDisplayName;

let jobTitleId = 0;
let hiringManagerEmpNumber = 0;

// ─── Suite setup / teardown ─────────────────────────────────────────────────

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();

  const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
  const found = await jobTitlesApi.getIdByTitle(JOB_TITLE);
  if (!found) throw new Error(`"${JOB_TITLE}" job title missing — run seed-master-data first`);
  jobTitleId = found;

  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  const empNumber = await employeesApi.getEmpNumberByEmployeeId('0002');
  if (!empNumber) throw new Error('Hiring manager employee (employeeId=0002) missing — run seed-master-data first');
  hiringManagerEmpNumber = empNumber;

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  const base = { jobTitleId, hiringManagerId: hiringManagerEmpNumber, numOfPositions: 1 };

  const activeId = await vacanciesApi.createIfAbsent({ ...base, name: ACTIVE_VACANCY_NAME, status: true });
  createdVacancyIds.push(activeId);

  const closedId = await vacanciesApi.createIfAbsent({ ...base, name: CLOSED_VACANCY_NAME, status: false });
  createdVacancyIds.push(closedId);

  const deleteId = await vacanciesApi.createIfAbsent({ ...base, name: DELETE_VACANCY_NAME, status: true });
  createdVacancyIds.push(deleteId);

  const bulkAId = await vacanciesApi.createIfAbsent({ ...base, name: BULK_A_VACANCY_NAME, status: true });
  createdVacancyIds.push(bulkAId);

  const bulkBId = await vacanciesApi.createIfAbsent({ ...base, name: BULK_B_VACANCY_NAME, status: true });
  createdVacancyIds.push(bulkBId);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdVacancyIds.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  await vacanciesApi.deleteVacancies(createdVacancyIds);
});

// ─── P0: Security — unauthenticated access ────────────────────────────────
// Each test gets a fresh, unauthenticated page context; no beforeEach login needed.
test.describe('TC-200 — Unauthenticated access', () => {
  test('TC-200 — Unauthenticated user accessing vacancies URL is redirected to login', async ({ page }) => {
    await page.goto(frontend.recruitment.routes.vacancies, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });
});

// ─── P0: Security — ESS role ──────────────────────────────────────────────
test.describe('Security — ESS user cannot access Recruitment', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
    await loginPage.login(ESS_TEST_USER.username, ESS_TEST_USER.password);
    await loginPage.page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  });

  test('TC-201 — ESS user has no Recruitment item in side navigation', async ({ loginPage }) => {
    await expect(loginPage.mainMenuItem('Recruitment')).toHaveCount(0);
  });

  test('TC-202 — ESS user accessing vacancies URL directly sees no management controls', async ({
    page,
    vacanciesListPage,
  }) => {
    await page.goto(frontend.recruitment.routes.vacancies, { waitUntil: 'domcontentloaded' });

    // ESS has no Recruitment data-group access (business-rules: ESS sees only
    // My Info/Leave/Time/Performance/Directory/Dashboard/Buzz). Whether the app
    // redirects away or renders a forbidden page, neither the admin "Add" control
    // nor any per-row Edit/Delete icons may exist. Asserted unconditionally with
    // toHaveCount(0) so the test cannot pass by silently matching zero rows.
    await expect(vacanciesListPage.addButton).toHaveCount(0);
    await expect(vacanciesListPage.rowActionIcons).toHaveCount(0);
  });
});

// ─── Admin: Page load, filters, navigation, CRUD ─────────────────────────
test.describe('Admin — Vacancies List', () => {
  test.beforeEach(async ({ loginPage, vacanciesListPage }) => {
    await loginPage.loginAs('admin');
    await vacanciesListPage.gotoVacanciesList();
  });

  // ── P0: Page load ──────────────────────────────────────────────────────

  test('TC-001 — Vacancies list page loads with all records and correct columns', async ({
    vacanciesListPage,
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Vacancies' })).toBeVisible();

    // All five column headers present
    await expect(page.getByRole('columnheader', { name: 'Vacancy' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Job Title' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hiring Manager' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

    // At least one row visible and count banner shown
    await expect(vacanciesListPage.tableRows.first()).toBeVisible();
    await expect(vacanciesListPage.recordCountText).toBeVisible();
  });

  // ── P1: Filter by Job Title ────────────────────────────────────────────

  test('TC-002 — Filter by Job Title returns only matching vacancies', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectJobTitleFilter(JOB_TITLE);
    await vacanciesListPage.search();

    await expect(vacanciesListPage.tableRows.first()).toBeVisible();
    const rows = vacanciesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      // Job Title is the 3rd cell (index 2): checkbox(0), vacancy(1), job title(2)
      await expect(rows.nth(i).getByRole('cell').nth(2)).toContainText(JOB_TITLE);
    }
  });

  // ── P1: Filter by Vacancy name ─────────────────────────────────────────

  test('TC-003 — Filter by specific Vacancy name returns exact match', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectVacancyFilter(ACTIVE_VACANCY_NAME);
    await vacanciesListPage.search();

    await expect(vacanciesListPage.tableRows).toHaveCount(1);
    await expect(vacanciesListPage.tableRows.first()).toContainText(ACTIVE_VACANCY_NAME);
  });

  // ── P1: Filter by Hiring Manager ──────────────────────────────────────

  test('TC-004 — Filter by Hiring Manager returns only their vacancies', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectHiringManagerFilter(HIRING_MANAGER_FILTER_NAME);
    await vacanciesListPage.search();

    await expect(vacanciesListPage.tableRows.first()).toBeVisible();
    const rows = vacanciesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(HIRING_MANAGER_FILTER_NAME);
    }
  });

  // ── P1: Status "Active" filter ────────────────────────────────────────

  test('TC-005 — Status "Active" filter shows only active vacancies', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectStatusFilter('Active');
    await vacanciesListPage.search();

    await expect(vacanciesListPage.tableRows.first()).toBeVisible();
    const rows = vacanciesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(vacanciesListPage.getStatusCell(rows.nth(i))).toContainText('Active');
    }
  });

  // ── P1: Status "Closed" filter ────────────────────────────────────────

  test('TC-006 — Status "Closed" filter shows only closed vacancies', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectStatusFilter('Closed');
    await vacanciesListPage.search();

    await expect(vacanciesListPage.tableRows.filter({ hasText: CLOSED_VACANCY_NAME })).toBeVisible();
    const rows = vacanciesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(vacanciesListPage.getStatusCell(rows.nth(i))).toContainText('Closed');
    }
  });

  // ── P1: Add navigation ─────────────────────────────────────────────────

  test('TC-012 — Add button navigates to Add Vacancy page', async ({
    vacanciesListPage,
    page,
  }) => {
    await vacanciesListPage.addButton.click();
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);
  });

  // ── P1: Edit navigation ────────────────────────────────────────────────

  test('TC-010 — Edit button navigates to the correct Edit Vacancy page', async ({
    vacanciesListPage,
    page,
  }) => {
    await vacanciesListPage.clickEditForRow(ACTIVE_VACANCY_NAME);
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.editVacancy);
  });

  // ── P1: No-match empty state ───────────────────────────────────────────

  test('TC-300 — Filter with no match shows "No Records Found" empty state', async ({
    vacanciesListPage,
  }) => {
    // Combine: Status = Closed AND Vacancy = ACTIVE_VACANCY_NAME (which is Active) → 0 results
    await vacanciesListPage.selectStatusFilter('Closed');
    await vacanciesListPage.selectVacancyFilter(ACTIVE_VACANCY_NAME);
    await vacanciesListPage.search();

    await expect(vacanciesListPage.noRecordsText).toBeVisible();
  });

  // ── P1: Cancel delete ──────────────────────────────────────────────────

  test('TC-302 — Cancel delete confirmation leaves vacancy unchanged', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.clickDeleteForRow(ACTIVE_VACANCY_NAME);
    await vacanciesListPage.cancelDeleteButton.click();

    await expect(vacanciesListPage.tableRows.filter({ hasText: ACTIVE_VACANCY_NAME })).toBeVisible();
  });

  // ── P1: Record counter updates ─────────────────────────────────────────

  test('TC-501 — Record count updates after each Search action', async ({
    vacanciesListPage,
  }) => {
    const initialCount = await vacanciesListPage.getRecordCount();

    await vacanciesListPage.selectStatusFilter('Closed');
    await vacanciesListPage.search();

    const closedCount = await vacanciesListPage.getRecordCount();
    expect(closedCount).toBeLessThan(initialCount);
  });

  // ── P1: Closed label ──────────────────────────────────────────────────

  test('TC-505 — Closed vacancy shows label "Closed" (not "false" or "Inactive")', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.selectStatusFilter('Closed');
    await vacanciesListPage.search();

    const closedRow = vacanciesListPage.tableRows.filter({ hasText: CLOSED_VACANCY_NAME });
    await expect(closedRow).toBeVisible();
    const statusCell = vacanciesListPage.getStatusCell(closedRow);
    await expect(statusCell).toContainText('Closed');
    await expect(statusCell).not.toContainText('false');
    await expect(statusCell).not.toContainText('Inactive');
  });

  // ── P1: Reset ─────────────────────────────────────────────────────────

  test('TC-009 — Reset clears all filters and restores full list', async ({
    vacanciesListPage,
  }) => {
    const initialCount = await vacanciesListPage.getRecordCount();

    await vacanciesListPage.selectStatusFilter('Closed');
    await vacanciesListPage.search();

    const filteredCount = await vacanciesListPage.getRecordCount();
    expect(filteredCount).toBeLessThan(initialCount);

    await vacanciesListPage.reset();

    const restoredCount = await vacanciesListPage.getRecordCount();
    expect(restoredCount).toBe(initialCount);
  });

  // ── P0: Delete (destructive — runs after all non-destructive tests) ────

  test('TC-011 — Delete button → confirm → vacancy removed from list', async ({
    vacanciesListPage,
  }) => {
    await vacanciesListPage.clickDeleteForRow(DELETE_VACANCY_NAME);
    await vacanciesListPage.confirmDeleteButton.click();
    await vacanciesListPage.waitUntilTableLoaderDissapear();

    await expect(
      vacanciesListPage.tableRows.filter({ hasText: DELETE_VACANCY_NAME }),
    ).toHaveCount(0);
  });

  // ── P1: Bulk delete (destructive — runs after all non-destructive tests) ──

  test('TC-018 — Bulk delete selected vacancies removes them from the list', async ({
    vacanciesListPage,
  }) => {
    // -- Step 1: Select both bulk-delete vacancies --
    await vacanciesListPage.selectRowCheckbox(BULK_A_VACANCY_NAME);
    await vacanciesListPage.selectRowCheckbox(BULK_B_VACANCY_NAME);

    // -- Step 2: Click Delete Selected and confirm --
    await vacanciesListPage.deleteSelectedButton.click();
    await vacanciesListPage.confirmDeleteButton.click();
    await vacanciesListPage.waitUntilTableLoaderDissapear();

    // -- Step 3: Verify both vacancies are gone --
    await expect(
      vacanciesListPage.tableRows.filter({ hasText: BULK_A_VACANCY_NAME }),
    ).toHaveCount(0);
    await expect(
      vacanciesListPage.tableRows.filter({ hasText: BULK_B_VACANCY_NAME }),
    ).toHaveCount(0);
  });
});
