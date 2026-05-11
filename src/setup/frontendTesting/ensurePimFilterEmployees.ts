import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { frontendApi } from '../../../test-data';
import { ensureEmployeeRecords } from './ensureEmployeeRecords';
import { ensurePimFilterJobDetails } from './ensurePimFilterJobDetails';

/**
 * Ensures PIM Employee List UI filter rows exist and have job title, employment status,
 * sub unit, and supervisor assigned (as required by TC-PIM-EL-008–011).
 */
export async function ensurePimFilterEmployees(adminApi: OrangehrmAdminApi): Promise<void> {
  await ensureEmployeeRecords(adminApi, frontendApi.pim.filterTestRecords);
  await ensurePimFilterJobDetails(adminApi);
}
