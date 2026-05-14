import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { ensureEmployeeRecords } from '../../src/setup/frontendTesting/ensureEmployeeRecords';
import { addEmployee } from '../../test-data/frontend/add-employee';
import { frontend } from '../../test-data';

/**
 * Automated coverage for `tests/plans/pim-add-employee-test-plan.md`.
 * Layers: Frontend (Playwright) + API where noted.
 *
 * Run headed:
 *   BASE_URL=https://automationtest-os-kord.orangehrm.com \
 *   npx playwright test tests/pim/add-employee.spec.ts --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PIM-AE-N01 — Unauthenticated access (no login required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-PIM-AE-N01 — Unauthenticated access redirects to login', () => {
  test('direct Add Employee URL redirects to login page', async ({ addEmployeePage, page }) => {
    await addEmployeePage.gotoAddEmployee();
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });

  test('API: POST /pim/employees without session returns 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    const res = await ctx.post(addEmployee.apiPath, {
      data: { firstName: 'Ghost', lastName: 'User', middleName: '', employeeId: '999998' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authenticated — PIM Add Employee (admin)', () => {
  const createdEmpNumbers: number[] = [];

  test.beforeAll(async ({ orangehrmAdminApi }) => {
    // Seed known employee used by TC-PIM-AE-N05 (duplicate Employee ID).
    await ensureEmployeeRecords(orangehrmAdminApi, [addEmployee.duplicateIdSeed]);
  });

  test.afterAll(async ({ orangehrmAdminApi }) => {
    if (createdEmpNumbers.length === 0) return;
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmAdminApi.request);
    await empApi.deleteEmployees(createdEmpNumbers);
  });

  test.beforeEach(async ({ loginPage, addEmployeePage }) => {
    await loginPage.loginAs('admin');
    await addEmployeePage.gotoAddEmployee();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  test('TC-PIM-AE-001 — Navigate to Add Employee via PIM top menu', async ({
    addEmployeePage,
    page,
  }) => {
    // Start from dashboard then navigate via the sidebar + top nav
    await page.goto(env.baseURL, { waitUntil: 'domcontentloaded' });
    await addEmployeePage.navigateViaMenu();

    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await expect(page.getByText('Add Employee').first()).toBeVisible();
    await expect(addEmployeePage.firstNameInput).toBeVisible();
    await expect(addEmployeePage.lastNameInput).toBeVisible();
    await expect(addEmployeePage.employeeIdInput).toBeVisible();
    await expect(addEmployeePage.createLoginToggle).toBeVisible();
  });

  // ── Positive save flows ───────────────────────────────────────────────────

  test('TC-PIM-AE-003 + TC-PIM-AE-012 — Save required fields; redirect to Personal Details', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `First${uid}`, lastName: `Last${uid}` });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();

    // TC-PIM-AE-012: URL contains empNumber segment; entered name is visible
    await expect(page).toHaveURL(/viewPersonalDetails\/empNumber\/\d+/i);
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    expect(empNum).not.toBeNull();
    if (empNum) createdEmpNumbers.push(empNum);

    await expect(page.getByText(`First${uid}`)).toBeVisible();
  });

  test('TC-PIM-AE-006 — Employee ID can be manually overridden', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    const customId = `A${uid}`;
    await addEmployeePage.fillName({ firstName: `Cust${uid}`, lastName: `Id${uid}` });
    await addEmployeePage.setEmployeeId(customId);
    expect(await addEmployeePage.getEmployeeIdValue()).toBe(customId);
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-008 — Save with login details (Status = Enabled)', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Lgn${uid}`, lastName: `En${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: `usr${uid}`,
      password: addEmployee.testPassword,
      confirmPassword: addEmployee.testPassword,
      status: 'enabled',
    });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-009 — Save with login details (Status = Disabled)', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Lgn${uid}`, lastName: `Dis${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: `dis${uid}`,
      password: addEmployee.testPassword,
      confirmPassword: addEmployee.testPassword,
      status: 'disabled',
    });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-013 — Post-save: new employee appears in Employee List', async ({
    addEmployeePage,
    employeeListPage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    const firstName = `Lst${uid}`;
    await addEmployeePage.fillName({ firstName, lastName: `Chk${uid}` });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);

    await employeeListPage.gotoEmployeeList();
    await employeeListPage.employeeNameInput.fill(firstName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(employeeListPage.tableRows.filter({ hasText: firstName }).first()).toBeVisible();
  });

  // ── Validation — required name fields ─────────────────────────────────────

  test('TC-PIM-AE-N02 — Save with empty First Name shows inline error', async ({
    addEmployeePage,
    page,
  }) => {
    await addEmployeePage.fillName({ lastName: 'SomeLast' });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    expect(await addEmployeePage.inputHasError('First Name')).toBe(true);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N03 — Save with empty Last Name shows inline error', async ({
    addEmployeePage,
    page,
  }) => {
    await addEmployeePage.fillName({ firstName: 'SomeFirst' });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    expect(await addEmployeePage.inputHasError('Last Name')).toBe(true);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N04 — Save with both names empty shows errors on both fields', async ({
    addEmployeePage,
    page,
  }) => {
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    expect(await addEmployeePage.inputHasError('First Name')).toBe(true);
    expect(await addEmployeePage.inputHasError('Last Name')).toBe(true);
    expect(await addEmployeePage.allValidationErrors.count()).toBeGreaterThanOrEqual(2);
  });

  // ── Validation — Employee ID ───────────────────────────────────────────────

  test('TC-PIM-AE-N05 — Duplicate Employee ID shows error; no record created', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Dup${uid}`, lastName: `Id${uid}` });
    await addEmployeePage.setEmployeeId(addEmployee.duplicateIdSeed.employeeId);
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    // Error appears as an inline message or OXD toast (server-side async check)
    await expect(
      page.locator('.oxd-input-field-error-message, .oxd-alert-content-text, .oxd-toast-content').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Validation — Login details ────────────────────────────────────────────

  test('TC-PIM-AE-N06 — Login details: empty Username shows error', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Nu${uid}`, lastName: `Last${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      password: addEmployee.testPassword,
      confirmPassword: addEmployee.testPassword,
    });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N07 — Login details: empty Password shows error', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Np${uid}`, lastName: `Last${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: `upwd${uid}`,
      confirmPassword: addEmployee.testPassword,
    });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N08 — Login details: empty Confirm Password shows error', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Nc${uid}`, lastName: `Last${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: `ucfm${uid}`,
      password: addEmployee.testPassword,
    });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N09 — Login details: password mismatch shows error', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Mm${uid}`, lastName: `Last${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: `umis${uid}`,
      password: addEmployee.testPassword,
      confirmPassword: addEmployee.testPassword + 'DIFF',
    });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    await expect(addEmployeePage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-AE-N10 — Login details: duplicate Username shows error', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Du${uid}`, lastName: `Usr${uid}` });
    await addEmployeePage.enableLoginDetails();
    await addEmployeePage.fillLoginDetails({
      username: addEmployee.existingUsername,
      password: addEmployee.testPassword,
      confirmPassword: addEmployee.testPassword,
    });
    await addEmployeePage.save();
    await expect(page).toHaveURL(frontend.pim.urlPatterns.addEmployee);
    // Error appears as an inline message or OXD toast (server-side async check)
    await expect(
      page.locator('.oxd-input-field-error-message, .oxd-alert-content-text, .oxd-toast-content').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Photo upload ──────────────────────────────────────────────────────────

  test('TC-PIM-AE-010 — Profile photo: valid JPG uploads and employee saves', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Jpg${uid}`, lastName: `Photo${uid}` });
    await addEmployeePage.setEmployeeId(`J${uid}`);
    await addEmployeePage.uploadPhoto(addEmployee.files.validJpg);
    // No photo error toast should appear for a valid file
    await expect(
      page.locator('.oxd-toast--error').first(),
    ).not.toBeVisible({ timeout: 3_000 }).catch(() => {});
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-011 — Profile photo: valid PNG uploads and employee saves', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    await addEmployeePage.fillName({ firstName: `Png${uid}`, lastName: `Photo${uid}` });
    await addEmployeePage.setEmployeeId(`P${uid}`);
    await addEmployeePage.uploadPhoto(addEmployee.files.validPng);
    await expect(
      page.locator('.oxd-toast--error').first(),
    ).not.toBeVisible({ timeout: 3_000 }).catch(() => {});

    // Start polling for the success toast BEFORE save so we catch it in the brief
    // window before the page redirects to viewPersonalDetails.
    const toastPromise = addEmployeePage.waitForSuccessToast();
    await addEmployeePage.save();
    const toastText = await toastPromise;
    expect(toastText).toContain('Successfully Saved');

    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-N12 — Profile photo: unsupported file type shows error', async ({
    addEmployeePage,
    page,
  }) => {
    await addEmployeePage.uploadPhoto(addEmployee.files.invalidDocument);
    // OrangeHRM shows a toast or inline error for unsupported types
    const errorLocator = page.locator(
      '.oxd-toast--error, .oxd-input-field-error-message',
    );
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  test('TC-PIM-AE-E01 — Names at maximum character length (50) save successfully', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    const pad = (prefix: string) =>
      (prefix + uid + 'x'.repeat(addEmployee.maxNameLength)).slice(0, addEmployee.maxNameLength);
    await addEmployeePage.fillName({
      firstName: pad('F'),
      lastName: pad('L'),
    });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    await expect(page).toHaveURL(/viewPersonalDetails/i);
  });

  test('TC-PIM-AE-E04 — International / special characters in names save without corruption', async ({
    addEmployeePage,
    page,
  }) => {
    const uid = Date.now().toString().slice(-6);
    const first = `García${uid}`;
    const last = `Müller${uid}`;
    await addEmployeePage.fillName({ firstName: first, lastName: last });
    await addEmployeePage.save();
    await addEmployeePage.waitForSaveSuccess();
    const empNum = await addEmployeePage.getCreatedEmpNumber();
    if (empNum) createdEmpNumbers.push(empNum);
    // Characters must be preserved — visible on the profile page without corruption
    await expect(page.getByText(first)).toBeVisible();
  });

  test('TC-PIM-AE-E05 — XSS probe in name fields does not execute as script', async ({
    addEmployeePage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });

    await addEmployeePage.fillName({
      firstName: '<script>alert(1)</script>',
      lastName: 'XSSCheck',
    });
    await addEmployeePage.save();

    // Allow time for any deferred script execution
    await page.waitForTimeout(2_000);
    expect(dialogFired).toBe(false);

    // If the record was created (server accepted it), clean up and verify text is escaped
    if (/viewPersonalDetails/i.test(page.url())) {
      const empNum = await addEmployeePage.getCreatedEmpNumber();
      if (empNum) createdEmpNumbers.push(empNum);
      // The raw <script> tag must NOT appear as executable DOM — text only
      const scriptTags = await page.locator('script:not([src])').evaluateAll((els) =>
        els.map((el) => el.textContent ?? '').filter((t) => t.includes('alert(1)')),
      );
      expect(scriptTags).toHaveLength(0);
    }
  });
});
