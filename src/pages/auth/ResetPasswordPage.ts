import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * "Reset Password" page (`/auth/requestPasswordResetCode`). On an instance without email
 * configured (current kord state), this page is informational only: a heading, the
 * email-not-configured message, and a "Click here" link back to the login page. No username
 * input or "Reset Password" submit button is rendered.
 */
export class ResetPasswordPage extends BasePage {
  readonly heading: Locator;
  readonly emailNotConfiguredMessage: Locator;
  readonly backToLoginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Reset Password' });
    this.emailNotConfiguredMessage = page.getByText(
      'The OrangeHRM system is not configured to receive email notifications',
    );
    this.backToLoginLink = page.getByText('Click here', { exact: true });
  }

  async goBackToLogin(): Promise<void> {
    await this.backToLoginLink.click();
  }
}
