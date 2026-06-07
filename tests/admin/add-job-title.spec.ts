import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { JobTitlesApi } from '../../src/api/orangehrmOSAPI/JobTitlesApi';

/**
 * E2E coverage for Add Job Title (Admin → Job → Job Titles) — P0 + P1 + P2.
 * Covers: TC-001 (+003/501/504), TC-002 (+403), TC-102 (+103), TC-101+ combined
 * validation (101/301/104/502), TC-201, TC-204, TC-004,
 * P2: TC-005 (+405), TC-006, TC-106, TC-505.
 * Source: docs/test-priority_Add job title.md
 *
 * Run:
 *   npx playwright test tests/admin/add-job-title.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const jobTitlesData = frontend.adminJobTitles;

// ─── Suite-level state ──────────────────────────────────────────────────────
/** Titles created during the run; resolved to ids and hard-deleted in afterAll. */
const createdTitles: string[] = [];

/** ESS user seeded as master data (empNumber=2, userRoleId=2). */
const ESS_TEST_USER = { username: 'marcus.chen', password: 'admin@OHRM123' };

// ─── Suite setup / teardown ─────────────────────────────────────────────────
// NOTE: `orangehrmAdminApi` is test-scoped — its request context is disposed after
// each test/hook, so every consumer logs in and constructs its own JobTitlesApi.

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ masterDataReadiness }) => {
  void masterDataReadiness;
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  if (createdTitles.length === 0) return;
  await orangehrmAdminApi.loginAsAdmin();
  const cleanupApi = new JobTitlesApi(orangehrmAdminApi.request);
  const all = await cleanupApi.getAll();
  const ids = all.filter((jt) => createdTitles.includes(jt.title)).map((jt) => jt.id);
  await cleanupApi.deleteByIds(ids);
});

// ─── Admin — Add Job Title form ─────────────────────────────────────────────
test.describe('Admin — Add Job Title form', () => {
  test.beforeEach(async ({ loginPage, jobTitlesPage }) => {
    await loginPage.loginAs('admin');
    await jobTitlesPage.gotoAddForm();
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AJT-001 — Add job title with required field only saves, toasts, and lists alphabetically', async ({
    jobTitlesPage,
    orangehrmAdminApi,
    page,
  }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    const countBefore = (await jobTitlesApi.getAll()).length;
    const title = `MJT Suite Required Only ${Date.now()}`;

    await jobTitlesPage.fillForm({ title });
    const toast = await jobTitlesPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);

    // Folds TC-504 (toast asserted above) + redirect back to the list
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);

    // New row is present
    await expect(jobTitlesPage.rowByTitle(title).first()).toBeVisible();
    createdTitles.push(title);

    // Folds TC-003: counter incremented and rows render in alphabetical order
    expect(await jobTitlesPage.recordsFoundCount()).toBe(countBefore + 1);
    const titles = await jobTitlesPage.visibleTitles();
    const sorted = [...titles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    expect(titles).toEqual(sorted);
  });

  test('TC-ADMIN-AJT-102 — Duplicate title shows live "Already exists" (case-insensitive) and blocks save', async ({
    jobTitlesPage,
    orangehrmAdminApi,
    page,
  }) => {
    const duplicate = jobTitlesData.masterData.duplicateTitle;

    // Exact-case duplicate — error fires while typing, before any save
    await jobTitlesPage.titleInput.fill(duplicate);
    await expect(jobTitlesPage.titleFieldError).toHaveText(jobTitlesData.messages.alreadyExists);

    // Folds TC-103: lower-case variant is also flagged (case-insensitive uniqueness)
    await jobTitlesPage.titleInput.fill(duplicate.toLowerCase());
    await expect(jobTitlesPage.titleFieldError).toHaveText(jobTitlesData.messages.alreadyExists);

    // Save with the error present must not create a duplicate
    await jobTitlesPage.saveButton.click();
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.add);
    await expect(jobTitlesPage.titleFieldError).toBeVisible();

    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    const matches = (await jobTitlesApi.getAll()).filter(
      (jt) => jt.title.toLowerCase() === duplicate.toLowerCase(),
    );
    expect(matches).toHaveLength(1);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AJT-002 — Add job title with all text fields persists and truncates long description', async ({
    jobTitlesPage,
    page,
  }) => {
    const title = `MJT Suite Full Fields ${Date.now()}`;

    await jobTitlesPage.fillForm({
      title,
      description: jobTitlesData.samples.longDescription,
      note: jobTitlesData.samples.note,
    });
    const toast = await jobTitlesPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);

    const row = jobTitlesPage.rowByTitle(title).first();
    await expect(row).toBeVisible();
    createdTitles.push(title);

    // Folds TC-403: >50-char description is truncated behind a "Show More" toggle
    await expect(row).toContainText(jobTitlesData.samples.longDescription.slice(0, 40));
    await expect(row.getByText('Show More')).toBeVisible();
  });

  test('TC-ADMIN-AJT-300 — Combined validation: Required, optional-only, 100-char limit, error clearing', async ({
    jobTitlesPage,
    page,
  }) => {
    // -- Step 1: Empty save shows Required (TC-101) --
    await jobTitlesPage.saveButton.click();
    await expect(jobTitlesPage.titleFieldError).toHaveText(jobTitlesData.messages.required);
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.add);

    // -- Step 2: Optional fields alone do not satisfy the required title (TC-301) --
    await jobTitlesPage.descriptionInput.fill(jobTitlesData.samples.longDescription);
    await jobTitlesPage.noteInput.fill(jobTitlesData.samples.note);
    await jobTitlesPage.saveButton.click();
    await expect(jobTitlesPage.titleFieldError).toHaveText(jobTitlesData.messages.required);

    // -- Step 3: Over-long title shows the live length error (TC-104) --
    await jobTitlesPage.titleInput.fill(jobTitlesData.samples.overlongTitle);
    await expect(jobTitlesPage.titleFieldError).toHaveText(jobTitlesData.messages.maxLength);

    // -- Step 4: A valid unique title clears the error (TC-502) --
    await jobTitlesPage.titleInput.fill(`MJT Suite Valid ${Date.now()}`);
    await expect(jobTitlesPage.titleFieldError).toHaveCount(0);

    // Leave without saving — nothing to clean up
    await jobTitlesPage.cancelButton.click();
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);
  });

  test('TC-ADMIN-AJT-204 — Script payload in title is stored inert (no XSS execution)', async ({
    jobTitlesPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    const xssTitle = `<script>alert('xss')</script> MJT ${Date.now()}`;
    await jobTitlesPage.fillForm({ title: xssTitle });
    const toast = await jobTitlesPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);

    // The list re-renders every title — the payload must appear as literal text only
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);
    await expect(jobTitlesPage.rowByTitle(xssTitle).first()).toBeVisible();
    createdTitles.push(xssTitle);

    await page.waitForLoadState('domcontentloaded');
    expect(dialogFired).toBe(false);

    // No inline script node may contain the injected alert
    const scriptNodes = await page
      .locator('script:not([src])')
      .evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes("alert('xss')")),
      );
    expect(scriptNodes).toHaveLength(0);
  });
});

