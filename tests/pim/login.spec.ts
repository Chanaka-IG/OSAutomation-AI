import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';

test.describe('PIM / Login', () => {
  test.beforeEach(async ({ masterDataReadiness }) => {
    test.skip(!env.baseURL, 'Set BASE_URL to your OrangeHRM URL.');
    void masterDataReadiness;
  });

  test('user signs in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.loginAs('admin');

    await expect(page).not.toHaveURL(frontend.auth.urlPatterns.login);
  });
});
