import type { LeaveTypeSeed } from '../../../test-data/api/leaveTypes';
import { leaveTypes as leaveTypesData } from '../../../test-data/api/leaveTypes';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LeaveTypesApi');

/** Leave API v2 — leave types. */
export class LeaveTypesApi extends BaseApiService {
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
