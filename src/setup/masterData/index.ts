import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { logger } from '../../lib/logger';
import { seedAdminUsers } from './adminUsers';
import { seedEmployees } from './employees';
import { seedEmploymentStatuses } from './employmentStatuses';
import { seedHolidays } from './holidays';
import { seedJobTitles } from './jobTitles';
import { seedLeavePeriod } from './leavePeriod';
import { seedLeaveTypes } from './leaveTypes';
import { seedLocations } from './locations';
import { seedPayGrades } from './payGrades';
import { seedSubunits } from './subunits';
import { seedWorkweek } from './workweek';

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
  await seedPayGrades(adminApi);
  await seedLeavePeriod(adminApi);
  await seedSubunits(adminApi);
  await seedLeaveTypes(adminApi);
  await seedWorkweek(adminApi);
  await seedHolidays(adminApi);
  await seedAdminUsers(adminApi);

  logger.info('Master data seeding finished');
}

export {
  seedJobTitles,
  seedEmployees,
  seedEmploymentStatuses,
  seedLocations,
  seedPayGrades,
  seedLeavePeriod,
  seedSubunits,
  seedLeaveTypes,
  seedWorkweek,
  seedHolidays,
  seedAdminUsers,
};
