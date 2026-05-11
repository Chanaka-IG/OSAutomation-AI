import type { EmployeeSeed } from '../../../test-data/api/employees';
import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { EmployeesApi } from '../../api/orangehrmOSAPI/EmployeesApi';

/** Ensures the given rows exist via Admin API (`createIfAbsent`). Used by UI and API Playwright tests only. */
export async function ensureEmployeeRecords(
  adminApi: OrangehrmAdminApi,
  records: readonly EmployeeSeed[],
): Promise<void> {
  await adminApi.loginAsAdmin();
  const employeesApi = new EmployeesApi(adminApi.request);

  for (const row of records) {
    await employeesApi.createIfAbsent(row);
  }
}
