import { test } from '../../src/fixtures';
import { seedAllMasterData } from '../../src/setup/masterData';

/** Standalone run: seeds OrangeHRM master data (job titles, …). Execute via `node index.js` or Playwright. */
test.describe.configure({ mode: 'serial' });

test('seed master data', async ({ orangehrmAdminApi }) => {
  test.setTimeout(180_000);
  await seedAllMasterData(orangehrmAdminApi);
});
