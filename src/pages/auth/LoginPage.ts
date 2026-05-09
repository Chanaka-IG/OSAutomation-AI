import type { Locator } from '@playwright/test';
import { auth } from '../../../test-data/frontend/auth';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator = this.page.locator('input[name="username"]');
  readonly passwordInput: Locator = this.page.locator('input[name="password"]');
  readonly loginButton: Locator = this.page.getByRole('button', { name: 'Login' });

  async open(): Promise<void> {
    await this.page.goto(auth.routes.login, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
