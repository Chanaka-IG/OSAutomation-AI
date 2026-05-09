import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';

test.describe('PIM', () => {
  test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to your app URL (e.g. OrangeHRM instance).');
  });

  test('employee list route loads', async ({ pimModulePage }) => {
    await pimModulePage.openEmployeeList();
    await expect(pimModulePage.page).toHaveURL(frontend.pim.urlPatterns.employeeList);
    await expect(pimModulePage.page).not.toHaveURL(/\/login$/i);
  });
});
