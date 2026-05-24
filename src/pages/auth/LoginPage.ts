import { auth } from '../../../test-data/auth';
import { BasePage } from '../BasePage';

export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
