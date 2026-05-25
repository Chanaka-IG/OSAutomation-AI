import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { CandidatesApi } from '../../src/api/orangehrmOSAPI/CandidatesApi';
import { VacanciesApi } from '../../src/api/orangehrmOSAPI/VacanciesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for Candidates List & Filters — P0 (release-blocking) and P1 (high business impact).
 * Covers: TC-001, 002, 003, 004, 005, 006, 007, 100, 102, 104, 105,
 *         200, 201, 202, 300, 301, 504, 505, 506
 *
 * Run:
 *   npx playwright test tests/recruitment/candidates-list.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

// ─── Suite-level state ──────────────────────────────────────────────────────
const createdCandidateIds: number[] = [];
const createdVacancyIds: number[] = [];

const ACTIVE_VACANCY_NAME = 'CL Test Suite Active';
const CLOSED_VACANCY_NAME = 'CL Test Suite Closed';

const KEYWORD_CANDIDATE = { firstName: 'CLKeyword', lastName: 'Test' };
const DATE_CANDIDATE = { firstName: 'CLDateRange', lastName: 'Test' };
const DELETE_CANDIDATE = { firstName: 'CLDelete', lastName: 'Candidate' };

const TEST_KEYWORD = 'cl-automation-filter';
const SPECIFIC_DATE = '2024-06-15';

const ESS_TEST_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };
const JOB_TITLE = frontend.recruitment.masterData.jobTitle;

let activeVacancyId = 0;
let jobTitleId = 0;
let hiringManagerEmpNumber = 0;
let deleteCandidateId = 0;

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
  if (!empNumber) throw new Error('Hiring manager (employeeId=0002) missing — run seed-master-data first');
  hiringManagerEmpNumber = empNumber;

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  const base = { jobTitleId, hiringManagerId: hiringManagerEmpNumber, numOfPositions: 3 };

  activeVacancyId = await vacanciesApi.createIfAbsent({
    ...base,
    name: ACTIVE_VACANCY_NAME,
    status: true,
    isPublished: true,
  });
  createdVacancyIds.push(activeVacancyId);

  const closedId = await vacanciesApi.createIfAbsent({
    ...base,
    name: CLOSED_VACANCY_NAME,
    status: false,
    isPublished: false,
  });
  createdVacancyIds.push(closedId);

  const candidatesApi = new CandidatesApi(orangehrmAdminApi.request);
  const today = new Date().toISOString().split('T')[0];

  // Keyword candidate — for TC-004 keyword filter
  const kwId = await candidatesApi.create({
    firstName: KEYWORD_CANDIDATE.firstName,
    lastName: KEYWORD_CANDIDATE.lastName,
    email: `cl.keyword.${Date.now()}@example.com`,
    vacancyId: activeVacancyId,
    dateOfApplication: today,
    keywords: TEST_KEYWORD,
    consentToKeepData: true,
  });
  createdCandidateIds.push(kwId);

  // Date-range candidate — for TC-100
  const drId = await candidatesApi.create({
    firstName: DATE_CANDIDATE.firstName,
    lastName: DATE_CANDIDATE.lastName,
    email: `cl.daterange.${Date.now()}@example.com`,
    vacancyId: activeVacancyId,
    dateOfApplication: SPECIFIC_DATE,
    consentToKeepData: true,
  });
  createdCandidateIds.push(drId);

  // Delete candidate — for TC-504, TC-505, TC-506
  deleteCandidateId = await candidatesApi.create({
    firstName: DELETE_CANDIDATE.firstName,
    lastName: DELETE_CANDIDATE.lastName,
    email: `cl.delete.${Date.now()}@example.com`,
    vacancyId: activeVacancyId,
    dateOfApplication: today,
    consentToKeepData: true,
  });
  createdCandidateIds.push(deleteCandidateId);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();

  if (createdCandidateIds.length > 0) {
    const candidatesApi = new CandidatesApi(orangehrmAdminApi.request);
    await candidatesApi.deleteCandidates(createdCandidateIds);
  }

  if (createdVacancyIds.length > 0) {
    const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
    await vacanciesApi.deleteVacancies(createdVacancyIds);
  }
});

