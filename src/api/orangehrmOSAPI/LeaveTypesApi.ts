import type { LeaveTypeSeed } from '../../../test-data/leave/api/leaveTypes';
import { leaveTypes as leaveTypesData } from '../../../test-data/leave/api/leaveTypes';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LeaveTypesApi');

/** Leave API v2 — leave types. */
export class LeaveTypesApi extends BaseApiService {
  async getAll(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.get(leaveTypesData.adminPath, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`LeaveTypesApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: Array<{ id: number; name: string }> };
    return json.data ?? [];
  }

  async createIfAbsent(payload: LeaveTypeSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((lt) => lt.name === payload.name)) {
      log.info(`Leave type already exists, skipping: ${payload.name}`);
      return;
    }
    await this.create(payload);
  }

  async create(payload: LeaveTypeSeed): Promise<void> {
    const response = await this.post(leaveTypesData.adminPath, {
      data: {
        name: payload.name,
        situational: payload.situational,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add leave type: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `LeaveTypesApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Leave type successfully added: ${payload.name}`);
  }
}
