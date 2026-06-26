import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { createLogger } from '../../src/lib/logger';

const { auth } = frontend;
const log = createLogger('login-reset-password');

/**
 * E2E coverage for Login and Reset Password (P0 + P1).
 * Source: docs/test-priority_Login and Reset password.md
 *  - TC-001 (+TC-002 menu), TC-003, TC-004, TC-101, TC-102, TC-200, TC-201,
 *    TC-203, TC-204, TC-300, TC-301, TC-302, TC-402, TC-502,
 *    TC-005 (+TC-100, TC-503, TC-006 reset-password flow)
 */

test.describe.configure({ timeout: 60_000 });

/** Set false in beforeAll if the disabled system user could not be seeded (gates TC-102). */
let disabledUserReady = false;

test.beforeAll(async ({ masterDataReadiness, orangehrmAdminApi, employees, users }) => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
  void masterDataReadiness;

  await orangehrmAdminApi.loginAsAdmin();

  // Seed a suite-owned employee + DISABLED system user for the "Account disabled" path (TC-102).
  // Resolve by full name (employeeId may be normalized by the server, so it is not a reliable key).
  await employees.createIfAbsent(auth.disabledUser.employee);
  const empNumber = await employees.getEmpNumberByFullName(
    auth.disabledUser.employee.firstName,
    auth.disabledUser.employee.lastName,
  );

  if (empNumber !== undefined) {
    // Recreate to guarantee the account is disabled regardless of prior runs.
    const existingId = await users.findIdByUsername(auth.disabledUser.username);
    if (existingId !== undefined) {
      await users.deleteByIds([existingId]);
    }
    await users.create({
      username: auth.disabledUser.username,
      password: auth.disabledUser.password,
      status: false,
      userRoleId: 2,
      empNumber,
    });
    disabledUserReady = true;
  } else {
    log.warn('Disabled user employee could not be resolved — TC-102 will be skipped.');
  }
});

test.afterAll(async ({ orangehrmAdminApi, employees, users }) => {
  if (!env.baseURL) return;
  await orangehrmAdminApi.loginAsAdmin();

  const userId = await users.findIdByUsername(auth.disabledUser.username);
  if (userId !== undefined) {
    await users.deleteByIds([userId]);
  }
  const empNumber = await employees.getEmpNumberByFullName(
    auth.disabledUser.employee.firstName,
    auth.disabledUser.employee.lastName,
  );
  if (empNumber !== undefined) {
    await employees.deleteEmployees([empNumber]);
  }
});

