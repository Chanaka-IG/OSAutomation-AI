import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { SubunitsApi } from '../../api/orangehrmOSAPI/SubunitsApi';
import { api } from '../../../test-data';

/** Creates subunits via Admin API v2 (`api.subunits`). Called after login via {@link seedAllMasterData}. */
export async function seedSubunits(adminApi: OrangehrmAdminApi): Promise<void> {
  const subunitsApi = new SubunitsApi(adminApi.request);

  for (const row of api.subunits.seedRecords) {
    await subunitsApi.create(row);
  }
}
