import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { LocationsApi } from '../../api/orangehrmMaster/LocationsApi';
import { api } from '../../../test-data';

/** Creates locations via Admin API v2 (`api.locations`). Called after login via {@link seedAllMasterData}. */
export async function seedLocations(adminApi: OrangehrmAdminApi): Promise<void> {
  const locationsApi = new LocationsApi(adminApi.request);

  for (const row of api.locations.seedRecords) {
    await locationsApi.create(row);
  }
}
