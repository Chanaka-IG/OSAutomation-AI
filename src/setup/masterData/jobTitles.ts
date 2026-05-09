import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { JobTitlesApi } from '../../api/orangehrmMaster/JobTitlesApi';
import { api } from '../../../test-data';

/** Creates job titles via Admin API v2 (`api.jobTitles`). Called after login via {@link seedAllMasterData}. */
export async function seedJobTitles(adminApi: OrangehrmAdminApi): Promise<void> {
  const jobTitlesApi = new JobTitlesApi(adminApi.request);

  for (const row of api.jobTitles.seedRecords) {
    await jobTitlesApi.create(row);
  }
}
