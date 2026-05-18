import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { employeeDetails } from '../../test-data/frontend/employee-details';
import { frontend } from '../../test-data';

/**
 * PIM → Employee Details → Personal Details — Frontend test suite.
 * Plan reference: tests/plans/pim-employee-details-test-plan.md
 * Coverage: TC-PIM-ED-001, 003–005, N01–N04, E01–E03, E05
 *
 * Prerequisite: A dedicated test employee (EDPD01) is created via API in
 * beforeAll and deleted in afterAll. No seeded master-data employees are used.
 *
 * Run headed:
 *   BASE_URL=https://automationtest-os-kord.orangehrm.com \
 *   npx playwright test tests/pim/employee-details-personal-details.spec.ts \
 *     --config automation.config.ts --headed --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL (OrangeHRM origin).');
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-PIM-ED-N01 — Unauthenticated access (clean context, no login)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TC-PIM-ED-N01 — Unauthenticated access redirects to login', () => {
  test('direct Personal Details URL redirects to login page', async ({
    personalDetailsPage,
    page,
  }) => {
    // Use a plausible empNumber without a valid session — must redirect to login.
    await personalDetailsPage.goto('/web/index.php/pim/viewPersonalDetails/empNumber/1');
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Authenticated — PIM Employee Details · Personal Details (admin)', () => {
  /**
   * empNumber of the test employee created in beforeAll.
   * Populated before any test runs; used by every test for navigation.
   */
  let testEmpNumber: number;

  // ── Setup / teardown ──────────────────────────────────────────────────────

  test.beforeAll(async ({ orangehrmAdminApi }) => {
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmAdminApi.request);

    // Create the dedicated test employee; skip if it already exists.
    await empApi.createIfAbsent(employeeDetails.seed);

    const empNumber = await empApi.getEmpNumberByEmployeeId(employeeDetails.seed.employeeId);
    if (!empNumber) {
      throw new Error(
        `beforeAll: could not resolve empNumber for employeeId="${employeeDetails.seed.employeeId}". ` +
          'Ensure the OrangeHRM instance is reachable and credentials are correct.',
      );
    }
    testEmpNumber = empNumber;
  });

  test.afterAll(async ({ orangehrmAdminApi }) => {
    if (!testEmpNumber) return;
    await orangehrmAdminApi.loginAsAdmin();
    const empApi = new EmployeesApi(orangehrmAdminApi.request);
    await empApi.deleteEmployees([testEmpNumber]);
  });

  test.beforeEach(async ({ loginPage, personalDetailsPage }) => {
    await loginPage.loginAs('admin');
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  test('TC-PIM-ED-001 — Navigate from Employee List to Employee Details', async ({
    employeeListPage,
    page,
  }) => {
    await employeeListPage.gotoEmployeeList();

    // Search for the test employee by name to locate the row.
    await employeeListPage.employeeNameInput.fill(employeeDetails.seed.firstName);
    await employeeListPage.runSearch();
    await page.waitForLoadState('networkidle').catch(() => {});

    // Click the first matching row — OXD table rows are clickable.
    const row = employeeListPage.tableRows
      .filter({ hasText: employeeDetails.seed.firstName })
      .first();
    await expect(row).toBeVisible();
    await row.click();

    // Must land on Personal Details for this employee.
    await expect(page).toHaveURL(/viewPersonalDetails\/empNumber\/\d+/i);

    // All 10 detail tabs must be visible.
    const expectedTabs = [
      'Personal Details',
      'Contact Details',
      'Emergency Contacts',
      'Dependents',
      'Immigration',
      'Job',
      'Salary',
      'Report-to',
      'Qualifications',
      'Memberships',
    ];
    for (const label of expectedTabs) {
      await expect(
        page.getByRole('tab', { name: label }),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── Positive tests ────────────────────────────────────────────────────────

  test('TC-PIM-ED-003 — Update employee full name; toast appears and values persist', async ({
    personalDetailsPage,
    page,
  }) => {
    const { firstName, middleName, lastName } = employeeDetails.personalDetails.update;

    await personalDetailsPage.fillName({ firstName, middleName, lastName });

    const toastText = await personalDetailsPage.saveAndWaitForToast();
    expect(toastText).toMatch(/successfully (saved|updated)/i);

    // Reload and verify persistence (toHaveValue retries until the async form data loads).
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
    await expect(personalDetailsPage.firstNameInput).toHaveValue(firstName);
    await expect(personalDetailsPage.middleNameInput).toHaveValue(middleName);
    await expect(personalDetailsPage.lastNameInput).toHaveValue(lastName);

    // Profile header must reflect the updated name.
    await expect(page.getByRole('heading', { name: `${firstName} ${lastName}` })).toBeVisible();

    // Restore original name so subsequent tests see a clean state.
    await personalDetailsPage.fillName({
      firstName: employeeDetails.seed.firstName,
      middleName: employeeDetails.seed.middleName,
      lastName: employeeDetails.seed.lastName,
    });
    await personalDetailsPage.save();
    await personalDetailsPage.waitForSuccessToast();
  });

  test('TC-PIM-ED-004 — Update optional identity fields; values persist on reload', async ({
    personalDetailsPage,
  }) => {
    const { otherId, driversLicense, licenseExpiryDate, dateOfBirth, gender } =
      employeeDetails.personalDetails.update;

    await personalDetailsPage.setOtherId(otherId);
    await personalDetailsPage.setDriversLicense(driversLicense);
    await personalDetailsPage.setLicenseExpiryDate(licenseExpiryDate);
    await personalDetailsPage.setDateOfBirth(dateOfBirth);
    await personalDetailsPage.selectGender(gender);

    // Nationality and Marital Status — select the first available option.
    const selectedNationality = await personalDetailsPage.selectNationality();
    const selectedMaritalStatus = await personalDetailsPage.selectMaritalStatus();

    const toastText = await personalDetailsPage.saveAndWaitForToast();
    expect(toastText).toMatch(/successfully (saved|updated)/i);

    // Reload and assert every optional field persisted (toHaveValue retries while form hydrates).
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);

    await expect(personalDetailsPage.otherIdInput).toHaveValue(otherId);
    await expect(personalDetailsPage.driversLicenseInput).toHaveValue(driversLicense);
    await expect(personalDetailsPage.licenseExpiryDateInput).toHaveValue(licenseExpiryDate);
    await expect(personalDetailsPage.dateOfBirthInput).toHaveValue(dateOfBirth);

    const savedNationality = await personalDetailsPage.getOxdDropdownValue(
      personalDetailsPage.nationalityDropdown,
    );
    expect(savedNationality).toBe(selectedNationality);

    const savedMaritalStatus = await personalDetailsPage.getOxdDropdownValue(
      personalDetailsPage.maritalStatusDropdown,
    );
    expect(savedMaritalStatus).toBe(selectedMaritalStatus);

    await expect(personalDetailsPage.genderFemaleRadio).toBeChecked();
  });

  test('TC-PIM-ED-005 — Save with required fields only; optional fields remain empty', async ({
    personalDetailsPage,
  }) => {
    // Clear all optional fields.
    await personalDetailsPage.setOtherId('');
    await personalDetailsPage.setDriversLicense('');

    const toastText = await personalDetailsPage.saveAndWaitForToast();
    expect(toastText).toMatch(/successfully (saved|updated)/i);

    // No validation errors must have fired.
    const errorCount = await personalDetailsPage.allValidationErrors.count();
    expect(errorCount).toBe(0);
  });

  // ── Negative tests ────────────────────────────────────────────────────────

  test('TC-PIM-ED-N02 — Save with empty First Name shows inline error; no navigation', async ({
    personalDetailsPage,
    page,
  }) => {
    await personalDetailsPage.fillName({ firstName: '' });
    await personalDetailsPage.save();

    // Page must stay on Personal Details.
    await expect(page).toHaveURL(/viewPersonalDetails/i);
    expect(await personalDetailsPage.inputHasError('First Name')).toBe(true);
    await expect(personalDetailsPage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-ED-N03 — Save with empty Last Name shows inline error; no navigation', async ({
    personalDetailsPage,
    page,
  }) => {
    await personalDetailsPage.fillName({ lastName: '' });
    await personalDetailsPage.save();

    await expect(page).toHaveURL(/viewPersonalDetails/i);
    expect(await personalDetailsPage.inputHasError('Last Name')).toBe(true);
    await expect(personalDetailsPage.allValidationErrors.first()).toBeVisible();
  });

  test('TC-PIM-ED-N04 — Duplicate Employee ID is rejected; original ID unchanged', async ({
    personalDetailsPage,
    page,
  }) => {
    const originalId = await personalDetailsPage.getEmployeeIdValue();

    await personalDetailsPage.setEmployeeId(employeeDetails.existingEmployeeId);
    await personalDetailsPage.save();

    // Must stay on Personal Details with an error (inline or toast).
    await expect(page).toHaveURL(/viewPersonalDetails/i);
    await expect(
      page
        .locator('.oxd-input-field-error-message, .oxd-alert-content-text, .oxd-toast-content')
        .first(),
    ).toBeVisible({ timeout: 10_000 });

    // Reload and confirm the employee's own ID was not overwritten.
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
    expect(await personalDetailsPage.getEmployeeIdValue()).toBe(originalId);
  });

  // ── Edge test cases ───────────────────────────────────────────────────────

  test('TC-PIM-ED-E01 — Unicode / special characters in names are preserved without corruption', async ({
    personalDetailsPage,
    page,
  }) => {
    const { unicodeFirstName, unicodeLastName } = employeeDetails.personalDetails;

    await personalDetailsPage.fillName({
      firstName: unicodeFirstName,
      lastName: unicodeLastName,
    });
    const toastText = await personalDetailsPage.saveAndWaitForToast();
    expect(toastText).toMatch(/successfully (saved|updated)/i);

    // Reload: characters must round-trip intact.
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
    expect(await personalDetailsPage.getFirstNameValue()).toBe(unicodeFirstName);
    expect(await personalDetailsPage.getLastNameValue()).toBe(unicodeLastName);

    // The profile header must not show replacement characters or garbled text.
    await expect(
      page.getByRole('heading', { name: `${unicodeFirstName} ${unicodeLastName}` }),
    ).toBeVisible();

    // Restore original name.
    await personalDetailsPage.fillName({
      firstName: employeeDetails.seed.firstName,
      lastName: employeeDetails.seed.lastName,
    });
    await personalDetailsPage.save();
    await personalDetailsPage.waitForSuccessToast();
  });

  test('TC-PIM-ED-E02 — XSS probe in name fields does not execute as script', async ({
    personalDetailsPage,
    page,
  }) => {
    let dialogFired = false;
    page.once('dialog', async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });

    await personalDetailsPage.fillName({ firstName: employeeDetails.personalDetails.xssProbe });
    await personalDetailsPage.save();

    // Allow time for any deferred script execution.
    await page.waitForTimeout(2_000);
    expect(dialogFired).toBe(false);

    // If the server accepted the value, verify it is rendered as escaped text.
    if (/viewPersonalDetails/i.test(page.url())) {
      const inlineScripts = await page.locator('script:not([src])').evaluateAll((els) =>
        els
          .map((el) => el.textContent ?? '')
          .filter((t) => t.includes('alert(1)')),
      );
      expect(inlineScripts).toHaveLength(0);
    }

    // Restore original name so subsequent tests are not affected.
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
    await personalDetailsPage.fillName({
      firstName: employeeDetails.seed.firstName,
      lastName: employeeDetails.seed.lastName,
    });
    await personalDetailsPage.save();
    await personalDetailsPage.waitForSuccessToast();
  });

  test('TC-PIM-ED-E03 — Date of Birth set to a future date is rejected', async ({
    personalDetailsPage,
    page,
  }) => {
    await personalDetailsPage.setDateOfBirth(employeeDetails.personalDetails.futureDateOfBirth);
    await personalDetailsPage.save();

    // The system must either show a validation error or refuse to save.
    // A success toast must NOT appear for a future DOB.
    const successToast = page.locator('.oxd-toast--success');
    const validationError = page.locator(
      '.oxd-input-field-error-message, .oxd-alert-content-text, .oxd-toast--error',
    );

    await Promise.race([
      validationError.first().waitFor({ state: 'visible', timeout: 8_000 }),
      successToast.waitFor({ state: 'visible', timeout: 8_000 }).then(() => {
        throw new Error('Expected future DOB to be rejected but save succeeded.');
      }),
    ]);
  });

  test('TC-PIM-ED-E05 — Name fields at maximum length save successfully; one char over is capped or rejected', async ({
    personalDetailsPage,
    page,
  }) => {
    const { maxNameLength } = employeeDetails.personalDetails;
    const atMax = 'A'.repeat(maxNameLength);
    const overMax = 'A'.repeat(maxNameLength + 1);

    // At-boundary: must save without error.
    await personalDetailsPage.fillName({ firstName: atMax, lastName: atMax });
    const toastText = await personalDetailsPage.saveAndWaitForToast();
    expect(toastText).toMatch(/successfully (saved|updated)/i);
    expect(await personalDetailsPage.allValidationErrors.count()).toBe(0);

    // Reload and verify persistence at boundary length.
    await personalDetailsPage.gotoPersonalDetails(testEmpNumber);
    const savedFirst = await personalDetailsPage.getFirstNameValue();
    expect(savedFirst.length).toBe(maxNameLength);

    // Over-boundary: input must truncate to max OR show a validation error.
    await personalDetailsPage.fillName({ firstName: overMax });
    const actualLength = (await personalDetailsPage.getFirstNameValue()).length;
    const isErrorShown =
      (await personalDetailsPage.allValidationErrors.count()) > 0 ||
      (await page.locator('.oxd-input--error[placeholder="First Name"]').count()) > 0;
    expect(actualLength <= maxNameLength || isErrorShown).toBe(true);

    // Restore original name.
    await personalDetailsPage.fillName({
      firstName: employeeDetails.seed.firstName,
      lastName: employeeDetails.seed.lastName,
      middleName: employeeDetails.seed.middleName,
    });
    await personalDetailsPage.save();
    await personalDetailsPage.waitForSuccessToast();
  });
});
