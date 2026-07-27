import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { CandidatesApi } from '../../src/api/orangehrmOSAPI/CandidatesApi';
import { VacanciesApi } from '../../src/api/orangehrmOSAPI/VacanciesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for Add Candidate — P0 (release-blocking) and P1 (primary feature path).
 * Covers: TC-001, 002, 003, 004, 005, 100, 103, 200, 201, 202, 203, 300, 301, 302, 303, 304, 305, 307, 400
 *
 * Run:
 *   npx playwright test tests/recruitment/add-candidates.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'parallel', timeout: 180_000 });

// ─── Suite-level state ──────────────────────────────────────────────────────
const createdCandidateIds: number[] = [];
const createdVacancyIds: number[] = [];

const ACTIVE_VACANCY_NAME = 'AC Test Suite Active';
const CLOSED_VACANCY_NAME = 'AC Test Suite Closed';

const ESS_TEST_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };

const JOB_TITLE = 'QA Engineer';
const HIRING_MANAGER = { query: 'Marcus', fullName: 'Marcus James Chen' };

let activeVacancyId = 0;
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
  if (!empNumber) throw new Error('Hiring manager employee (id=0002) missing — run seed-master-data first');
  hiringManagerEmpNumber = empNumber;

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);

  activeVacancyId = await vacanciesApi.createIfAbsent({
    name: ACTIVE_VACANCY_NAME,
    jobTitleId,
    hiringManagerId: hiringManagerEmpNumber,
    numOfPositions: 5,
    isPublished: true,
    status: true,
  });
  createdVacancyIds.push(activeVacancyId);

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

