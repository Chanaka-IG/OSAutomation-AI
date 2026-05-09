import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';

test.describe('Leave', () => {
  test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to your app URL (e.g. OrangeHRM instance).');
  });

  test('leave list route loads', async ({ leaveModulePage }) => {
    await leaveModulePage.openLeaveList();
    await expect(leaveModulePage.page).toHaveURL(frontend.leave.urlPatterns.leaveList);
    await expect(leaveModulePage.page).not.toHaveURL(/\/login$/i);
  });
});
