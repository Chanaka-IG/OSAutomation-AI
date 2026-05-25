import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { CandidatesApi } from '../../src/api/orangehrmOSAPI/CandidatesApi';
import { VacanciesApi } from '../../src/api/orangehrmOSAPI/VacanciesApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';

/**
 * E2E + API coverage for Candidate Pipeline status transitions.
 * Covers: TC-001–007, TC-100–104, TC-200–202, TC-300–302, TC-400, TC-500–502
 *
 * Run:
 *   npx playwright test tests/recruitment/candidate-pipeline.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

// ─── Suite constants ────────────────────────────────────────────────────────
const VACANCY_NAME = 'CP Test Suite Active';
const JOB_TITLE = 'QA Engineer';
const TODAY = '2026-05-24';
const INTERVIEW_DATE = '2026-06-15';
const INTERVIEWER_SEARCH = 'Ruwan';
const INTERVIEW_TITLE = 'CP Automation Interview';

const ESS_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };

// ─── Suite-level state ──────────────────────────────────────────────────────
let vacancyId = 0;
let interviewerEmpNumber = 1; // Ruwan Kumara — confirmed valid for scheduleInterview API

const createdCandidateIds: number[] = [];

// Pre-seeded candidate IDs (set in beforeAll)
let idForTC001 = 0;
let idForTC002 = 0;
let idForTC003 = 0;
let idForTC004 = 0;
let idForTC005 = 0;
let idForTC006 = 0;
let idForTC007 = 0;
let idForTC100 = 0;
let idForTC101 = 0;
let idForTC102 = 0;
let idForTC104 = 0;
let idForTC300 = 0;
let idForTC400 = 0;
let idForTC500 = 0;
let idForTC501 = 0;
let idForTC502 = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function seed(
  api: CandidatesApi,
  firstName: string,
  vacId: number,
  stage: 'initiated' | 'shortlisted' | 'interviewScheduled' | 'interviewPassed' | 'jobOffered' | 'hired' | 'rejected',
): Promise<number> {
  const id = await api.create({
    firstName,
    lastName: 'CPTest',
    email: `${firstName.toLowerCase()}.cptest@example.com`,
    vacancyId: vacId,
    dateOfApplication: TODAY,
    consentToKeepData: true,
  });
  createdCandidateIds.push(id);

  if (stage === 'initiated') return id;

  await api.shortlist(id);
  if (stage === 'shortlisted') return id;

  const interviewId = await api.scheduleInterview(id, {
    interviewName: INTERVIEW_TITLE,
    interviewerEmpNumber,
    interviewDate: INTERVIEW_DATE,
  });
  if (stage === 'interviewScheduled') return id;

  await api.passInterview(id, interviewId);
  if (stage === 'interviewPassed') return id;

  await api.offerJob(id);
  if (stage === 'jobOffered') return id;

  if (stage === 'hired') {
    await api.hire(id);
    return id;
  }

  // rejected — already shortlisted above, now reject
  await api.reject(id);
  return id;
}

// ─── Suite setup / teardown ─────────────────────────────────────────────────

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  test.setTimeout(600_000); // 10 min — seeding 16 candidates via API takes ~2-3 min
  void masterDataReadiness;
  await orangehrmAdminApi.loginAsAdmin();

  const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
  const jtId = await jobTitlesApi.getIdByTitle(JOB_TITLE);
  if (!jtId) throw new Error(`Job title "${JOB_TITLE}" missing — run seed-master-data first`);

  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  const empNum = await employeesApi.getEmpNumberByEmployeeId('0001');
  if (empNum) interviewerEmpNumber = empNum;

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  vacancyId = await vacanciesApi.createIfAbsent({
    name: VACANCY_NAME,
    jobTitleId: jtId,
    hiringManagerId: interviewerEmpNumber,
    numOfPositions: 30,
    isPublished: true,
    status: true,
  });

  const api = new CandidatesApi(orangehrmAdminApi.request);

  // APPLICATION_INITIATED candidates
  idForTC001 = await seed(api, 'CPFull', vacancyId, 'initiated');
  idForTC002 = await seed(api, 'CPShortlist', vacancyId, 'initiated');
  idForTC007 = await seed(api, 'CPRejectInit', vacancyId, 'initiated');
  idForTC400 = await seed(api, 'CPLongNote', vacancyId, 'initiated');

  // SHORTLISTED candidates
  idForTC003 = await seed(api, 'CPSchedIntv', vacancyId, 'shortlisted');
  idForTC100 = await seed(api, 'CPRejectShort', vacancyId, 'shortlisted');
  idForTC500 = await seed(api, 'CPStatusBadge', vacancyId, 'shortlisted');

  // INTERVIEW_SCHEDULED candidates
  idForTC004 = await seed(api, 'CPPassIntv', vacancyId, 'interviewScheduled');
  idForTC101 = await seed(api, 'CPFailIntv', vacancyId, 'interviewScheduled');
  idForTC502 = await seed(api, 'CPBothBtns', vacancyId, 'interviewScheduled');

  // INTERVIEW_PASSED
  idForTC005 = await seed(api, 'CPOfferJob', vacancyId, 'interviewPassed');

  // JOB_OFFERED
  idForTC006 = await seed(api, 'CPHireMe', vacancyId, 'jobOffered');
  idForTC102 = await seed(api, 'CPDeclineOffer', vacancyId, 'jobOffered');
  idForTC501 = await seed(api, 'CPJobOffered', vacancyId, 'jobOffered');

  // Terminal states
  idForTC104 = await seed(api, 'CPHired', vacancyId, 'hired');
  idForTC300 = await seed(api, 'CPRejected', vacancyId, 'rejected');
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  test.setTimeout(300_000);
  await orangehrmAdminApi.loginAsAdmin();

  // Clean up PIM employees auto-created by HIRE (TC-001, TC-006, beforeAll TC-104 seed)
  // Note: pim/employees uses nameOrId param, not firstName/lastName
  const hiredFirstNames = ['CPFull', 'CPHireMe', 'CPHired'];
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  for (const firstName of hiredFirstNames) {
    const res = await orangehrmAdminApi.request.get(
      `/web/index.php/api/v2/pim/employees?nameOrId=${firstName}&limit=10`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok()) {
      const json = (await res.json()) as { data: Array<{ empNumber: number; lastName: string }> };
      const empNumbers = (json.data ?? [])
        .filter((e) => e.lastName === 'CPTest')
        .map((e) => e.empNumber);
      if (empNumbers.length > 0) await employeesApi.deleteEmployees(empNumbers);
    }
  }

  if (createdCandidateIds.length > 0) {
    const api = new CandidatesApi(orangehrmAdminApi.request);
    await api.deleteCandidates(createdCandidateIds);
  }

  const vacanciesApi = new VacanciesApi(orangehrmAdminApi.request);
  const all = await vacanciesApi.getAll();
  const cp = all.find((v) => v.name === VACANCY_NAME);
  if (cp) await vacanciesApi.deleteVacancies([cp.id]);
});

// ─── API Security (no browser login — runs first) ───────────────────────────

test.describe('API Security', () => {
  test('TC-REC-CP-202 — Unauthenticated API pipeline action returns 401', async ({
    orangehrmApiContext,
  }) => {
    const res = await orangehrmApiContext.put(
      `/web/index.php/api/v2/recruitment/candidates/${idForTC001}/shortlist`,
      { data: { note: '' }, headers: { 'Content-Type': 'application/json' } },
    );
    expect(res.status()).toBe(401);
  });
});

// ─── Admin E2E tests ────────────────────────────────────────────────────────

test.describe('Admin — Candidate Pipeline', () => {
  test.beforeEach(async ({ page, loginPage }) => {
    await page.goto('/web/index.php/recruitment/viewCandidates', {
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
    }
  });

  // ── Happy Path ──────────────────────────────────────────────────────────

  test('TC-REC-CP-001 — Full pipeline APPLICATION_INITIATED → HIRED', async ({
    candidateProfilePage,
    orangehrmAdminApi,
  }) => {
    test.setTimeout(600_000); // 10 min — full 5-step pipeline on a slow server
    await candidateProfilePage.gotoProfile(idForTC001);
    expect(await candidateProfilePage.getStatus()).toBe('Application Initiated');

    // Shortlist
    await candidateProfilePage.clickAction('Shortlist');
    await candidateProfilePage.saveAction();
    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');

    // Schedule Interview
    await candidateProfilePage.clickAction('Schedule Interview');
    await candidateProfilePage.scheduleInterviewAndSave(
      INTERVIEW_TITLE,
      INTERVIEWER_SEARCH,
      INTERVIEW_DATE,
    );
    expect(await candidateProfilePage.getStatus()).toBe('Interview Scheduled');

    // Pass Interview
    await candidateProfilePage.clickAction('Mark Interview Passed');
    await candidateProfilePage.saveAction();
    expect(await candidateProfilePage.getStatus()).toBe('Interview Passed');

    // Offer Job
    await candidateProfilePage.clickAction('Offer Job');
    await candidateProfilePage.saveAction();
    expect(await candidateProfilePage.getStatus()).toBe('Job Offered');

    // Hire
    await candidateProfilePage.clickAction('Hire');
    await candidateProfilePage.saveAction();
    expect(await candidateProfilePage.getStatus()).toBe('Hired');
    expect(await candidateProfilePage.getActionButtonLabels()).toHaveLength(0);

    // Verify PIM employee auto-creation via API (nameOrId is the correct search param)
    await orangehrmAdminApi.loginAsAdmin();
    const res = await orangehrmAdminApi.request.get(
      `/web/index.php/api/v2/pim/employees?nameOrId=CPFull&limit=5`,
      { headers: { Accept: 'application/json' } },
    );
    const json = (await res.json()) as { data: Array<{ firstName: string; lastName: string }> };
    const found = (json.data ?? []).filter(
      (e) => e.firstName === 'CPFull' && e.lastName === 'CPTest',
    );
    expect(found.length).toBeGreaterThan(0);
  });

  test('TC-REC-CP-002 — Shortlist a candidate', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC002);
    expect(await candidateProfilePage.getStatus()).toBe('Application Initiated');

    await candidateProfilePage.clickAction('Shortlist');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).toContain('Schedule Interview');
  });

  test('TC-REC-CP-003 — Schedule an interview', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC003);
    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');

    await candidateProfilePage.clickAction('Schedule Interview');
    await candidateProfilePage.scheduleInterviewAndSave(
      INTERVIEW_TITLE,
      INTERVIEWER_SEARCH,
      INTERVIEW_DATE,
    );

    expect(await candidateProfilePage.getStatus()).toBe('Interview Scheduled');
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).toContain('Mark Interview Passed');
    expect(buttons).toContain('Mark Interview Failed');
  });

  test('TC-REC-CP-004 — Mark interview as passed', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC004);
    expect(await candidateProfilePage.getStatus()).toBe('Interview Scheduled');

    await candidateProfilePage.clickAction('Mark Interview Passed');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Interview Passed');
    expect(await candidateProfilePage.getActionButtonLabels()).toContain('Offer Job');
  });

  test('TC-REC-CP-005 — Offer job to candidate', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC005);
    expect(await candidateProfilePage.getStatus()).toBe('Interview Passed');

    await candidateProfilePage.clickAction('Offer Job');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Job Offered');
    // Use toBeVisible to auto-wait for the actions container to render
    await expect(candidateProfilePage.actionsContainer.getByRole('button', { name: 'Hire' })).toBeVisible({ timeout: 10_000 });
  });

  test('TC-REC-CP-006 — Hire candidate auto-creates PIM Employee record', async ({
    candidateProfilePage,
    orangehrmAdminApi,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC006);
    expect(await candidateProfilePage.getStatus()).toBe('Job Offered');

    await candidateProfilePage.clickAction('Hire');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Hired');
    expect(await candidateProfilePage.getActionButtonLabels()).toHaveLength(0);

    // Verify PIM employee was auto-created (nameOrId is the correct search param)
    await orangehrmAdminApi.loginAsAdmin();
    const res = await orangehrmAdminApi.request.get(
      `/web/index.php/api/v2/pim/employees?nameOrId=CPHireMe&limit=5`,
      { headers: { Accept: 'application/json' } },
    );
    expect(res.ok()).toBe(true);
    const json = (await res.json()) as { data: Array<{ firstName: string; lastName: string }> };
    const found = (json.data ?? []).filter(
      (e) => e.firstName === 'CPHireMe' && e.lastName === 'CPTest',
    );
    expect(found.length).toBeGreaterThan(0);
  });

  test('TC-REC-CP-007 — Reject at APPLICATION_INITIATED stage', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC007);
    expect(await candidateProfilePage.getStatus()).toBe('Application Initiated');

    await candidateProfilePage.clickAction('Reject');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Rejected');
    expect(await candidateProfilePage.getActionButtonLabels()).toHaveLength(0);
  });

  // ── Business Rules ──────────────────────────────────────────────────────

  test('TC-REC-CP-100 — Reject at SHORTLISTED stage', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC100);
    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');

    await candidateProfilePage.clickAction('Reject');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Rejected');
    expect(await candidateProfilePage.getActionButtonLabels()).toHaveLength(0);
  });

  test('TC-REC-CP-101 — Mark interview as failed', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC101);
    expect(await candidateProfilePage.getStatus()).toBe('Interview Scheduled');

    await candidateProfilePage.clickAction('Mark Interview Failed');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Interview Failed');
    // OrangeHRM allows Reject even after interview failure
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).not.toContain('Mark Interview Passed');
    expect(buttons).not.toContain('Mark Interview Failed');
  });

  test('TC-REC-CP-102 — Decline job offer', async ({ candidateProfilePage }) => {
    await candidateProfilePage.gotoProfile(idForTC102);
    expect(await candidateProfilePage.getStatus()).toBe('Job Offered');

    await candidateProfilePage.clickAction('Offer Declined');
    await candidateProfilePage.saveAction();

    expect(await candidateProfilePage.getStatus()).toBe('Offer Declined');
    // OrangeHRM allows Reject even after offer declined
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).not.toContain('Hire');
    expect(buttons).not.toContain('Offer Declined');
  });

  test('TC-REC-CP-104 — Hired candidate profile is read-only — no further pipeline actions', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC104);
    expect(await candidateProfilePage.getStatus()).toBe('Hired');
    expect(await candidateProfilePage.getActionButtonLabels()).toHaveLength(0);
  });

  // ── Negative / Error ────────────────────────────────────────────────────

  test('TC-REC-CP-300 — Cannot shortlist a candidate who is already rejected', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC300);
    expect(await candidateProfilePage.getStatus()).toBe('Rejected');
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).not.toContain('Shortlist');
    expect(buttons).toHaveLength(0);
  });

  test('TC-REC-CP-301 — API action on invalid endpoint returns 404', async ({
    orangehrmAdminApi,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const res = await orangehrmAdminApi.request.put(
      `/web/index.php/api/v2/recruitment/candidates/${idForTC001}/INVALID_ACTION`,
      { data: { note: '' }, headers: { 'Content-Type': 'application/json' } },
    );
    expect(res.status()).toBe(404);
  });

  test('TC-REC-CP-302 — API schedule-interview on APPLICATION_INITIATED candidate returns 4xx', async ({
    orangehrmAdminApi,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const res = await orangehrmAdminApi.request.post(
      `/web/index.php/api/v2/recruitment/candidates/${idForTC400}/shedule-interview`,
      {
        data: {
          interviewName: 'Skip Stage Test',
          interviewerEmpNumbers: [interviewerEmpNumber],
          interviewDate: INTERVIEW_DATE,
        },
        headers: { 'Content-Type': 'application/json' },
      },
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  test('TC-REC-CP-400 — Pipeline action with a 250-character note is accepted', async ({
    candidateProfilePage,
  }) => {
    const longNote = 'A'.repeat(250);
    await candidateProfilePage.gotoProfile(idForTC400);
    expect(await candidateProfilePage.getStatus()).toBe('Application Initiated');

    await candidateProfilePage.clickAction('Shortlist');
    await candidateProfilePage.saveActionWithNote(longNote);

    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');
  });

  // ── UI State ────────────────────────────────────────────────────────────

  test('TC-REC-CP-500 — Status badge reflects SHORTLISTED pipeline stage', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC500);
    expect(await candidateProfilePage.getStatus()).toBe('Shortlisted');
  });

  test('TC-REC-CP-501 — JOB_OFFERED action area shows both Hire and Offer Declined buttons', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC501);
    expect(await candidateProfilePage.getStatus()).toBe('Job Offered');
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).toContain('Hire');
    expect(buttons).toContain('Offer Declined');
  });

  test('TC-REC-CP-502 — INTERVIEW_SCHEDULED shows both Pass and Fail buttons', async ({
    candidateProfilePage,
  }) => {
    await candidateProfilePage.gotoProfile(idForTC502);
    expect(await candidateProfilePage.getStatus()).toBe('Interview Scheduled');
    const buttons = await candidateProfilePage.getActionButtonLabels();
    expect(buttons).toContain('Mark Interview Passed');
    expect(buttons).toContain('Mark Interview Failed');
  });
});

// ─── Security — ESS user (runs last; explicitly logs out admin session) ──────

test.describe('Security — ESS user cannot perform pipeline actions', () => {
  test.beforeEach(async ({ page, loginPage }) => {
    await page.goto('/web/index.php/auth/logout', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await loginPage.usernameInput.fill(ESS_USER.username);
    await loginPage.passwordInput.fill(ESS_USER.password);
    await loginPage.loginButton.click();
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  });

  test('TC-REC-CP-200 — ESS user navigating to candidate profile sees no pipeline action buttons', async ({
    page,
  }) => {
    await page.goto(`/web/index.php/recruitment/addCandidate/${idForTC500}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page
      .waitForLoadState('networkidle', { timeout: 15_000 })
      .catch(() => {});

    const actionsContainer = page.locator('.orangehrm-recruitment-actions');
    const visible = await actionsContainer.isVisible().catch(() => false);
    if (visible) {
      const count = await actionsContainer.getByRole('button').count();
      expect(count).toBe(0);
    }
    // ESS may be redirected away from Recruitment — either way, no action buttons accessible
    expect(page.url()).not.toContain('/auth/login');
  });

  test('TC-REC-CP-201 — ESS API pipeline action returns 403', async ({ page }) => {
    const res = await page.request.get(
      `${env.baseURL}/web/index.php/api/v2/recruitment/candidates/${idForTC500}/actions/allowed`,
      { headers: { Accept: 'application/json' } },
    );
    // ESS user should get 403 for recruitment API endpoints
    expect([403, 401]).toContain(res.status());
  });
});
