import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { ensurePimFilterEmployees } from '../../src/setup/frontendTesting/ensurePimFilterEmployees';
import { frontend } from '../../test-data';
import { leave } from '../../test-data/leave/frontend/leave';
import { pim } from '../../test-data/pim/frontend/pim';

/**
 * Automated coverage for `tests/plans/pim-employee-list-test-plan.md`.
 * Layers: **Frontend** (Playwright). Run headed: `npx playwright test tests/pim/employee-list.spec.ts --headed`.
 *
 * Filter scenarios use employees from `test-data/frontend-api/pim` only (seeded once in `beforeAll`); not master seed data.
 */

test.describe.configure({ timeout: 120_000 });

/** Every test in this file needs a target host (other describes add their own setup). */
test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

test.describe('TC-PIM-EL-N01 — Unauthenticated access redirects to login', () => {
  test('direct Employee List URL opens login', async ({ pimModulePage, page }) => {
    await pimModulePage.openEmployeeList();
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });

  test('after login, Employee List is reachable (continuation)', async ({
    loginPage,
    employeeListPage,
    page,
  }) => {
    await loginPage.loginAs('admin');
    await employeeListPage.gotoEmployeeList();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.employeeList);
  });
});

test.describe('Authenticated — PIM Employee List (admin)', () => {
  /**
   * Seed UI filter employees once per file (`test-data/frontend-api/pim` via Admin API).
   * `EmployeesApi.createIfAbsent` skips rows that already exist.
   */
  test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
    void masterDataReadiness;
    await ensurePimFilterEmployees(orangehrmAdminApi);
  });

  test.beforeEach(async ({ loginPage, employeeListPage, page }) => {
    await loginPage.loginAs('admin');
    await employeeListPage.gotoEmployeeList();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.employeeList);
  });

  test('TC-PIM-EL-001 — Employee List loads for admin', async ({ employeeListPage, page }) => {
    await expect(page.getByText(/employee list/i).first()).toBeVisible();

    const hasRow = await employeeListPage.tableRows.first().isVisible().catch(() => false);
    const emptyState = await page.getByText(/no records found|no records/i).first().isVisible().catch(() => false);
    expect(hasRow || emptyState).toBeTruthy();
  });

  test('TC-PIM-EL-002 — Sidebar navigation from Leave → PIM → Employee List', async ({
    employeeListPage,
    page,
  }) => {
    await page.goto(leave.routes.leaveList);
    await employeeListPage.openViaSidebar();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.employeeList);
    await expect(page.getByText(/employee list/i).first()).toBeVisible();
  });

  test('TC-PIM-EL-003 — Filter by Employee Name', async ({ employeeListPage, page }) => {
    await employeeListPage.employeeNameInput.fill(pim.samples.seededEmployeeName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const nameMatches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededEmployeeName, 'i'),
    });
    await expect(nameMatches.first()).toBeVisible();
    await expect(nameMatches).toHaveCount(2);

    await employeeListPage.clearEmployeeNameFilter();
    await employeeListPage.runSearch();
  });

  test('TC-PIM-EL-004 — Filter by Employee Id', async ({ employeeListPage, page }) => {
    await employeeListPage.employeeIdInput.fill(pim.samples.seededEmployeeId);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      employeeListPage.tableRows.filter({ hasText: pim.samples.seededEmployeeId }),
    ).toBeVisible();

    await employeeListPage.clearEmployeeIdFilter();
    await employeeListPage.runSearch();
  });

  test('TC-PIM-EL-005 — Pagination keeps filters (when pagination exists)', async ({
    employeeListPage,
    page,
  }) => {
    await employeeListPage.employeeNameInput.fill(pim.samples.seededEmployeeName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const nextBtn = employeeListPage.nextPageButton;
    if (!(await nextBtn.isVisible()) || !(await nextBtn.isEnabled())) {
      test.skip(true, 'Single page of results — pagination controls unavailable.');
    }

    await nextBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(employeeListPage.employeeNameInput).toHaveValue(pim.samples.seededEmployeeName);

    await employeeListPage.previousPageButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(employeeListPage.employeeNameInput).toHaveValue(pim.samples.seededEmployeeName);
  });

  test('TC-PIM-EL-006 — Add Employee opens add flow', async ({ employeeListPage, page }) => {
    await employeeListPage.addButton.click();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(frontend.pim.urlPatterns.employeeList);
    await employeeListPage.waitForListReady();
  });

  test('TC-PIM-EL-007 — Open first employee row', async ({ employeeListPage, page }) => {
    await employeeListPage.runSearch();

    const firstRow = employeeListPage.tableRows.first();
    await expect(firstRow).toBeVisible();

    const linkInRow = firstRow.getByRole('link').first();
    if (await linkInRow.isVisible()) {
      await linkInRow.click();
    } else {
      await firstRow.click();
    }

    await expect(page).not.toHaveURL(frontend.pim.urlPatterns.employeeList);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(frontend.pim.urlPatterns.employeeList);
    await employeeListPage.waitForListReady();
  });

  test('TC-PIM-EL-N02 — Session cleared redirects on reload', async ({ page }) => {
    await page.context().clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });

  test('TC-PIM-EL-N03 — Search with no matches shows empty / message', async ({
    employeeListPage,
    page,
  }) => {
    const nonsense = `zzz-no-match-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await employeeListPage.employeeNameInput.fill(nonsense);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.getByText(/no records found|no records|could not find/i).first(),
    ).toBeVisible();
  });

  test('TC-PIM-EL-N04 — XSS probe does not trigger alert dialog', async ({
    employeeListPage,
    page,
  }) => {
    let dialogSeen = false;
    page.once('dialog', (d) => {
      dialogSeen = true;
      void d.dismiss();
    });

    await employeeListPage.employeeNameInput.fill('<script>alert(1)</script>');
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    expect(dialogSeen).toBe(false);
  });

  test('TC-PIM-EL-E01 — Long / unicode filter input does not crash UI', async ({
    employeeListPage,
    page,
  }) => {
    const long = `${'αβγδ'.repeat(80)}`;
    await employeeListPage.employeeNameInput.fill(long);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(employeeListPage.searchButton).toBeVisible();
  });

  test('TC-PIM-EL-E02 — Pagination boundary buttons', async ({ employeeListPage, page }) => {
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const prev = employeeListPage.previousPageButton;
    const next = employeeListPage.nextPageButton;

    if (!(await next.isVisible())) {
      test.skip(true, 'Pagination not shown.');
    }

    await expect(prev).toBeDisabled();

    if (await next.isEnabled()) {
      await next.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(prev).toBeEnabled();
    }
  });

  test('TC-PIM-EL-E03 — Rapid filter changes settle on last search', async ({
    employeeListPage,
    page,
  }) => {
    await employeeListPage.employeeNameInput.fill('A');
    await employeeListPage.employeeNameInput.fill(pim.samples.seededEmployeeName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const nameMatches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededEmployeeName, 'i'),
    });
    await expect(nameMatches.first()).toBeVisible();
  });

  test('TC-PIM-EL-E05 — Column header sort interaction [if present]', async ({
    employeeListPage,
    page,
  }) => {
    const sortHeader = page.locator('.oxd-table-header-cell').filter({ hasText: /first name|last name|id/i }).first();
    if (!(await sortHeader.isVisible())) {
      test.skip(true, 'No matching sortable header found.');
    }

    await sortHeader.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(employeeListPage.tableRows.first()).toBeVisible();
  });

  test('TC-PIM-EL-008 — Filter by Job Title', async ({ employeeListPage, page }) => {
    await employeeListPage.selectJobTitle(pim.samples.seededJobTitle);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const matches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededEmployeeName, 'i'),
    });
    await expect(matches.first()).toBeVisible();
  });

  test('TC-PIM-EL-009 — Filter by Employment Status', async ({ employeeListPage, page }) => {
    await employeeListPage.selectEmploymentStatus(pim.samples.seededEmploymentStatus);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const matches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededEmployeeName, 'i'),
    });
    await expect(matches.first()).toBeVisible();
  });

  test('TC-PIM-EL-010 — Filter by Sub Unit', async ({ employeeListPage, page }) => {
    await employeeListPage.selectSubUnit(pim.samples.seededSubUnit);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const matches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededEmployeeName, 'i'),
    });
    await expect(matches.first()).toBeVisible();
  });

  test('TC-PIM-EL-011 — Filter by Supervisor Name', async ({ employeeListPage, page }) => {
    await employeeListPage.fillSupervisorName(pim.samples.seededSupervisorFirstName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    const matches = employeeListPage.tableRows.filter({
      hasText: new RegExp(pim.samples.seededSupervisedEmployeeLastName, 'i'),
    });
    await expect(matches.first()).toBeVisible();
  });

  test('TC-PIM-EL-012 — Filter by Employee ID validates all table row columns', async ({
    employeeListPage,
    page,
  }) => {
    await employeeListPage.employeeIdInput.fill(pim.samples.seededEmployeeId);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(employeeListPage.tableRows).toHaveCount(1);
    const row = employeeListPage.tableRows.first();

    const id = await employeeListPage.getRowCellText(row, 'Id');
    const firstMiddle = await employeeListPage.getRowCellText(row, 'First (& Middle) Name');
    const lastName = await employeeListPage.getRowCellText(row, 'Last Name');
    const jobTitle = await employeeListPage.getRowCellText(row, 'Job Title');
    const empStatus = await employeeListPage.getRowCellText(row, 'Employment Status');
    const subUnit = await employeeListPage.getRowCellText(row, 'Sub Unit');

    expect(id).toBe(pim.samples.seededEmployeeId);
    expect(firstMiddle).toBe(pim.samples.seededFirstMiddleName);
    expect(lastName).toBe(pim.samples.employeeLastName);
    expect(jobTitle).toBe(pim.samples.seededJobTitle);
    expect(empStatus).toBe(pim.samples.seededEmploymentStatus);
    expect(subUnit).toBe(pim.samples.seededSubUnit);
  });

  test('TC-PIM-EL-013 — Multiple filters combined narrow results to a single employee', async ({
    employeeListPage,
    page,
  }) => {
    // Name alone ("Olivia") matches two rows (Nguyen + Petrovic); combining job details narrows to one.
    await employeeListPage.employeeNameInput.fill(pim.samples.seededEmployeeName);
    await employeeListPage.selectJobTitle(pim.samples.seededJobTitle);
    await employeeListPage.selectEmploymentStatus(pim.samples.seededEmploymentStatus);
    await employeeListPage.selectSubUnit(pim.samples.seededSubUnit);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(employeeListPage.tableRows).toHaveCount(1);

    const row = employeeListPage.tableRows.first();
    await expect(row).toContainText(pim.samples.seededEmployeeId);
    await expect(row).toContainText(pim.samples.seededJobTitle);
    await expect(row).toContainText(pim.samples.seededEmploymentStatus);
    await expect(row).toContainText(pim.samples.seededSubUnit);
  });

  test('TC-PIM-EL-014 — Filter returning multiple records shows all rows with correct data', async ({
    employeeListPage,
    page,
  }) => {
    // Both Nguyen (061001 — QA Engineer) and Petrovic (061002 — UI Engineer) are in Engineering.
    // Filtering by Sub Unit returns both; each row is validated independently.
    await employeeListPage.selectSubUnit(pim.samples.seededSubUnit);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    await employeeListPage.validateTableRow(pim.samples.employeeLastName, {
      id: pim.samples.seededEmployeeId,
      jobTitle: pim.samples.seededJobTitle,
      employmentStatus: pim.samples.seededEmploymentStatus,
    });

    await employeeListPage.validateTableRow(pim.samples.seededSecondEmployeeLastName, {
      id: pim.samples.seededSecondEmployeeId,
      jobTitle: pim.samples.seededSecondJobTitle,
      employmentStatus: pim.samples.seededSecondEmploymentStatus,
    });
  });
});

test.describe('TC-PIM-EL-N05 — Non-admin access (instance-specific)', () => {
  test('ESS user — page responds without server error', async ({
    loginPage,
    page,
    employeeListPage,
    masterDataReadiness,
  }) => {
    void masterDataReadiness;
    test.skip(
      !frontend.auth.hasLoginCredentials('ess'),
      'Set OHRM_ESS_USERNAME and OHRM_ESS_PASSWORD for this case.',
    );

    await loginPage.loginAs('ess');
    await employeeListPage.gotoEmployeeList();

    await expect(page.locator('body')).not.toContainText(/internal server error|500/i);
  });
});
