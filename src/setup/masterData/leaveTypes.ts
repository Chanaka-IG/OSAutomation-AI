import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { LeaveTypesApi } from '../../api/orangehrmOSAPI/LeaveTypesApi';
import { api } from '../../../test-data';

/** Creates leave types via Leave API v2 (`api.leaveTypes`). Called after login via {@link seedAllMasterData}. */
export async function seedLeaveTypes(adminApi: OrangehrmAdminApi): Promise<void> {
  const leaveTypesApi = new LeaveTypesApi(adminApi.request);

  for (const row of api.leaveTypes.seedRecords) {
    await leaveTypesApi.create(row);
  }
}
