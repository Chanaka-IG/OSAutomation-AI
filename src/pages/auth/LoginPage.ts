import type { Locator, Page } from '@playwright/test';
import { auth } from '../../../test-data/auth';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  /** Red banner above the form on a rejected login (e.g. "Invalid credentials"). */
  readonly loginErrorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.loginErrorAlert = page.locator('.oxd-alert-content-text');
  }

  async open(): Promise<void> {
    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
