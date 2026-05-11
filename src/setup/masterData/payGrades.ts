import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { PayGradesApi } from '../../api/orangehrmOSAPI/PayGradesApi';
import { api } from '../../../test-data';

/** Creates pay grades via Admin API v2 (`api.payGrades`). Called after login via {@link seedAllMasterData}. */
export async function seedPayGrades(adminApi: OrangehrmAdminApi): Promise<void> {
  const payGradesApi = new PayGradesApi(adminApi.request);

  for (const row of api.payGrades.seedRecords) {
    await payGradesApi.create(row);
  }
}