test.describe('Login and Reset Password', () => {
  test('TC-001 — Valid admin login redirects to dashboard with the Admin menu', async ({
    loginPage,
    page,
  }) => {
    await loginPage.loginAs('admin');

    await expect(page).toHaveURL(auth.urlPatterns.dashboard);
    // TC-002 — Admin-scoped side menu
    await expect(loginPage.mainMenuItem('Admin')).toBeVisible();
    await expect(loginPage.mainMenuItem('PIM')).toBeVisible();
  });

  test('TC-003 — ESS user logs in and sees the ESS-scoped menu', async ({ loginPage, page }) => {
    await loginPage.loginWithCredentials(auth.essTestUser.username, auth.essTestUser.password);

    await expect(page).toHaveURL(auth.urlPatterns.dashboard);
    await expect(loginPage.mainMenuItem('My Info')).toBeVisible();
    await expect(loginPage.mainMenuItem('Admin')).toHaveCount(0);
  });

  test('TC-004 — Logout returns the user to the login page', async ({ loginPage, page }) => {
    await loginPage.loginAs('admin');
    await loginPage.goto(auth.routes.logout);

    await expect(page).toHaveURL(auth.urlPatterns.login);
    await expect(loginPage.usernameInput).toBeVisible();
  });

  test('TC-300 — Wrong password shows "Invalid credentials"', async ({ loginPage, page }) => {
    const { username } = auth.getCredentials('admin');
    await loginPage.open();
    await loginPage.login(username, auth.samples.wrongPassword);

    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.invalidCredentials, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-301 — Non-existent username shows "Invalid credentials"', async ({ loginPage, page }) => {
    await loginPage.open();
    await loginPage.login(auth.samples.unknownUsername, auth.samples.wrongPassword);

    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.invalidCredentials, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-101 — Wrong username and wrong password produce the identical error (no enumeration)', async ({
    loginPage,
  }) => {
    const { username } = auth.getCredentials('admin');

    await loginPage.open();
    await loginPage.login(auth.samples.unknownUsername, auth.samples.wrongPassword);
    await expect(loginPage.loginErrorAlert).toBeVisible({ timeout: 10_000 });
    const unknownUserMsg = (await loginPage.loginErrorAlert.innerText()).trim();

    await loginPage.open();
    await loginPage.login(username, auth.samples.wrongPassword);
    await expect(loginPage.loginErrorAlert).toBeVisible({ timeout: 10_000 });
    const wrongPassMsg = (await loginPage.loginErrorAlert.innerText()).trim();

    expect(unknownUserMsg).toBe(wrongPassMsg);
    expect(unknownUserMsg).toBe(auth.messages.invalidCredentials);
  });

  test('TC-102 — Disabled account is rejected with "Account disabled"', async ({ loginPage, page }) => {
    test.skip(!disabledUserReady, 'Disabled system user could not be seeded.');

    await loginPage.open();
    await loginPage.login(auth.disabledUser.username, auth.disabledUser.password);

    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.accountDisabled, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-402 — SQL-like username is safely rejected with no auth bypass', async ({
    loginPage,
    page,
  }) => {
    await loginPage.open();
    await loginPage.login(auth.samples.sqlInjectionUsername, auth.samples.wrongPassword);

    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.invalidCredentials, {
      timeout: 10_000,
    });
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-302 — Empty submit shows "Required" under both fields', async ({ loginPage, page }) => {
    await loginPage.open();
    await loginPage.submitEmpty();

    await expect(loginPage.fieldErrors).toHaveCount(2);
    await expect(loginPage.fieldErrors.first()).toHaveText(auth.messages.required);
    await expect(loginPage.fieldErrors.last()).toHaveText(auth.messages.required);
    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-203 — Failed-login banner does not echo the submitted password', async ({
    loginPage,
    page,
  }) => {
    const { username } = auth.getCredentials('admin');
    await loginPage.open();
    await loginPage.login(username, auth.samples.wrongPassword);

    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.invalidCredentials, {
      timeout: 10_000,
    });
    await expect(page.locator('body')).not.toContainText(auth.samples.wrongPassword);
  });

  test('TC-204 — Credentials are submitted via POST, not in the URL', async ({ loginPage, page }) => {
    const { username, password } = auth.getCredentials('admin');
    await loginPage.open();

    const validateRequest = page.waitForRequest(/auth\/validate/);
    await loginPage.login(username, password);
    const request = await validateRequest;

    expect(request.method()).toBe('POST');
    expect(request.url()).not.toContain(password);
    await expect(page).toHaveURL(auth.urlPatterns.dashboard);
  });

  test('TC-200 — Unauthenticated deep link redirects to login', async ({ loginPage, page }) => {
    await page.context().clearCookies();
    await loginPage.goto(auth.routes.protectedDeepLink);

    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-201 — Accessing the dashboard after logout redirects to login', async ({
    loginPage,
    page,
  }) => {
    await loginPage.loginAs('admin');
    await loginPage.goto(auth.routes.logout);
    await loginPage.goto(auth.routes.dashboard);

    await expect(page).toHaveURL(auth.urlPatterns.login);
  });

  test('TC-502 — Error banner clears on a subsequent successful login', async ({
    loginPage,
    page,
  }) => {
    const { username, password } = auth.getCredentials('admin');

    await loginPage.open();
    await loginPage.login(username, auth.samples.wrongPassword);
    await expect(loginPage.loginErrorAlert).toHaveText(auth.messages.invalidCredentials, {
      timeout: 10_000,
    });

    await loginPage.usernameInput.fill(username);
    await loginPage.passwordInput.fill(password);
    await loginPage.loginButton.click();

    await expect(page).toHaveURL(auth.urlPatterns.dashboard);
    await expect(loginPage.loginErrorAlert).toHaveCount(0);
  });

  test('TC-005 — Reset Password page shows email-not-configured guidance and returns to login', async ({
    loginPage,
    resetPasswordPage,
    page,
  }) => {
    await loginPage.open();
    await loginPage.openResetPassword();

    await expect(page).toHaveURL(auth.urlPatterns.requestPasswordReset);
    await expect(resetPasswordPage.heading).toBeVisible();
    // TC-100 — email-not-configured message
    await expect(resetPasswordPage.emailNotConfiguredMessage).toBeVisible();
    // TC-503 — no login form rendered on the reset page
    await expect(loginPage.loginButton).toHaveCount(0);

    // TC-006 — "Click here" returns to the login page
    await resetPasswordPage.goBackToLogin();
    await expect(page).toHaveURL(auth.urlPatterns.login);
    await expect(loginPage.usernameInput).toBeVisible();
  });
});