// ─── P2: secondary paths — attachments, cancel, delete dialog ────────────────
test.describe('Admin — Add Job Title secondary paths (P2)', () => {
  test.beforeEach(async ({ loginPage, jobTitlesPage }) => {
    await loginPage.loginAs('admin');
    await jobTitlesPage.gotoAddForm();
  });

  test('TC-ADMIN-AJT-005 — Add job title with a job specification file (≤ 1MB) persists the attachment', async ({
    jobTitlesPage,
    orangehrmAdminApi,
    page,
  }) => {
    const title = `MJT Suite With Spec ${Date.now()}`;

    await jobTitlesPage.fillForm({ title });
    await jobTitlesPage.uploadSpecification(jobTitlesData.files.validSpecification);

    // Chosen filename replaces "No file chosen" and no size error appears
    await expect(jobTitlesPage.chosenFileName).toHaveText(
      jobTitlesData.files.validSpecificationName,
    );
    await expect(jobTitlesPage.specificationFieldError).toHaveCount(0);

    const toast = await jobTitlesPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);
    await expect(jobTitlesPage.rowByTitle(title).first()).toBeVisible();
    createdTitles.push(title);

    // The attachment is persisted on the record (folds TC-405: fixture is at the cap boundary side)
    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    const record = (await jobTitlesApi.getAll()).find((jt) => jt.title === title);
    expect(record?.jobSpecification?.filename).toBe(jobTitlesData.files.validSpecificationName);
  });

  test('TC-ADMIN-AJT-006 — Cancel returns to the list without creating a record', async ({
    jobTitlesPage,
    page,
  }) => {
    const title = `MJT Suite Should Not Exist ${Date.now()}`;

    await jobTitlesPage.fillForm({ title, note: jobTitlesData.samples.note });
    await jobTitlesPage.cancelButton.click();

    await expect(page).toHaveURL(jobTitlesData.urlPatterns.list);
    await jobTitlesPage.waitUntilTableLoaderDissapear();
    await expect(jobTitlesPage.rowByTitle(title)).toHaveCount(0);
  });

  test('TC-ADMIN-AJT-106 — Job specification file over 1MB is rejected with a size error', async ({
    jobTitlesPage,
    orangehrmAdminApi,
    page,
  }) => {
    const title = `MJT Suite Oversized File ${Date.now()}`;

    await jobTitlesPage.fillForm({ title });
    await jobTitlesPage.uploadSpecification(jobTitlesData.files.oversized);

    // Live inline error on the file field (verified message)
    await expect(jobTitlesPage.specificationFieldError).toHaveText(
      jobTitlesData.messages.attachmentSizeExceeded,
    );

    // Save is blocked client-side — stays on the form, record is never created
    await jobTitlesPage.saveButton.click();
    await expect(page).toHaveURL(jobTitlesData.urlPatterns.add);
    await expect(jobTitlesPage.specificationFieldError).toBeVisible();

    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    expect((await jobTitlesApi.getAll()).some((jt) => jt.title === title)).toBe(false);
  });

  test('TC-ADMIN-AJT-505 — Delete confirmation dialog: No keeps the row, Yes removes it', async ({
    jobTitlesPage,
    orangehrmAdminApi,
  }) => {
    const title = `MJT Suite Delete Dialog ${Date.now()}`;

    // Seed through the API — this test owns the dialog, not form mechanics
    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    await jobTitlesApi.create({ title, description: '', note: '' });

    await jobTitlesPage.gotoList();
    await expect(jobTitlesPage.rowByTitle(title).first()).toBeVisible();

    // -- Step 1: dialog renders the verified confirmation copy --
    await jobTitlesPage.openDeleteDialogForTitle(title);
    await expect(jobTitlesPage.deleteDialog).toContainText(jobTitlesData.deleteDialog.title);
    await expect(jobTitlesPage.deleteDialog).toContainText(jobTitlesData.deleteDialog.body);

    // -- Step 2: "No, Cancel" keeps the record --
    await jobTitlesPage.cancelDeleteButton.click();
    await expect(jobTitlesPage.deleteDialog).not.toBeVisible();
    await expect(jobTitlesPage.rowByTitle(title).first()).toBeVisible();

    // -- Step 3: "Yes, Delete" hard-deletes the record --
    await jobTitlesPage.deleteRowByTitle(title);
    await expect(jobTitlesPage.rowByTitle(title)).toHaveCount(0);
  });
});

