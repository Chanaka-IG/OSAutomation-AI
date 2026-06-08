import type { Locator, Page } from '@playwright/test';
import type { LoginRole } from '../../test-data/auth';
import { auth } from '../../test-data/auth';
import { expect } from '@playwright/test';

export abstract class BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly tableLoader: Locator
  readonly formLoader: Locator;
  readonly dropdownFirstOption: Locator;

  constructor(public readonly page: Page) {
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.tableLoader = page.locator('.oxd-table-loader');
    this.formLoader = page.locator('.oxd-loading-spinner');
    this.dropdownFirstOption = page.getByRole('option', { name: '-- Select --' })

  }

  /** Relative paths use `baseURL` from automation.config; absolute URLs work as-is. */
  async goto(urlOrPath: string): Promise<void> {
    await this.page.goto(urlOrPath, { waitUntil: 'domcontentloaded' });
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /** Left side-nav (OXD main menu) item matched by its visible label. */
  mainMenuItem(name: string): Locator {
    return this.page.locator('.oxd-main-menu-item').filter({ hasText: name });
  }

  async waitForSuccessToast(timeout = 10_000): Promise<string> {
    const toast = this.page.locator('.oxd-toast--success');
    await toast.waitFor({ state: 'visible', timeout });
    return (await toast.innerText()).trim();
  }

  async loginAs(role: LoginRole): Promise<void> {
    const { username, password } = auth.getCredentials(role);
    if (!username || !password) {
      throw new Error(
        `Missing credentials for role "${role}". Configure the OHRM_* / ADMIN_* environment variables.`,
      );
    }
    await this.loginWithCredentials(username, password);
  }

  /**
   * Log in with explicit credentials (for dynamically-seeded users not covered by the
   * env-configured roles, e.g. a per-suite ESS account). Clears existing cookies first so
   * it can switch users mid-test, and waits until the app navigates off the login page.
   */
  async loginWithCredentials(username: string, password: string): Promise<void> {
    if (!username || !password) {
      throw new Error('loginWithCredentials requires a non-empty username and password.');
    }
    await this.page.context().clearCookies();
    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  }

  async waitUntilTableLoaderDissapear(): Promise<void> {

    try {
      await this.tableLoader.waitFor({ state: 'visible', timeout: 2000 });
      await this.tableLoader.waitFor({ state: 'detached' });
    }
    catch {
      //ignore silently if the loader did not appear rather than failing the test, as in some cases the loader may not appear based on the response time of the application
    }
  }

  async waitUntilMultipleTableLoaderDissapear(): Promise<void> {
    const loaders = this.page.locator('.oxd-table-loader');
    await expect(loaders).toHaveCount(0);
  }

  async waitUntilFormLoaderDissapear(): Promise<void> {
    try {
      await this.formLoader.waitFor({ state: 'visible', timeout: 2000 });
      await this.formLoader.waitFor({ state: 'hidden' });
    }
    catch {
      //ignore silently if the loader did not appear rather than failing the test, as in some cases the loader may not appear based on the response time of the application
    }

  }
  async selectOxdOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  async getOxdDropdownOptions(dropdown: Locator): Promise<string[]> {
    await dropdown.click();
    await this.dropdownFirstOption.waitFor({state: 'visible', timeout: 3000})
    const jobTitles = await this.page
      .getByRole('option')
      .allTextContents();

    jobTitles.shift();
    return jobTitles.map(text => text.trim());
  }

}

