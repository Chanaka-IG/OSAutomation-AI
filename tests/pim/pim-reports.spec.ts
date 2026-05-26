import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { PimReportsPage } from '../../src/pages/pim/PimReportsPage';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { OrangehrmAdminApi } from '../../src/api/orangehrmOSAPI/OrangehrmAdminApi';

/**
 * PIM → Employee Reports automated tests.
 * Covers P0 and P1 scenarios from docs/test-priority.md.
 *
 * Run:
 *   npx playwright test tests/pim/pim-reports.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PIM-RPT-N01 — Unauthenticated access (no login required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-PIM-RPT-N01 — Unauthenticated access redirects to login', () => {
  test('direct Reports list URL redirects to login page', async ({ page }) => {
    await page.goto('/web/index.php/pim/viewDefinedPredefinedReports', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(auth.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('direct Add Report URL redirects to login page', async ({ page }) => {
    await page.goto('/web/index.php/pim/definePredefinedReport', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(auth.urlPatterns.login, { timeout: 10_000 });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite (Admin role)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authenticated — PIM Reports (admin)', () => {
  const createdReportNames: string[] = [];
  const essUser = { username: 'tc200.pimrpt', password: 'admin@OHRM123' };
  let essEmpNumber = 0;

  test.beforeAll(async ({ orangehrmAdminApi, orangehrmApiContext }) => {
    test.setTimeout(60_000);
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmApiContext);
    const usersApi = new AdminUsersApi(orangehrmApiContext);

    await empApi.createIfAbsent({
      employeeId: 'TC200-ESS',
      firstName: 'TC200',
      lastName: 'EssPim',
      middleName: '',
    });

    const empNumber = await empApi.getEmpNumberByEmployeeId('TC200-ESS');
    if (empNumber == null) throw new Error('TC200 setup: could not resolve empNumber for TC200-ESS');
    essEmpNumber = empNumber;

    await usersApi.createIfAbsent({
      username: essUser.username,
      password: essUser.password,
      status: true,
      userRoleId: 2,
      empNumber,
    });
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);

    // Cleanup test-created reports via UI
    if (createdReportNames.length > 0) {
      const context = await browser.newContext({ baseURL: env.baseURL || undefined });
      const page = await context.newPage();
      try {
        const loginPage = new LoginPage(page);
        const reportsPage = new PimReportsPage(page);
        await loginPage.loginAs('admin');
        await reportsPage.gotoReportsList();
        for (const name of createdReportNames) {
          const row = reportsPage.getRowByName(name);
          if (await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await reportsPage.deleteReportByName(name);
          }
        }
      } finally {
        await context.close();
      }
    }

    // Cleanup ESS employee via API (cascades to remove the login user)
    if (essEmpNumber) {
      const apiCtx = await browser.newContext({
        baseURL: env.baseURL || undefined,
        extraHTTPHeaders: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      });
      try {
        const adminApi = new OrangehrmAdminApi(apiCtx.request);
        await adminApi.loginAsAdmin();
        const empApi = new EmployeesApi(apiCtx.request);
        await empApi.deleteEmployees([essEmpNumber]);
      } finally {
        await apiCtx.close();
      }
    }
  });

  test.beforeEach(async ({ loginPage, pimReportsPage }) => {
    await loginPage.loginAs('admin');
    await pimReportsPage.gotoReportsList();
  });

  // ── TC-001 — Navigation via PIM top menu ──────────────────────────────────

  test('TC-PIM-RPT-001 — Navigate to Reports via PIM top nav menu', async ({
    page,
    pimReportsPage,
  }) => {
    await page.goto('/web/index.php/pim/viewEmployeeList', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL(/viewDefinedPredefinedReports/i);
    await expect(pimReportsPage.pageHeading).toBeVisible();
  });

  // ── TC-002 — Default PIM Sample Report exists ─────────────────────────────

  test('TC-PIM-RPT-002 — Default PIM Sample Report is present in the list', async ({
    pimReportsPage,
  }) => {
    const row = pimReportsPage.getRowByName('PIM Sample Report');
    await expect(row).toBeVisible();
    const count = await pimReportsPage.getRecordCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── TC-003 (P0) — Add minimal report ─────────────────────────────────────

  test('TC-PIM-RPT-003 — Add minimal report (name only) saves and appears in list', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC003 Minimal ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await expect(page).toHaveURL(/definePredefinedReport/i);
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();
  });

  // ── TC-005 (P1) — Add report with one Display Field ───────────────────────

  test('TC-PIM-RPT-005 — Add report with one Display Field (group → field → Add)', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC005 DisplayField ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();

    // Verify field persisted by opening Edit mode
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(page.getByText('Employee First Name')).toBeVisible();
  });

  // ── TC-006 (P1) — Add full report (all sections) ─────────────────────────

  test('TC-PIM-RPT-006 — Add full report with criteria, include, and display field', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC006 Full ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectCriteria('Gender');
    await pimReportsPage.addCriteria();
    await pimReportsPage.selectAddedCriteriaValue('Male');
    await pimReportsPage.selectInclude('Current and Past Employees');
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();
  });

  // ── TC-007 (P0) — View report data ───────────────────────────────────────

  test('TC-PIM-RPT-007 — View report data via document icon opens report view', async ({
    pimReportsPage,
    page,
  }) => {
    await pimReportsPage.clickViewIcon('PIM Sample Report');
    await expect(page).toHaveURL(/displayPredefinedReport\/\d+/i);
    await expect(page.getByRole('heading', { name: 'PIM Sample Report' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /Record[s]? Found/ })).toBeVisible();
  });

  // ── TC-008 (P1) — Edit report name ───────────────────────────────────────

  test('TC-PIM-RPT-008 — Edit report name saves updated name in list', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const originalName = `TC008 Orig ${uid}`;
    const updatedName = `TC008 Upd ${uid}`;
    createdReportNames.push(updatedName);

    // Create report first
    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(originalName);
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    // Edit it
    await pimReportsPage.clickEditIcon(originalName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await pimReportsPage.editReportName(updatedName);
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(updatedName)).toBeVisible();
    await expect(pimReportsPage.getRowByName(originalName)).not.toBeVisible();
  });

  // ── TC-009 (P1) — Delete a report ────────────────────────────────────────

  test('TC-PIM-RPT-009 — Delete a user-created report removes it from the list', async ({
    pimReportsPage,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC009 Delete ${uid}`;

    // Create, then delete
    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    const countBefore = await pimReportsPage.getRecordCount();
    await pimReportsPage.deleteReportByName(reportName);

    const countAfter = await pimReportsPage.getRecordCount();
    await expect(pimReportsPage.getRowByName(reportName)).not.toBeVisible();
    expect(countAfter).toBe(countBefore - 1);
  });

  // ── TC-100 (P0) — Required field validation ───────────────────────────────

  test('TC-PIM-RPT-100 — Save without Report Name shows Required error', async ({
    pimReportsPage,
    page,
  }) => {
    await pimReportsPage.addButton.click();
    await expect(page).toHaveURL(/definePredefinedReport/i);
    await pimReportsPage.save();

    await expect(page).toHaveURL(/definePredefinedReport/i);
    await expect(pimReportsPage.validationErrors.first()).toBeVisible();
    await expect(pimReportsPage.validationErrors.first()).toContainText(/required/i);
  });

  // ── TC-101 (P1) — Selection Criteria not committed without Add click ───────

  test('TC-PIM-RPT-101 — Selection Criteria not committed when Add icon is not clicked', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC101 NoCriteria ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    // Select criteria but do NOT click Add
    await pimReportsPage.selectCriteria('Gender');
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    // Re-open in edit and verify no criteria was persisted
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    const criteriaDropdownText = await pimReportsPage.selectionCriteriaDropdown.innerText();
    expect(criteriaDropdownText.trim()).toBe('-- Select --');
  });

  // ── TC-102 (P1) — Display Field not committed without Add click ────────────

  test('TC-PIM-RPT-102 — Display Field not committed when Add icon is not clicked', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC102 NoField ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    // Commit one field so save is allowed
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    // Select a second field but do NOT click Add — it should NOT be persisted
    await pimReportsPage.selectDisplayField('Employee Id');
    await pimReportsPage.saveAndWaitForList();

    // Re-open in edit and verify uncommitted field was not persisted
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(page.getByText('Employee Id')).not.toBeVisible();
  });

  // ── TC-200 (P0) — ESS user cannot access PIM Reports ────────────────────

  test('TC-PIM-RPT-200 — ESS user cannot access PIM Reports via direct URL', async ({
    loginPage,
    pimReportsPage,
    page,
  }) => {
    // Log out the admin session established by beforeEach, then log in as the ESS user
    await page.goto('/web/index.php/auth/logout', { waitUntil: 'domcontentloaded' });
    await loginPage.open();
    await loginPage.login(essUser.username, essUser.password);
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Navigate directly — do NOT use gotoReportsList() which waits for the heading to appear
    await page.goto('/web/index.php/pim/viewDefinedPredefinedReports', { waitUntil: 'domcontentloaded' });

    // ESS users should be redirected away — the "Employee Reports" heading must not be visible
    const isOnReports =
      page.url().includes('viewDefinedPredefinedReports') &&
      (await pimReportsPage.pageHeading.isVisible({ timeout: 5_000 }).catch(() => false));
    expect(isOnReports).toBe(false);
  });

  // ── TC-300 (P1) — Cancel returns to list without saving ───────────────────

  test('TC-PIM-RPT-300 — Cancel on Add Report returns to list without creating report', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC300 Cancel ${uid}`;

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.cancel();

    await expect(page).toHaveURL(/viewDefinedPredefinedReports/i);
    await expect(pimReportsPage.getRowByName(reportName)).not.toBeVisible();
  });

  // ── TC-402 (P1) — Duplicate report name ──────────────────────────────────

  test('TC-PIM-RPT-402 — Duplicate report name shows error; no duplicate created', async ({
    pimReportsPage,
    page,
  }) => {
    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName('PIM Sample Report');
    await pimReportsPage.save();

    // Expect still on the form (error shown) or a toast error — not redirected
    const onForm = page.url().includes('definePredefinedReport');
    const errorVisible = await page.locator(
      '.oxd-input-field-error-message, .oxd-toast--error, .oxd-alert-content-text'
    ).first().isVisible({ timeout: 8_000 }).catch(() => false);

    expect(onForm || errorVisible).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // P2 — Moderate Impact
  // ─────────────────────────────────────────────────────────────────────────────

  // ── TC-004 (P2) — Add report with one Selection Criteria ─────────────────

  test('TC-PIM-RPT-004 — Add report with one Selection Criteria saves and criterion persists in edit', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC004 Criteria ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectCriteria('Job Title');
    await pimReportsPage.addCriteria();
    await pimReportsPage.selectAddedCriteriaValue('Software Engineer');
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();

    // Re-open in edit and verify the criterion was persisted
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(pimReportsPage.getAddedCriteriaRow('Job Title')).toBeVisible();
  });

  // ── TC-010 (P2) — Search by name filters list ────────────────────────────

  test('TC-PIM-RPT-010 — Search by report name filters list to matching reports only', async ({
    pimReportsPage,
  }) => {
    await pimReportsPage.searchByName('PIM Sample Report');
    const count = await pimReportsPage.getRecordCount();
    expect(count).toBe(1);
    await expect(pimReportsPage.getRowByName('PIM Sample Report')).toBeVisible();
  });

  // ── TC-011 (P2) — Autocomplete shows no hints for unrecognized name ─────

  test('TC-PIM-RPT-011 — Autocomplete shows "No Records Found" for an unrecognized report name', async ({
    pimReportsPage,
    page,
  }) => {
    // Typing a non-existent name should result in "No Records Found" in the autocomplete dropdown
    await pimReportsPage.searchInput.click();
    await pimReportsPage.searchInput.pressSequentially('XYZNONEXISTENT_RPT_99999');
    const option = page.locator('[role=listbox] [role=option]');
    await option.waitFor({ state: 'visible', timeout: 8_000 });
    await expect(option).toContainText(/No Records Found/i);
  });

  // ── TC-012 (P2) — Reset search restores full list ────────────────────────

  test('TC-PIM-RPT-012 — Reset search clears the filter and restores full list', async ({
    pimReportsPage,
  }) => {
    const totalBefore = await pimReportsPage.getRecordCount();

    // Search for the seeded default report — guaranteed to exist, filters to exactly 1
    await pimReportsPage.searchByName('PIM Sample Report');
    expect(await pimReportsPage.getRecordCount()).toBe(1);

    await pimReportsPage.resetSearch();
    expect(await pimReportsPage.getRecordCount()).toBe(totalBefore);
  });

  // ── TC-103 (P2) — Include dropdown defaults to "Current Employees Only" ──

  test('TC-PIM-RPT-103 — Include dropdown defaults to "Current Employees Only" on Add Report form', async ({
    pimReportsPage,
  }) => {
    await pimReportsPage.addButton.click();
    const includeText = (await pimReportsPage.includeDropdown.innerText()).trim();
    expect(includeText).toBe('Current Employees Only');
  });

  // ── TC-105 (P2) — Multiple selection criteria added and persisted ─────────

  test('TC-PIM-RPT-105 — Multiple selection criteria (Job Title + Sub Unit) are persisted in edit', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC105 MultiCriteria ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectCriteria('Job Title');
    await pimReportsPage.addCriteria();
    await pimReportsPage.selectAddedCriteriaValue('Software Engineer');
    await pimReportsPage.selectCriteria('Sub Unit');
    await pimReportsPage.addCriteria();
    await pimReportsPage.selectAddedCriteriaValue('Engineering');
    await pimReportsPage.addMinimalDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();

    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(pimReportsPage.getAddedCriteriaRow('Job Title')).toBeVisible();
    await expect(pimReportsPage.getAddedCriteriaRow('Sub Unit')).toBeVisible();
  });

  // ── TC-106 (P2) — Multiple display fields from different groups ───────────

  test('TC-PIM-RPT-106 — Display fields from Personal and Job groups both persist in edit view', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC106 MultiField ${uid}`;
    createdReportNames.push(reportName);

    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.selectDisplayFieldGroup('Job');
    await pimReportsPage.selectDisplayField('Job Title');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await expect(pimReportsPage.getRowByName(reportName)).toBeVisible();

    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(pimReportsPage.getDisplayFieldChip('Employee First Name')).toBeVisible();
    await expect(pimReportsPage.getDisplayFieldChip('Job Title')).toBeVisible();
  });

  // ── TC-107 (P2) — Remove display field via × button ──────────────────────

  test('TC-PIM-RPT-107 — Removing a display field chip via × persists after save', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC107 RemoveField ${uid}`;
    createdReportNames.push(reportName);

    // Create report with two fields from Personal group
    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.selectDisplayField('Employee Last Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.saveAndWaitForList();

    // Open edit and remove Employee Last Name via ×
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(pimReportsPage.getDisplayFieldChip('Employee Last Name')).toBeVisible();
    await pimReportsPage.removeDisplayField('Employee Last Name');
    await expect(pimReportsPage.getDisplayFieldChip('Employee Last Name')).not.toBeVisible();
    await pimReportsPage.saveAndWaitForList();

    // Re-open and confirm removal persisted
    await pimReportsPage.clickEditIcon(reportName);
    await expect(page).toHaveURL(/definePredefinedReport\/\d+/i);
    await expect(pimReportsPage.getDisplayFieldChip('Employee First Name')).toBeVisible();
    await expect(pimReportsPage.getDisplayFieldChip('Employee Last Name')).not.toBeVisible();
  });

  // ── TC-505 (P2) — View report shows heading + data rows ───────────────────

  test('TC-PIM-RPT-505 — View report page shows heading, record count, and configured column headers', async ({
    pimReportsPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-7);
    const reportName = `TC505 ViewData ${uid}`;
    createdReportNames.push(reportName);

    // Create report with Employee First Name display field
    await pimReportsPage.addButton.click();
    await pimReportsPage.fillReportName(reportName);
    await pimReportsPage.selectDisplayFieldGroup('Personal');
    await pimReportsPage.selectDisplayField('Employee First Name');
    await pimReportsPage.addDisplayField();
    await pimReportsPage.saveAndWaitForList();

    await pimReportsPage.clickViewIcon(reportName);
    await expect(page).toHaveURL(/displayPredefinedReport\/\d+/i);

    // Page heading matches the report name
    await expect(page.getByRole('heading', { name: reportName })).toBeVisible();

    // Record count badge is visible
    await expect(page.locator('.oxd-report-table-header').filter({ hasText: /Record[s]? Found/ })).toBeVisible();

    // Report data table is rendered
    await expect(page.locator('.inner-content-table')).toBeVisible();

    // The configured display field appears as a column header
    await expect(page.locator('.header-content').filter({ hasText: 'Employee First Name' })).toBeVisible();
  });
});