// ─── P1: Integration — new title propagates to dependent modules ────────────
test.describe('Integration — new job title in Vacancy dropdown', () => {
  const integrationTitle = `MJT Suite Integration ${Date.now()}`;

  test.beforeAll(async ({ orangehrmAdminApi }) => {
    // Seed through the API — this test owns propagation, not form mechanics
    await orangehrmAdminApi.loginAsAdmin();
    const jobTitlesApi = new JobTitlesApi(orangehrmAdminApi.request);
    await jobTitlesApi.create({
      title: integrationTitle,
      description: '',
      note: '',
    });
    createdTitles.push(integrationTitle);
  });

  test('TC-ADMIN-AJT-004 — Newly created job title appears in the Add Vacancy dropdown', async ({
    loginPage,
    addVacancyPage,
    page,
  }) => {
    await loginPage.loginAs('admin');
    await addVacancyPage.gotoAddVacancy();

    await addVacancyPage.jobTitleGroup.locator('.oxd-select-text').click();
    await expect(page.getByRole('option', { name: integrationTitle, exact: true })).toBeVisible();
  });
});

// ─── P0: ESS security ───────────────────────────────────────────────────────
test.describe('Security — ESS cannot access Job Titles administration', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(ESS_TEST_USER.username, ESS_TEST_USER.password);
  });

  test('TC-ADMIN-AJT-201 — ESS user: no Admin menu; Job Title URLs render Credential Required', async ({
    jobTitlesPage,
    page,
  }) => {
    // -- Step 1: Admin module absent from the side navigation --
    await expect(jobTitlesPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: Deep link to the list renders no grid and no Add button --
    await jobTitlesPage.goto(jobTitlesData.routes.list);
    await expect(page.getByText(jobTitlesData.messages.credentialRequired)).toBeVisible();
    await expect(jobTitlesPage.addButton).not.toBeVisible();
    await expect(jobTitlesPage.tableRows).toHaveCount(0);

    // -- Step 3: Deep link to the add form renders no form --
    await jobTitlesPage.goto(jobTitlesData.routes.add);
    await expect(page.getByText(jobTitlesData.messages.credentialRequired)).toBeVisible();
    await expect(jobTitlesPage.saveButton).not.toBeVisible();
  });
});
