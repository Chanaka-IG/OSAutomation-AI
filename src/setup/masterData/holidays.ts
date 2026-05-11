import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { HolidaysApi } from '../../api/orangehrmOSAPI/HolidaysApi';
import { api } from '../../../test-data';

/** Creates holidays via Leave API v2 (`api.holidays`). Called after login via {@link seedAllMasterData}. */
export async function seedHolidays(adminApi: OrangehrmAdminApi): Promise<void> {
  const holidaysApi = new HolidaysApi(adminApi.request);

  for (const row of api.holidays.seedRecords) {
    await holidaysApi.create(row);
  }
}
