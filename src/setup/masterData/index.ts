import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { seedJobTitles } from './jobTitles';
import { seedLocations } from './locations';

/**
 * Single entry point for OrangeHRM master data seeding before UI/API tests.
 *
 * Logs in as admin once, then runs domain seeds (`jobTitles.ts`, `locations.ts`, …).
 * Domain helpers assume an authenticated {@link OrangehrmAdminApi} session — call them only
 * after {@link seedAllMasterData}, or call {@link OrangehrmAdminApi.loginAsAdmin} yourself first.
 *
 * @example
 * import { seedAllMasterData } from '../../setup/masterData';
 * test.beforeEach(async ({ orangehrmAdminApi }) => {
 *   await seedAllMasterData(orangehrmAdminApi);
 * });
 */
export async function seedAllMasterData(adminApi: OrangehrmAdminApi): Promise<void> {
  await adminApi.loginAsAdmin();

  await seedJobTitles(adminApi);
  await seedLocations(adminApi);
}

export { seedJobTitles, seedLocations };
