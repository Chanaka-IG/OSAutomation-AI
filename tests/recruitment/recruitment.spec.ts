import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';

test.describe('Recruitment', () => {
  test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to your app URL (e.g. OrangeHRM instance).');
  });

  test('candidates route loads', async ({ recruitmentModulePage }) => {
    await recruitmentModulePage.openCandidates();
    await expect(recruitmentModulePage.page).toHaveURL(
      frontend.recruitment.urlPatterns.candidates,
    );
    await expect(recruitmentModulePage.page).not.toHaveURL(/\/login$/i);
  });
});
