import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { AdminUsersApi } from '../../api/orangehrmOSAPI/AdminUsersApi';
import { EmployeesApi } from '../../api/orangehrmOSAPI/EmployeesApi';
import { api } from '../../../test-data';

/**
 * Creates admin users via Admin API v2 (`api.adminUsers`).
 * Run after employees so {@link AdminUserSeed.employeeId} resolves. Called after login via {@link seedAllMasterData}.
 */
export async function seedAdminUsers(adminApi: OrangehrmAdminApi): Promise<void> {
  const adminUsersApi = new AdminUsersApi(adminApi.request);
  const employeesApi = new EmployeesApi(adminApi.request);

  for (const row of api.adminUsers.seedRecords) {
    const empNumber = await employeesApi.getEmpNumberByEmployeeId(row.employeeId);
    if (empNumber === undefined) {
      throw new Error(
        `seedAdminUsers: employee ${row.employeeId} not found for user ${row.username}`,
      );
    }
    await adminUsersApi.createIfAbsent(row, empNumber);
  }
}
