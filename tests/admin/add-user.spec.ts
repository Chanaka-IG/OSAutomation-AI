import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { AdminUsersApi } from '../../src/api/orangehrmOSAPI/AdminUsersApi';
import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';

/**
 * E2E coverage for Add Users (Admin → User Management → Users) — P0 + P1 + P2.
 * Covers: TC-001 (+401/503/504/505), TC-002 (+402), TC-003 (+106), TC-004,
 * TC-102 (+404), TC-105, TC-201, TC-300 combined validation (301/302/303/403
 * /103/104/304/101), TC-501.
 * Source: docs/test-priority_Add users.md
 *
 * Run:
 *   npx playwright test tests/admin/add-user.spec.ts --config automation.config.ts --project=chromium
 */

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const usersData = frontend.adminSystemUsers;
const STAMP = Date.now();

// ─── Suite-owned test data ──────────────────────────────────────────────────
/** PIM employee every created user links to (User.empNumber is mandatory). */
const SUITE_EMPLOYEE = {
  // Max 10 chars accepted by POST /pim/employees — keep it short but unique per run
  employeeId: `A${String(STAMP).slice(-8)}`,
  firstName: 'Adduser',
  lastName: `Suite${STAMP}`,
  middleName: '',
};
const SUITE_EMPLOYEE_FULL_NAME = `${SUITE_EMPLOYEE.firstName} ${SUITE_EMPLOYEE.lastName}`;

/** API-owned accounts seeded once in beforeAll; tests only consume them. */
const SEEDED_USERS = {
  /** TC-003: enabled ESS account that logs in through the UI. */
  login: { username: `loginuser.${STAMP}`, status: true },
  /** TC-105: disabled ESS account whose login must be rejected. */
  disabled: { username: `disabled.${STAMP}`, status: false },
  /** TC-004: enabled ESS account found via the list Username filter. */
  search: { username: `search.${STAMP}`, status: true },
} as const;

/** Usernames created during the run; resolved to ids and hard-deleted in afterAll. */
const createdUsernames: string[] = [];
let suiteEmpNumber: number;

test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});

test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  void masterDataReadiness;
  await orangehrmAdminApi.loginAsAdmin();
  const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
  await employeesApi.create(SUITE_EMPLOYEE);
  const empNumber = await employeesApi.getEmpNumberByEmployeeId(SUITE_EMPLOYEE.employeeId);
  if (!empNumber) throw new Error('Suite employee was not created — cannot run Add User suite.');
  suiteEmpNumber = empNumber;

  const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
  for (const seed of Object.values(SEEDED_USERS)) {
    await usersApi.create({
      username: seed.username,
      password: usersData.samples.strongPassword,
      status: seed.status,
      userRoleId: 2,
      empNumber: suiteEmpNumber,
    });
    createdUsernames.push(seed.username);
  }
});

test.afterAll(async ({ orangehrmAdminApi }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
  const all = await usersApi.getAll();
  const ids = all
    .filter((u) => createdUsernames.some((name) => name.toLowerCase() === u.userName.toLowerCase()))
    .map((u) => u.id);
  await usersApi.deleteByIds(ids);
  if (suiteEmpNumber) {
    const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
    await employeesApi.deleteEmployees([suiteEmpNumber]);
  }
});

