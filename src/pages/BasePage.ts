import type { Locator, Page } from '@playwright/test';
import type { LoginRole } from '../../test-data/frontend/auth';
import { auth } from '../../test-data/frontend/auth';

export abstract class BasePage {
  constructor(public readonly page: Page) {}

  /** Relative paths use `baseURL` from automation.config; absolute URLs work as-is. */
  async goto(urlOrPath: string): Promise<void> {
    await this.page.goto(urlOrPath, { waitUntil: 'domcontentloaded' });
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Opens the login page and signs in using credentials from env for the given role.
   *
   * Env vars: **admin** — `OHRM_USERNAME` / `OHRM_PASSWORD` or `ADMIN_USERNAME` / `ADMIN_PASSWORD`;
   * **ess** — `OHRM_ESS_USERNAME` / `OHRM_ESS_PASSWORD`; **supervisor** —
   * `OHRM_SUPERVISOR_USERNAME` / `OHRM_SUPERVISOR_PASSWORD`.
   *
   * @throws If username or password is missing for that role.
   */
  async loginAs(role: LoginRole): Promise<void> {
    const { username, password } = auth.getCredentials(role);
    if (!username || !password) {
      throw new Error(
        `Missing credentials for role "${role}". Configure the OHRM_* / ADMIN_* environment variables.`,
      );
    }

    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });

    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
    await this.page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
    });
  }
}

