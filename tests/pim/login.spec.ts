import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';

test.describe('PIM / Login', () => {
  test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to your OrangeHRM URL.');
  });

  test('user signs in with valid credentials', async ({ loginPage, page }) => {
    test.setTimeout(120_000);
    const { username, password } = frontend.auth.credentials;

    await loginPage.open();
    await expect(page).toHaveURL(frontend.auth.urlPatterns.login);

    await loginPage.login(username, password);

    await expect(page).not.toHaveURL(frontend.auth.urlPatterns.login, {
      timeout: 60_000,
    });
  });
});