// ─── P0: Security — Unauthenticated access ───────────────────────────────────
// Runs before any browser login; the API beforeAll uses a separate request context.
test.describe('Security — Unauthenticated access', () => {
  test('TC-REC-CL-200 — Unauthenticated user accessing candidates URL is redirected to login', async ({
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.candidates, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/auth\/login/i);
  });
});

// ─── Admin — core list / filter tests ─────────────────────────────────────────
test.describe('Admin — Candidates List', () => {
  /**
   * Reuse admin session cookie across tests.
   * If the session has expired or a different user is active, re-authenticate.
   */
  test.beforeEach(async ({ loginPage, candidatesListPage, page }) => {
    await page.goto(frontend.recruitment.routes.candidates, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    if (page.url().includes('/auth/login')) {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin@OHRM123');
      await loginPage.loginButton.click();
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
        waitUntil: 'domcontentloaded',
      });
      await candidatesListPage.gotoCandidatesList();
    } else {
      await candidatesListPage.waitUntilTableLoaderDissapear();
    }
  });

  // ── P0: Page load ────────────────────────────────────────────────────────

  test('TC-REC-CL-001 — Candidates list page loads with records and correct columns', async ({
    candidatesListPage,
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Candidates' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Vacancy' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Candidate' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hiring Manager' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date of Application' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

    await expect(candidatesListPage.tableRows.first()).toBeVisible();
    await expect(candidatesListPage.recordCountText).toBeVisible();
  });

  // ── P0: Add navigation ────────────────────────────────────────────────────

  test('TC-REC-CL-006 — Add button navigates to Add Candidate page', async ({
    candidatesListPage,
    page,
  }) => {
    await candidatesListPage.addButton.click();
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);
  });

  // ── P0: Edit navigation ───────────────────────────────────────────────────

  test('TC-REC-CL-007 — Edit button navigates to candidate profile', async ({
    candidatesListPage,
    page,
  }) => {
    const candidateName = `${KEYWORD_CANDIDATE.firstName} ${KEYWORD_CANDIDATE.lastName}`;
    await candidatesListPage.clickEditForRow(candidateName);
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);
  });

  // ── P1: Filter by Vacancy ─────────────────────────────────────────────────

  test('TC-REC-CL-002 — Filter by Vacancy returns only candidates for that vacancy', async ({
    candidatesListPage,
  }) => {
    await candidatesListPage.selectVacancyFilter(ACTIVE_VACANCY_NAME);
    await candidatesListPage.search();

    await expect(candidatesListPage.tableRows.first()).toBeVisible();
    const rows = candidatesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(candidatesListPage.getVacancyCell(rows.nth(i))).toContainText(ACTIVE_VACANCY_NAME);
    }
  });

  // ── P1: Filter by Status ──────────────────────────────────────────────────

  test('TC-REC-CL-003 — Filter by Status returns only candidates with that status', async ({
    candidatesListPage,
  }) => {
    await candidatesListPage.selectStatusFilter('Application Initiated');
    await candidatesListPage.search();

    await expect(candidatesListPage.tableRows.first()).toBeVisible();
    const rows = candidatesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(candidatesListPage.getStatusCell(rows.nth(i))).toContainText('Application Initiated');
    }
  });

  // ── P1: Filter by Keywords ────────────────────────────────────────────────

  test('TC-REC-CL-004 — Filter by Keywords returns only matching candidates', async ({
    candidatesListPage,
  }) => {
    await candidatesListPage.fillKeywordsFilter(TEST_KEYWORD);
    await candidatesListPage.search();

    const keywordCandidateFullName = `${KEYWORD_CANDIDATE.firstName} ${KEYWORD_CANDIDATE.lastName}`;
    await expect(
      candidatesListPage.tableRows.filter({ hasText: keywordCandidateFullName }),
    ).toBeVisible();

    // Date-range candidate (no keyword) must not appear
    await expect(
      candidatesListPage.tableRows.filter({ hasText: DATE_CANDIDATE.firstName }),
    ).toHaveCount(0);
  });

  // ── P1: Reset ─────────────────────────────────────────────────────────────

  test('TC-REC-CL-005 — Reset clears all filters and restores full list', async ({
    candidatesListPage,
  }) => {
    const initialCount = await candidatesListPage.getRecordCount();

    await candidatesListPage.fillKeywordsFilter(TEST_KEYWORD);
    await candidatesListPage.search();

    const filteredCount = await candidatesListPage.getRecordCount();
    expect(filteredCount).toBeLessThan(initialCount);

    await candidatesListPage.reset();

    const restoredCount = await candidatesListPage.getRecordCount();
    expect(restoredCount).toBe(initialCount);
  });

  // ── P1: Date range filter ─────────────────────────────────────────────────

  test('TC-REC-CL-100 — Date range filter returns candidates within the specified range', async ({
    candidatesListPage,
  }) => {
    // Only CLDateRange Test has dateOfApplication = 2024-06-15 — others were created today
    await candidatesListPage.fillDateRange('2024-06-01', '2024-06-30');
    await candidatesListPage.search();

    const dateCandidateFullName = `${DATE_CANDIDATE.firstName} ${DATE_CANDIDATE.lastName}`;
    await expect(
      candidatesListPage.tableRows.filter({ hasText: dateCandidateFullName }),
    ).toBeVisible();

    // Keyword candidate (applied today) must not appear in the 2024-06 range
    await expect(
      candidatesListPage.tableRows.filter({ hasText: KEYWORD_CANDIDATE.firstName }),
    ).toHaveCount(0);
  });

  // ── P1: Vacancy dropdown shows only active vacancies ─────────────────────

  test('TC-REC-CL-102 — Vacancy filter dropdown shows active vacancy but not closed vacancy', async ({
    candidatesListPage,
    page,
  }) => {
    await candidatesListPage.vacancyFilterGroup.locator('.oxd-select-text').click();

    await expect(
      page.getByRole('option', { name: ACTIVE_VACANCY_NAME, exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole('option', { name: CLOSED_VACANCY_NAME, exact: true }),
    ).not.toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');
  });

  // ── P1: Combined filters ──────────────────────────────────────────────────

  test('TC-REC-CL-104 — Combined Vacancy + Status filter narrows results correctly', async ({
    candidatesListPage,
  }) => {
    await candidatesListPage.selectVacancyFilter(ACTIVE_VACANCY_NAME);
    await candidatesListPage.selectStatusFilter('Application Initiated');
    await candidatesListPage.search();

    await expect(candidatesListPage.tableRows.first()).toBeVisible();
    const rows = candidatesListPage.tableRows;
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(candidatesListPage.getVacancyCell(rows.nth(i))).toContainText(ACTIVE_VACANCY_NAME);
      await expect(candidatesListPage.getStatusCell(rows.nth(i))).toContainText('Application Initiated');
    }
  });

  // ── P1: Record count reflects filtered results ────────────────────────────

  test('TC-REC-CL-105 — Record count banner updates after applying a filter', async ({
    candidatesListPage,
  }) => {
    const initialCount = await candidatesListPage.getRecordCount();

    await candidatesListPage.fillKeywordsFilter(TEST_KEYWORD);
    await candidatesListPage.search();

    const filteredCount = await candidatesListPage.getRecordCount();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThanOrEqual(1);
  });

  // ── P1: No-match empty state ──────────────────────────────────────────────

  test('TC-REC-CL-300 — No-match filter shows "No Records Found" empty state', async ({
    candidatesListPage,
  }) => {
    await candidatesListPage.fillKeywordsFilter('no-match-guaranteed-xyz-123');
    await candidatesListPage.search();

    await expect(candidatesListPage.noRecordsText).toBeVisible();
    await expect(candidatesListPage.tableRows).toHaveCount(0);
  });

  // ── P1: No filters → all candidates ──────────────────────────────────────

  test('TC-REC-CL-301 — Searching with no filters returns all candidates', async ({
    candidatesListPage,
  }) => {
    // Click Search without setting any filter — should return everything
    await candidatesListPage.search();

    const count = await candidatesListPage.getRecordCount();
    // At least the 3 candidates we seeded must be present
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── P1: Delete dialog appears ─────────────────────────────────────────────

  test('TC-REC-CL-504 — Clicking delete shows confirmation dialog', async ({
    candidatesListPage,
    page,
  }) => {
    const deleteName = `${DELETE_CANDIDATE.firstName} ${DELETE_CANDIDATE.lastName}`;
    await candidatesListPage.clickDeleteForRow(deleteName);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(candidatesListPage.confirmDeleteButton).toBeVisible();
    await expect(candidatesListPage.cancelDeleteButton).toBeVisible();

    // Clean up — cancel so the row stays for TC-505 and TC-506
    await candidatesListPage.cancelDeleteButton.click();
  });

  // ── P1: Cancel delete → candidate remains ────────────────────────────────

  test('TC-REC-CL-505 — Cancelling delete confirmation leaves candidate in the list', async ({
    candidatesListPage,
  }) => {
    const deleteName = `${DELETE_CANDIDATE.firstName} ${DELETE_CANDIDATE.lastName}`;
    await candidatesListPage.clickDeleteForRow(deleteName);
    await candidatesListPage.cancelDeleteButton.click();

    await expect(
      candidatesListPage.tableRows.filter({ hasText: deleteName }),
    ).toBeVisible();
  });

  // ── P0: Confirm delete removes candidate (destructive — runs last) ────────

  test('TC-REC-CL-506 — Confirming delete removes candidate from the list', async ({
    candidatesListPage,
  }) => {
    const deleteName = `${DELETE_CANDIDATE.firstName} ${DELETE_CANDIDATE.lastName}`;
    await candidatesListPage.clickDeleteForRow(deleteName);
    await candidatesListPage.confirmDeleteButton.click();
    await candidatesListPage.waitUntilTableLoaderDissapear();

    await expect(
      candidatesListPage.tableRows.filter({ hasText: deleteName }),
    ).toHaveCount(0);

    // Remove from cleanup list — already deleted
    const idx = createdCandidateIds.indexOf(deleteCandidateId);
    if (idx > -1) createdCandidateIds.splice(idx, 1);
  });
});

// ─── Security — ESS role (runs last; explicitly logs out admin session) ───────
test.describe('Security — ESS user cannot access Recruitment', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    await page.goto('/web/index.php/auth/logout', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await loginPage.usernameInput.fill(ESS_TEST_USER.username);
    await loginPage.passwordInput.fill(ESS_TEST_USER.password);
    await loginPage.loginButton.click();
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  });

  test('TC-REC-CL-201 — ESS user has no Recruitment item in side navigation', async ({ page }) => {
    await expect(
      page.locator('.oxd-main-menu-item').filter({ hasText: 'Recruitment' }),
    ).toHaveCount(0);
  });

  test('TC-REC-CL-202 — ESS user accessing candidates URL directly sees no Add/Edit/Delete controls', async ({
    candidatesListPage,
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.candidates, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible({ timeout: 5_000 });

    const rows = candidatesListPage.tableRows;
    const rowCount = await rows.count();
    if (rowCount > 0) {
      await expect(rows.first().locator('.oxd-icon-button')).toHaveCount(0);
    }
  });
});