// ─── Admin — Add User form ──────────────────────────────────────────────────
test.describe('Admin — Add User form', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAs('admin');
  });

  // ── P0 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AU-001 — Add ESS user (5-char min username) saves, toasts, and lists', async ({
    systemUsersPage,
    page,
  }) => {
    // Folds TC-401: exactly 5 characters — the documented minimum
    const username = `u${STAMP.toString(36).slice(-4)}`;

    // -- Step 1: capture the Records Found count before creating --
    await systemUsersPage.gotoList();
    const countBefore = await systemUsersPage.recordsFoundCount();

    // -- Step 2: fill the Add User form --
    await systemUsersPage.gotoAddForm();
    await expect(systemUsersPage.addFormHeading).toBeVisible();
    await systemUsersPage.selectUserRole('ESS');

    // Folds TC-503: the autocomplete suggests the employee before we click it
    await systemUsersPage.employeeNameInput.fill(SUITE_EMPLOYEE.firstName);
    const employeeHint = systemUsersPage.autocompleteOption(SUITE_EMPLOYEE_FULL_NAME);
    await expect(employeeHint).toBeVisible();
    await employeeHint.click();

    await systemUsersPage.selectStatus('Enabled');
    await systemUsersPage.usernameField.fill(username);
    await systemUsersPage.passwordField.fill(usersData.samples.strongPassword);
    await systemUsersPage.confirmPasswordField.fill(usersData.samples.strongPassword);

    // -- Step 3: save — folds TC-505 (toast) and redirect back to the list --
    const toast = await systemUsersPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);
    createdUsernames.push(username);
    await expect(page).toHaveURL(usersData.urlPatterns.list);

    // -- Step 4: new row lists username, role, employee, status; count incremented --
    const row = systemUsersPage.rowByUsername(username).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('ESS');
    await expect(row).toContainText(SUITE_EMPLOYEE_FULL_NAME);
    await expect(row).toContainText('Enabled');
    expect(await systemUsersPage.recordsFoundCount()).toBe(countBefore + 1);
  });

  test('TC-ADMIN-AU-003 — Newly created enabled ESS user can log in and sees no Admin menu', async ({
    loginPage,
    page,
  }) => {
    // Seeded through the API in beforeAll — this test owns the login outcome, not form mechanics
    const { username } = SEEDED_USERS.login;

    // -- Step 1: the new user authenticates successfully --
    await loginPage.loginWithCredentials(username, usersData.samples.strongPassword);
    await expect(page).toHaveURL(usersData.urlPatterns.dashboard);

    // -- Step 2 (folds TC-106): ESS role scopes the menu — no Admin/PIM, My Info present --
    await expect(loginPage.mainMenuItem('My Info')).toBeVisible();
    await expect(loginPage.mainMenuItem('Admin')).toHaveCount(0);
    await expect(loginPage.mainMenuItem('PIM')).toHaveCount(0);
  });

  test('TC-ADMIN-AU-102 — Duplicate username shows live "Already exists" (case-insensitive) and blocks save', async ({
    systemUsersPage,
    orangehrmAdminApi,
    page,
  }) => {
    await systemUsersPage.gotoAddForm();
    const duplicate = usersData.masterData.duplicateUsername;

    // Exact-case duplicate — error fires while typing, before any save
    await systemUsersPage.usernameField.fill(duplicate);
    await expect(systemUsersPage.usernameFieldError).toHaveText(usersData.messages.alreadyExists);

    // Folds TC-404: upper-case variant is also flagged (case-insensitive uniqueness)
    await systemUsersPage.usernameField.fill(duplicate.toUpperCase());
    await expect(systemUsersPage.usernameFieldError).toHaveText(usersData.messages.alreadyExists);

    // Save with the error present must not create a duplicate
    await systemUsersPage.saveButton.click();
    await expect(page).toHaveURL(usersData.urlPatterns.add);
    await expect(systemUsersPage.usernameFieldError).toBeVisible();

    await orangehrmAdminApi.loginAsAdmin();
    const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
    const matches = (await usersApi.getAll()).filter(
      (u) => u.userName.toLowerCase() === duplicate.toLowerCase(),
    );
    expect(matches).toHaveLength(1);
  });

  test('TC-ADMIN-AU-105 — User created as Disabled cannot log in', async ({
    loginPage,
    page,
  }) => {
    // Seeded through the API in beforeAll with status: false
    const { username } = SEEDED_USERS.disabled;

    // Attempt login with valid credentials of the disabled account
    await page.context().clearCookies();
    await loginPage.open();
    await loginPage.login(username, usersData.samples.strongPassword);

    // Rejected: stays on the login page with the disabled-account alert
    await expect(loginPage.loginErrorAlert).toHaveText('Account disabled');
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);
  });

  // ── P1 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AU-002 — Add Admin-role user (40-char max username) lists with role Admin', async ({
    systemUsersPage,
    page,
  }) => {
    // Folds TC-402: exactly 40 characters — the documented maximum
    const username = `adminuser40.${STAMP}`.padEnd(40, 'x');
    expect(username).toHaveLength(40);

    await systemUsersPage.gotoAddForm();
    await systemUsersPage.fillForm({
      role: 'Admin',
      employeeQuery: SUITE_EMPLOYEE.firstName,
      employeeFullName: SUITE_EMPLOYEE_FULL_NAME,
      status: 'Enabled',
      username,
      password: usersData.samples.strongPassword,
      confirmPassword: usersData.samples.strongPassword,
    });

    const toast = await systemUsersPage.saveAndWaitForToast();
    expect(toast).toMatch(/successfully saved/i);
    createdUsernames.push(username);
    await expect(page).toHaveURL(usersData.urlPatterns.list);

    const row = systemUsersPage.rowByUsername(username).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Admin');
  });

  test('TC-ADMIN-AU-300 — Combined validation: Required set, username bounds, password rules, unbound autocomplete', async ({
    systemUsersPage,
    page,
  }) => {
    await systemUsersPage.gotoAddForm();

    // -- Step 1: empty save shows Required under every field (TC-301/101) --
    // Confirm Password is the verified exception: it renders "Passwords do not match".
    await systemUsersPage.saveButton.click();
    await expect(systemUsersPage.userRoleFieldError).toHaveText(usersData.messages.required);
    await expect(systemUsersPage.employeeNameFieldError).toHaveText(usersData.messages.required);
    await expect(systemUsersPage.statusFieldError).toHaveText(usersData.messages.required);
    await expect(systemUsersPage.usernameFieldError).toHaveText(usersData.messages.required);
    await expect(systemUsersPage.passwordFieldError).toHaveText(usersData.messages.required);
    await expect(systemUsersPage.confirmPasswordFieldError).toHaveText(
      usersData.messages.passwordsDoNotMatch,
    );

    // -- Step 2: username boundaries (TC-302 below min, TC-403 above max) --
    await systemUsersPage.usernameField.fill(usersData.samples.tooShortUsername);
    await expect(systemUsersPage.usernameFieldError).toHaveText(
      usersData.messages.usernameMinLength,
    );
    await systemUsersPage.usernameField.fill(usersData.samples.overlongUsername);
    await expect(systemUsersPage.usernameFieldError).toHaveText(
      usersData.messages.usernameMaxLength,
    );

    // -- Step 3: password rules (TC-303 length, TC-103 strength) --
    await systemUsersPage.passwordField.fill(usersData.samples.weakShortPassword);
    await expect(systemUsersPage.passwordFieldError).toHaveText(
      usersData.messages.passwordMinLength,
    );
    await systemUsersPage.passwordField.fill(usersData.samples.noUpperCasePassword);
    await expect(systemUsersPage.passwordFieldError).toHaveText(
      usersData.messages.passwordNeedsUpperCase,
    );

    // -- Step 4: confirm-password mismatch against a strong password (TC-104) --
    await systemUsersPage.passwordField.fill(usersData.samples.strongPassword);
    await systemUsersPage.confirmPasswordField.fill(`${usersData.samples.strongPassword}x`);
    await expect(systemUsersPage.confirmPasswordFieldError).toHaveText(
      usersData.messages.passwordsDoNotMatch,
    );

    // -- Step 5: autocomplete — unknown employee + unbound free text (TC-304) --
    await systemUsersPage.employeeNameInput.fill(usersData.samples.unknownEmployeeQuery);
    await expect(
      systemUsersPage.autocompleteOption(usersData.messages.noRecordsFound),
    ).toBeVisible();
    await systemUsersPage.usernameField.click(); // blur without selecting a hint
    await expect(systemUsersPage.employeeNameFieldError).toHaveText(usersData.messages.invalid);

    // -- Step 6: save with errors present stays on the form --
    await systemUsersPage.saveButton.click();
    await expect(page).toHaveURL(usersData.urlPatterns.add);
  });

  test('TC-ADMIN-AU-004 — Created user is findable via the Username search filter', async ({
    systemUsersPage,
  }) => {
    // Seeded through the API in beforeAll — this test owns the list filter, not form mechanics
    const { username } = SEEDED_USERS.search;

    await systemUsersPage.gotoList();
    await systemUsersPage.searchByUsername(username);

    await expect(systemUsersPage.tableRows).toHaveCount(1);
    const row = systemUsersPage.tableRows.first();
    await expect(row).toContainText(username);
    await expect(row).toContainText(SUITE_EMPLOYEE_FULL_NAME);
  });

  // ── P2 ──────────────────────────────────────────────────────────────────

  test('TC-ADMIN-AU-501 — Cancel returns to the list without creating a record', async ({
    systemUsersPage,
    orangehrmAdminApi,
    page,
  }) => {
    const username = `cancelled.${STAMP}`;

    await systemUsersPage.gotoAddForm();
    await systemUsersPage.fillForm({
      role: 'ESS',
      status: 'Enabled',
      username,
    });
    await systemUsersPage.cancelButton.click();

    await expect(page).toHaveURL(usersData.urlPatterns.list);
    await systemUsersPage.waitUntilTableLoaderDissapear();

    await orangehrmAdminApi.loginAsAdmin();
    const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
    expect(await usersApi.findIdByUsername(username)).toBeUndefined();
  });
});

// ─── P0: ESS security ───────────────────────────────────────────────────────
test.describe('Security — ESS cannot access System Users administration', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginWithCredentials(
      frontend.auth.essTestUser.username,
      frontend.auth.essTestUser.password,
    );
  });

  test('TC-ADMIN-AU-201 — ESS user: no Admin menu; System Users URLs render Credential Required', async ({
    systemUsersPage,
    page,
  }) => {
    // -- Step 1: Admin module absent from the side navigation --
    await expect(systemUsersPage.mainMenuItem('Admin')).toHaveCount(0);

    // -- Step 2: deep link to the list renders no grid and no Add button --
    await systemUsersPage.goto(usersData.routes.list);
    await expect(page.getByText(usersData.messages.credentialRequired)).toBeVisible();
    await expect(systemUsersPage.addButton).not.toBeVisible();
    await expect(systemUsersPage.tableRows).toHaveCount(0);

    // -- Step 3: deep link to the add form renders no form --
    await systemUsersPage.goto(usersData.routes.add);
    await expect(page.getByText(usersData.messages.credentialRequired)).toBeVisible();
    await expect(systemUsersPage.saveButton).not.toBeVisible();
  });
});
