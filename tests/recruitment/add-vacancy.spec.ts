import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { VacanciesApi } from '../../src/api/orangehrmOSAPI/VacanciesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for Add Vacancy — P0 (release-blocking) and P1 (primary feature path).
 * Covers: TC-REC-AV-001, 002, 007, 100, 101, 103, 106, 200, 201, 205, 300, 301, 302, 303, 310, 504
 *
 * Run:
 *   npx playwright test tests/recruitment/add-vacancy.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

// ─── Suite-level state ──────────────────────────────────────────────────────
const createdVacancyIds: number[] = [];

/** Pre-seeded duplicate vacancy for TC-103 uniqueness test and TC-007 appearance test. */
const DUPLICATE_VACANCY_NAME = 'Vacancy Test Suite Duplicate';

/** Closed vacancy for TC-106 candidate dropdown test. */
const CLOSED_VACANCY_NAME = 'Vacancy Test Suite Closed';

/**
 * ESS user seeded as master data (`adminUsers.seedRecords`).
 * empNumber=2 (Marcus Chen), userRoleId=2 (ESS), status=true.
 */
const ESS_TEST_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };

/** Job title from master data. */
const JOB_TITLE = 'QA Engineer';

/** Hiring manager from master data (employeeId='0002'). */
const HIRING_MANAGER = { query: 'Marcus', fullName: 'Marcus James Chen' };

// Resolved at runtime in beforeAll
let jobTitleId = 0;
let hiringManagerEmpNumber = 0;

// ─── Suite setup / teardown ─────────────────────────────────────────────────

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();

  // Resolve job title ID from master data
  const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
  const found = await jobTitlesApi.getIdByTitle(JOB_TITLE);
  if (!found) throw new Error(`"${JOB_TITLE}" job title missing — run seed-master-data first`);
  jobTitleId = found;

  // Resolve hiring manager empNumber from master data
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  const empNumber = await employeesApi.getEmpNumberByEmployeeId('0002');
  if (!empNumber) throw new Error('Hiring manager employee (id=0002) missing — run seed-master-data first');
  hiringManagerEmpNumber = empNumber;

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);

  // TC-103 / TC-007: active vacancy that already exists
  const duplicateId = await vacanciesApi.createIfAbsent({
    name: DUPLICATE_VACANCY_NAME,
    jobTitleId,
    hiringManagerId: hiringManagerEmpNumber,
    numOfPositions: 1,
    isPublished: true,
    status: true,
  });
  createdVacancyIds.push(duplicateId);

  // TC-106: closed vacancy (status=false)
  const closedId = await vacanciesApi.createIfAbsent({
    name: CLOSED_VACANCY_NAME,
    jobTitleId,
    hiringManagerId: hiringManagerEmpNumber,
    numOfPositions: 1,
    isPublished: false,
    status: false,
  });
  createdVacancyIds.push(closedId);
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdVacancyIds.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  await vacanciesApi.deleteVacancies(createdVacancyIds);
});