// ─── Admin — core add-candidate tests ──────────────────────────────────────
test.describe('Admin — Add Candidate form', () => {
  /**
   * Navigate directly to the add candidate form.
   * The admin session cookie from the first test's login persists in the shared browser context,
   * so subsequent tests skip the /auth/login round-trip (which can be slow on this server).
   * If the session has expired the app redirects to login and we re-authenticate.
   */
  test.beforeEach(async ({ loginPage, addCandidatePage, page }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, {
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
      await addCandidatePage.gotoAddCandidate();
    } else {
      await addCandidatePage.waitUntilFormLoaderDissapear();
    }
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-REC-AC-001 — Add candidate with required fields only saves successfully', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'Priya';
    const lastName = `Sharma${Date.now()}`;

    await addCandidatePage.fillForm({
      firstName,
      lastName,
      email: `priya.sharma.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveCandidate();

    const createdId = addCandidatePage.getCreatedCandidateId();
    if (createdId) createdCandidateIds.push(createdId);

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);
  });

  test('TC-REC-AC-004 — Candidate visible in list after creation', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'ListCheck';
    const lastName = `Candidate${Date.now()}`;
    const fullName = `${firstName} ${lastName}`;

    await addCandidatePage.fillForm({
      firstName,
      lastName,
      email: `listcheck.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveCandidate();

    const createdId = addCandidatePage.getCreatedCandidateId();
    if (createdId) createdCandidateIds.push(createdId);

    await addCandidatePage.gotoCandidatesList();

    const row = await addCandidatePage.findCandidateInList(fullName);
    await expect(row.first()).toBeVisible();
  });

  test('TC-REC-AC-100 — Missing consent checkbox: form stays on add page', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.fillForm({
      firstName: 'NoConsent',
      lastName: 'User',
      email: `noconsent.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    // Deliberately do NOT tick consent
    await addCandidatePage.saveButton.click();

    // Must not navigate to profile
    await expect(page).not.toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);
    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    // Drain any pending network activity so the next beforeEach navigation isn't blocked
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  });

  test('TC-REC-AC-300 — Empty form shows Required on all mandatory fields', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const errors = addCandidatePage.allValidationErrors;
    await expect(errors.first()).toBeVisible();
    expect(await errors.count()).toBeGreaterThanOrEqual(3);
  });

  test('TC-REC-AC-305 — Cancel returns to Candidates list without creating a record', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'DoNotSave';
    const lastName = `Cancel${Date.now()}`;
    const fullName = `${firstName} ${lastName}`;

    await addCandidatePage.fillForm({
      firstName,
      lastName,
      email: `donotsave.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    await addCandidatePage.cancelButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.candidates);

    await addCandidatePage.waitUntilTableLoaderDissapear();
    const row = addCandidatePage.tableRows.filter({ hasText: fullName });
    await expect(row).toHaveCount(0);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-REC-AC-002 — Add candidate with all optional fields saves successfully', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'Oliver';
    const lastName = `Bennett${Date.now()}`;

    await addCandidatePage.fillForm({
      firstName,
      lastName,
      email: `oliver.bennett.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
      contactNumber: '+94771234567',
      keywords: 'automation, qa, typescript',
      notes: 'Referred by internal team',
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveCandidate();

    const createdId = addCandidatePage.getCreatedCandidateId();
    if (createdId) createdCandidateIds.push(createdId);

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);

    // Verify candidate name is shown on profile
    await expect(page.getByText(`${firstName} ${lastName}`, { exact: true }).first()).toBeVisible();
  });

  test('TC-REC-AC-003 — Candidate profile shows APPLICATION_INITIATED status after save', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'StatusCheck';
    const lastName = `Candidate${Date.now()}`;

    await addCandidatePage.fillForm({
      firstName,
      lastName,
      email: `statuscheck.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveCandidate();

    const createdId = addCandidatePage.getCreatedCandidateId();
    if (createdId) createdCandidateIds.push(createdId);

    // Profile shows status paragraph and Shortlist action button
    await expect(addCandidatePage.statusParagraph).toContainText('Application Initiated');
    await expect(page.getByRole('button', { name: 'Shortlist' })).toBeVisible();
  });

  test('TC-REC-AC-103 — Missing vacancy: form does not navigate to candidate profile', async ({
    addCandidatePage,
    page,
  }) => {
    // Fill all fields except vacancy
    await addCandidatePage.firstNameInput.fill('NoVacancy');
    await addCandidatePage.lastNameInput.fill('Candidate');
    await addCandidatePage.emailInput.fill(`novacancy.${Date.now()}@example.com`);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    // Should NOT redirect to a candidate profile
    await expect(page).not.toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);
  });

  test('TC-REC-AC-301 — Missing First Name shows Required error', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.lastNameInput.fill('Candidate');
    await addCandidatePage.emailInput.fill(`missing.fn.${Date.now()}@example.com`);
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const nameError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Full Name' })
      .locator('.oxd-input-field-error-message')
      .first();
    await expect(nameError).toBeVisible();
    await expect(nameError).toContainText('Required');
  });

  test('TC-REC-AC-302 — Missing Last Name shows Required error', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.firstNameInput.fill('Partial');
    await addCandidatePage.emailInput.fill(`missing.ln.${Date.now()}@example.com`);
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const errors = addCandidatePage.allValidationErrors;
    await expect(errors.first()).toBeVisible();
    await expect(errors.first()).toContainText('Required');
  });

  test('TC-REC-AC-303 — Missing Email shows Required error', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.firstNameInput.fill('NoEmail');
    await addCandidatePage.lastNameInput.fill('Candidate');
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const emailError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Email' })
      .locator('.oxd-input-field-error-message');
    await expect(emailError).toBeVisible();
    await expect(emailError).toContainText('Required');
  });

  test('TC-REC-AC-304 — Invalid email format shows validation error', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.firstNameInput.fill('Invalid');
    await addCandidatePage.lastNameInput.fill('Email');
    await addCandidatePage.emailInput.fill('not-an-email');
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const emailError = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Email' })
      .locator('.oxd-input-field-error-message');
    await expect(emailError).toBeVisible();
  });

  test('TC-REC-AC-307 — First Name exceeding 30 characters shows length validation error', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.firstNameInput.fill('B'.repeat(31));
    await addCandidatePage.lastNameInput.fill('LengthTest');
    await addCandidatePage.emailInput.fill(`lengthtest.${Date.now()}@example.com`);
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.addCandidate);

    const errors = addCandidatePage.allValidationErrors;
    await expect(errors.first()).toBeVisible();
  });

  test('TC-REC-AC-400 — First Name at maximum length (30 chars) is accepted', async ({
    addCandidatePage,
    page,
  }) => {
    const firstName = 'A'.repeat(30);

    await addCandidatePage.fillForm({
      firstName,
      lastName: 'MaxLength',
      email: `maxlength.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveCandidate();

    const createdId = addCandidatePage.getCreatedCandidateId();
    if (createdId) createdCandidateIds.push(createdId);

    await expect(page).toHaveURL(frontend.recruitment.urlPatterns.candidateProfile);
  });
});

// ─── Vacancy dropdown integration ──────────────────────────────────────────
test.describe('Admin — Vacancy dropdown on Add Candidate form', () => {
  test.beforeEach(async ({ loginPage, addCandidatePage, page }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    if (page.url().includes('/auth/login')) {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin@OHRM123');
      await loginPage.loginButton.click();
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { waitUntil: 'domcontentloaded' });
      await addCandidatePage.gotoAddCandidate();
    } else {
      await addCandidatePage.waitUntilFormLoaderDissapear();
    }
  });

  test('TC-REC-AC-005 — Active vacancy appears in dropdown; closed vacancy does not', async ({
    addCandidatePage,
    page,
  }) => {
    await addCandidatePage.vacancyGroup.locator('.oxd-select-text').click();

    // Active vacancy must be present
    await expect(page.getByRole('option', { name: ACTIVE_VACANCY_NAME, exact: true })).toBeVisible();

    // Closed vacancy must NOT be present
    await expect(
      page.getByRole('option', { name: CLOSED_VACANCY_NAME, exact: true }),
    ).not.toBeVisible();
  });
});

// ─── Security — ESS role access ────────────────────────────────────────────
test.describe('Security — ESS user cannot access Recruitment', () => {
  test.beforeEach(async ({ loginPage, page }) => {
    // /auth/logout clears the current session and redirects to /auth/login in one request
    await page.goto('/web/index.php/auth/logout', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await loginPage.usernameInput.fill(ESS_TEST_USER.username);
    await loginPage.passwordInput.fill(ESS_TEST_USER.password);
    await loginPage.loginButton.click();
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  });

  test('TC-REC-AC-200 — ESS user: Recruitment is not in the side navigation menu', async ({
    page,
  }) => {
    await expect(
      page.locator('.oxd-main-menu-item').filter({ hasText: 'Recruitment' }),
    ).toHaveCount(0);
  });

  test('TC-REC-AC-201 — ESS user: Direct URL to Add Candidate has no functional Save button', async ({
    addCandidatePage,
    page,
  }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, { waitUntil: 'domcontentloaded' });

    // ESS must not see a working Save button for creating candidates
    await expect(addCandidatePage.saveButton).not.toBeVisible({ timeout: 5_000 });
  });
});

// ─── Security — XSS prevention ─────────────────────────────────────────────
test.describe('Security — XSS probe in Add Candidate form fields', () => {
  test.beforeEach(async ({ loginPage, addCandidatePage, page }) => {
    await page.goto(frontend.recruitment.routes.addCandidate, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    if (page.url().includes('/auth/login')) {
      await loginPage.usernameInput.fill('admin');
      await loginPage.passwordInput.fill('admin@OHRM123');
      await loginPage.loginButton.click();
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { waitUntil: 'domcontentloaded' });
      await addCandidatePage.gotoAddCandidate();
    } else {
      await addCandidatePage.waitUntilFormLoaderDissapear();
    }
  });

  test('TC-REC-AC-202 — XSS probe in First Name does not execute as script', async ({
    addCandidatePage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await addCandidatePage.firstNameInput.fill(`<script>alert('xss')</script>`);
    await addCandidatePage.lastNameInput.fill('XSSTest');
    await addCandidatePage.emailInput.fill(`xss.fn.${Date.now()}@example.com`);
    await addCandidatePage.selectVacancy(ACTIVE_VACANCY_NAME);
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    // If saved, verify profile renders name as plain text
    if (frontend.recruitment.urlPatterns.candidateProfile.test(page.url())) {
      const createdId = addCandidatePage.getCreatedCandidateId();
      if (createdId) createdCandidateIds.push(createdId);

      const scriptNodes = await page
        .locator('script:not([src])')
        .evaluateAll((els) =>
          els.map((el) => el.textContent ?? '').filter((t) => t.includes('alert')),
        );
      expect(scriptNodes).toHaveLength(0);
    }
  });

  test('TC-REC-AC-203 — XSS probe in Keywords and Notes does not execute as script', async ({
    addCandidatePage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await addCandidatePage.fillForm({
      firstName: 'XSSKeywords',
      lastName: `Test${Date.now()}`,
      email: `xss.kw.${Date.now()}@example.com`,
      vacancyName: ACTIVE_VACANCY_NAME,
      keywords: `<img src=x onerror=alert(1)>`,
      notes: `"><script>alert('stored-xss')</script>`,
    });
    await addCandidatePage.tickConsent();
    await addCandidatePage.saveButton.click();

    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    if (frontend.recruitment.urlPatterns.candidateProfile.test(page.url())) {
      const createdId = addCandidatePage.getCreatedCandidateId();
      if (createdId) createdCandidateIds.push(createdId);

      const scriptNodes = await page
        .locator('script:not([src])')
        .evaluateAll((els) =>
          els.map((el) => el.textContent ?? '').filter((t) => t.includes('alert')),
        );
      expect(scriptNodes).toHaveLength(0);
    }
  });
});
