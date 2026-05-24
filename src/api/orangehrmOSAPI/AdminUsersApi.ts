import type { AdminUserSeed } from '../../../test-data/pim/api/adminUsers';
import { adminUsers as adminUsersData } from '../../../test-data/pim/api/adminUsers';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('AdminUsersApi');

/** OrangeHRM Admin API v2 — users. Requires matching {@link AdminUserSeed.empNumber} employee to exist. */
export class AdminUsersApi extends BaseApiService {
  async create(payload: AdminUserSeed): Promise<void> {
    const response = await this.post(adminUsersData.adminPath, {
      data: {
        username: payload.username,
        password: payload.password,
        status: payload.status,
        userRoleId: payload.userRoleId,
        empNumber: payload.empNumber,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add user: ${payload.username}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `AdminUsersApi.create failed: HTTP ${response.status()} ${payload.username}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`User successfully added: ${payload.username}`);
  }
}