// ─── Admin — core add-vacancy tests ────────────────────────────────────────
test.describe('Admin — Add Vacancy form', () => {
  test.beforeEach(async ({ loginPage, addVacancyPage }) => {
    await loginPage.loginAs('admin');
    await addVacancyPage.gotoAddVacancy();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-REC-AV-001 — Add vacancy with required fields only saves successfully', async ({
    addVacancyPage,
    page,
  }) => {
    const vacancyName = `QA Vacancy ${Date.now()}`;

    await addVacancyPage.fillForm({
      name: vacancyName,
      jobTitle: JOB_TITLE,
      hiringManagerQuery: HIRING_MANAGER.query,
      hiringManagerName: HIRING_MANAGER.fullName,
      numPositions: '1',
    });

    await addVacancyPage.saveVacancy();

    // Save redirected to /addJobVacancy/{id} — extract ID for afterAll cleanup
    const createdId = addVacancyPage.getCreatedVacancyId();
    if (createdId) createdVacancyIds.push(createdId);

    // Verify vacancy visible in the list
    await addVacancyPage.gotoVacanciesList();
    const row = await addVacancyPage.findVacancyInList(vacancyName);
    await expect(row.first()).toBeVisible();
  });

  test('TC-REC-AV-205 — XSS probe in Vacancy Name does not execute as script', async ({
    addVacancyPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const xssPayload = `<script>alert('xss')</script>`;
    await addVacancyPage.vacancyNameInput.fill(xssPayload);
    await addVacancyPage.selectJobTitle(JOB_TITLE);
    await addVacancyPage.selectHiringManager(HIRING_MANAGER.query, HIRING_MANAGER.fullName);
    await addVacancyPage.saveButton.click();

    // Allow any deferred scripts to settle without an arbitrary sleep
    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    // If save succeeded (redirected to edit page), track the ID and verify no unescaped script
    if (/addJobVacancy\/\d+/.test(page.url())) {
      const createdId = addVacancyPage.getCreatedVacancyId();
      if (createdId) createdVacancyIds.push(createdId);

      const scriptNodes = await page
        .locator('script:not([src])')
        .evaluateAll((els) =>
          els.map((el) => el.textContent ?? '').filter((t) => t.includes('alert')),
        );
      expect(scriptNodes).toHaveLength(0);
    }
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-REC-AV-002 — Add vacancy with all fields populated saves successfully', async ({
    addVacancyPage,
    page,
  }) => {
    const vacancyName = `Full Vacancy ${Date.now()}`;

    await addVacancyPage.vacancyNameInput.fill(vacancyName);
    await addVacancyPage.selectJobTitle(JOB_TITLE);
    await addVacancyPage.descriptionInput.fill('Senior QA Engineer role requiring 3+ years of automation experience.');
    await addVacancyPage.selectHiringManager(HIRING_MANAGER.query, HIRING_MANAGER.fullName);
    await addVacancyPage.numPositionsInput.fill('3');

    // Active and Publish are ON by default — leave as-is

    await addVacancyPage.saveVacancy();

    // Save redirected to /addJobVacancy/{id} — extract ID for afterAll cleanup
    const createdId = addVacancyPage.getCreatedVacancyId();
    if (createdId) createdVacancyIds.push(createdId);

    // Verify vacancy appears in list
    await addVacancyPage.gotoVacanciesList();
    const row = await addVacancyPage.findVacancyInList(vacancyName);
    await expect(row.first()).toBeVisible();
  });

  test('TC-REC-AV-100 — Job Title field is a constrained OXD dropdown (not free-text)', async ({
    addVacancyPage,
    page,
  }) => {
    // The Job Title input must be an OXD dropdown trigger, not a text input
    await expect(addVacancyPage.jobTitleGroup.locator('.oxd-select-text')).toBeVisible();
    await expect(addVacancyPage.jobTitleGroup.locator('input.oxd-input')).toHaveCount(0);

    // Opening the dropdown reveals the seeded job titles
    await addVacancyPage.jobTitleGroup.locator('.oxd-select-text').click();
    await expect(page.getByRole('option', { name: JOB_TITLE, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Software Engineer', exact: true })).toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');
  });

  test('TC-REC-AV-101 — Hiring Manager autocomplete shows only employees', async ({
    addVacancyPage,
    page,
  }) => {
    await addVacancyPage.hiringManagerInput.fill(HIRING_MANAGER.query);

    const dropdown = page.locator('.oxd-autocomplete-dropdown');
    await expect(dropdown).toBeVisible();

    // Marcus Chen (seeded employee empNumber=0002) must appear
    await expect(page.getByRole('option', { name: HIRING_MANAGER.fullName })).toBeVisible();
  });

  test('TC-REC-AV-103 — Duplicate Vacancy Name shows error; stays on form', async ({
    addVacancyPage,
    page,
  }) => {
    await addVacancyPage.fillForm({
      name: DUPLICATE_VACANCY_NAME,
      jobTitle: JOB_TITLE,
      hiringManagerQuery: HIRING_MANAGER.query,
      hiringManagerName: HIRING_MANAGER.fullName,
      numPositions: '1',
    });

    await addVacancyPage.saveButton.click();

    // Form stays on the add page — not redirected
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);

    // Error is surfaced (inline field error or error toast)
    const errorLocator = page.locator(
      '.oxd-input-field-error-message, .oxd-toast--error, .oxd-alert-content-text',
    );
    await expect(errorLocator.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── P1 — required-field validation ──────────────────────────────────────

  test('TC-REC-AV-300 — Empty form shows Required on all three mandatory fields', async ({
    addVacancyPage,
    page,
  }) => {
    await addVacancyPage.saveButton.click();

    // URL must not change
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);

    // All three required-field errors are visible
    const errors = addVacancyPage.allValidationErrors;
    await expect(errors.first()).toBeVisible();
    expect(await errors.count()).toBeGreaterThanOrEqual(3);
  });

  test('TC-REC-AV-301 — Missing Vacancy Name shows Required error', async ({
    addVacancyPage,
    page,
  }) => {
    // Fill everything except name
    await addVacancyPage.selectJobTitle(JOB_TITLE);
    await addVacancyPage.selectHiringManager(HIRING_MANAGER.query, HIRING_MANAGER.fullName);
    await addVacancyPage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);

    const nameError = addVacancyPage
      .page.locator('.oxd-input-group')
      .filter({ hasText: 'Vacancy Name' })
      .locator('.oxd-input-field-error-message');
    await expect(nameError).toBeVisible();
    await expect(nameError).toContainText('Required');
  });

  test('TC-REC-AV-302 — Missing Job Title shows Required error', async ({
    addVacancyPage,
    page,
  }) => {
    // Fill everything except Job Title
    await addVacancyPage.vacancyNameInput.fill(`Job Title Missing ${Date.now()}`);
    await addVacancyPage.selectHiringManager(HIRING_MANAGER.query, HIRING_MANAGER.fullName);
    await addVacancyPage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);

    const jtError = addVacancyPage
      .page.locator('.oxd-input-group')
      .filter({ hasText: 'Job Title' })
      .locator('.oxd-input-field-error-message');
    await expect(jtError).toBeVisible();
    await expect(jtError).toContainText('Required');
  });

  test('TC-REC-AV-303 — Missing Hiring Manager shows Required error', async ({
    addVacancyPage,
    page,
  }) => {
    // Fill everything except Hiring Manager
    await addVacancyPage.vacancyNameInput.fill(`HM Missing ${Date.now()}`);
    await addVacancyPage.selectJobTitle(JOB_TITLE);
    await addVacancyPage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addVacancy);

    const hmError = addVacancyPage
      .page.locator('.oxd-input-group')
      .filter({ hasText: 'Hiring Manager' })
      .locator('.oxd-input-field-error-message');
    await expect(hmError).toBeVisible();
    await expect(hmError).toContainText('Required');
  });

  test('TC-REC-AV-310 — Cancel returns to Vacancies list; no record is created', async ({
    addVacancyPage,
    page,
  }) => {
    const vacancyName = `Should Not Exist ${Date.now()}`;

    await addVacancyPage.fillForm({
      name: vacancyName,
      jobTitle: JOB_TITLE,
      hiringManagerQuery: HIRING_MANAGER.query,
      hiringManagerName: HIRING_MANAGER.fullName,
      numPositions: '2',
    });

    await addVacancyPage.cancelButton.click();

    // Must land on the Vacancies list
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.vacancies);

    // The filled vacancy must NOT be in the list
    await addVacancyPage.waitUntilTableLoaderDissapear();
    const row = addVacancyPage.tableRows.filter({ hasText: vacancyName });
    await expect(row).toHaveCount(0);
  });

  test('TC-REC-AV-504 — Hiring Manager autocomplete filters as user types', async ({
    addVacancyPage,
    page,
  }) => {
    // -- Step 1: Type partial string and verify dropdown opens --
    await addVacancyPage.hiringManagerInput.fill('Mar');
    const dropdown = page.locator('.oxd-autocomplete-dropdown');
    await expect(dropdown).toBeVisible();
    await expect(page.getByRole('option', { name: HIRING_MANAGER.fullName })).toBeVisible();

    // -- Step 2: Add more characters — suggestions narrow --
    await addVacancyPage.hiringManagerInput.fill('Marcus C');
    await expect(page.getByRole('option', { name: HIRING_MANAGER.fullName })).toBeVisible();

    // -- Step 3: Completely unmatched string shows no-results state --
    await addVacancyPage.hiringManagerInput.fill('zzz_no_employee_zzz');
    await expect(page.getByRole('option', { name: HIRING_MANAGER.fullName })).not.toBeVisible();
  });
});

