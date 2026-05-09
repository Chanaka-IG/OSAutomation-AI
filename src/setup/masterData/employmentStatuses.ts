import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { EmploymentStatusesApi } from '../../api/orangehrmMaster/EmploymentStatusesApi';
import { api } from '../../../test-data';

/** Creates employment statuses via Admin API v2 (`api.employmentStatuses`). Called after login via {@link seedAllMasterData}. */
export async function seedEmploymentStatuses(adminApi: OrangehrmAdminApi): Promise<void> {
  const employmentStatusesApi = new EmploymentStatusesApi(adminApi.request);

  for (const row of api.employmentStatuses.seedRecords) {
    await employmentStatusesApi.create(row);
  }
}
