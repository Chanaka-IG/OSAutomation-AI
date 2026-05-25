import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { AdminUsersApi } from '../../api/orangehrmOSAPI/AdminUsersApi';
import { api } from '../../../test-data';

/**
 * Creates admin users via Admin API v2 (`api.adminUsers`).
 * Run after employees so {@link AdminUserSeed.empNumber} exists. Called after login via {@link seedAllMasterData}.
 */
export async function seedAdminUsers(adminApi: OrangehrmAdminApi): Promise<void> {
  const adminUsersApi = new AdminUsersApi(adminApi.request);

  for (const row of api.adminUsers.seedRecords) {
    await adminUsersApi.createIfAbsent(row);
  }
}