// ─── P0: Vacancy in Candidate workflow ─────────────────────────────────────
test.describe('Admin — Vacancy integration with Candidate form', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  test('TC-REC-AV-007 — Active vacancy appears in Candidate Vacancy dropdown', async ({
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, { waitUntil: 'domcontentloaded' });

    // Open the Vacancy OXD dropdown on the Add Candidate form
    const vacancyGroup = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Vacancy' });
    await vacancyGroup.locator('.oxd-select-text').click();

    // The active vacancy seeded in beforeAll must appear
    await expect(page.getByRole('option', { name: DUPLICATE_VACANCY_NAME, exact: true })).toBeVisible();
  });

  test('TC-REC-AV-106 — Closed vacancy is absent from Candidate Vacancy dropdown', async ({
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, { waitUntil: 'domcontentloaded' });

    const vacancyGroup = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Vacancy' });
    await vacancyGroup.locator('.oxd-select-text').click();

    // Active vacancy must be there (proves dropdown is open)
    await expect(page.getByRole('option', { name: DUPLICATE_VACANCY_NAME, exact: true })).toBeVisible();

    // Closed vacancy must NOT be there
    await expect(
      page.getByRole('option', { name: CLOSED_VACANCY_NAME, exact: true }),
    ).not.toBeVisible();
  });
});

// ─── P0: ESS security ──────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Recruitment', () => {
  test.beforeEach(async ({ loginPage }) => {
    // Use seeded ESS user (marcus.chen, empNumber=2, userRoleId=2)
    await loginPage.goto('/web/index.php/auth/login');
    await loginPage.usernameInput.fill(ESS_TEST_USER.username);
    await loginPage.passwordInput.fill(ESS_TEST_USER.password);
    await loginPage.loginButton.click();
    await loginPage.page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  });

  test('TC-REC-AV-200 — ESS user: Recruitment is not in the side navigation menu', async ({
    page,
  }) => {
    // ESS role should have no Recruitment menu item
    await expect(
      page.locator('.oxd-main-menu-item').filter({ hasText: 'Recruitment' }),
    ).toHaveCount(0);
  });

  test('TC-REC-AV-201 — ESS user: Direct URL to Vacancies list renders no Add button', async ({
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.vacancies, { waitUntil: 'domcontentloaded' });

    // Add button must not be present (no permission to create vacancies)
    await expect(page.getByRole('button', { name: 'Add' })).not.toBeVisible({ timeout: 5_000 });
  });
});

