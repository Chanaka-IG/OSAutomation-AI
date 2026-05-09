import type { OrangehrmAdminApi } from '../../api/orangehrmMaster/OrangehrmAdminApi';
import { EmployeesApi } from '../../api/orangehrmMaster/EmployeesApi';
import { api } from '../../../test-data';

/** Creates employees via PIM API v2 (`api.employees`). Called after login via {@link seedAllMasterData}. */
export async function seedEmployees(adminApi: OrangehrmAdminApi): Promise<void> {
  const employeesApi = new EmployeesApi(adminApi.request);

  for (const row of api.employees.seedRecords) {
    await employeesApi.create(row);
  }
}
