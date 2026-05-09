import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { logger } from '../../lib/logger';
import { seedEmployees } from './employees';
import { seedEmploymentStatuses } from './employmentStatuses';
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
  logger.info('Master data seeding started');
  await adminApi.loginAsAdmin();

  await seedJobTitles(adminApi);
  await seedEmployees(adminApi);
  await seedEmploymentStatuses(adminApi);
  await seedLocations(adminApi);
  logger.info('Master data seeding finished');
}

export { seedJobTitles, seedEmployees, seedEmploymentStatuses, seedLocations };
