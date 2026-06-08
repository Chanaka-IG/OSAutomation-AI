import type { AdminUserSeed } from '../../../test-data/pim/api/adminUsers';
import { adminUsers as adminUsersData } from '../../../test-data/pim/api/adminUsers';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('AdminUsersApi');

/** OrangeHRM Admin API v2 — users. Requires matching {@link AdminUserSeed.empNumber} employee to exist. */
export class AdminUsersApi extends BaseApiService {
  async getAll(): Promise<Array<{ id: number; userName: string }>> {
    // limit=0 → all records; the default page size (50) would hide existing users
    // from createIfAbsent once enough suites have seeded accounts.
    const response = await this.get(`${adminUsersData.adminPath}?limit=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`AdminUsersApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: Array<{ id: number; userName: string }> };
    return json.data ?? [];
  }

  async createIfAbsent(payload: AdminUserSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((u) => u.userName === payload.username)) {
      log.info(`User already exists, skipping: ${payload.username}`);
      return;
    }
    await this.create(payload);
  }

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

  /** Case-insensitive lookup (usernames are unique under MySQL's default collation). */
  async findIdByUsername(username: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((u) => u.userName.toLowerCase() === username.toLowerCase())?.id;
  }

  /** Bulk hard-delete by user id. Logs (does not throw) on partial failure. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(adminUsersData.adminPath, {
      data: { ids },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.warn(`deleteByIds partial failure: HTTP ${response.status()} ${text.slice(0, 200)}`);
    } else {
      log.info(`Users deleted: [${ids.join(', ')}]`);
    }
  }
}
