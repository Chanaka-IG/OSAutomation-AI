import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { LeavePeriodApi } from '../../api/orangehrmOSAPI/LeavePeriodApi';
import { api } from '../../../test-data';

/** Updates leave period via Leave API v2 (`api.leavePeriod`). Called after login via {@link seedAllMasterData}. */
export async function seedLeavePeriod(adminApi: OrangehrmAdminApi): Promise<void> {
  const leavePeriodApi = new LeavePeriodApi(adminApi.request);
  await leavePeriodApi.save(api.leavePeriod.seedPayload);
}
