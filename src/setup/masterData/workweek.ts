import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { WorkweekApi } from '../../api/orangehrmOSAPI/WorkweekApi';
import { api } from '../../../test-data';

/** Updates work week via Leave API v2 (`api.workweek`). Called after login via {@link seedAllMasterData}. */
export async function seedWorkweek(adminApi: OrangehrmAdminApi): Promise<void> {
  const workweekApi = new WorkweekApi(adminApi.request);
  await workweekApi.save(api.workweek.seedPayload);
}
