import type { Locator, Page } from '@playwright/test';
import { auth } from '../../../test-data/auth';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  /** Red banner above the form on a rejected login (e.g. "Invalid credentials"). */
  readonly loginErrorAlert: Locator;
  /** "Forgot your password?" link below the Login button. */
  readonly forgotPasswordLink: Locator;
  /** Field-level validation messages (e.g. "Required") rendered under each input. */
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.loginErrorAlert = page.locator('.oxd-alert-content-text');
    this.forgotPasswordLink = page.getByText('Forgot your password?');
    this.fieldErrors = page.locator('.oxd-input-field-error-message');
  }

  async open(): Promise<void> {
    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** Submit the form without filling anything — used to trigger required-field validation. */
  async submitEmpty(): Promise<void> {
    await this.loginButton.click();
  }

  async openResetPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
