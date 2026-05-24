import type { LeavePeriodSeed } from '../../../test-data/leave/api/leavePeriod';
import { leavePeriod as leavePeriodData } from '../../../test-data/leave/api/leavePeriod';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LeavePeriodApi');

/** Leave API v2 — leave period (documented as update; uses PUT). */
export class LeavePeriodApi extends BaseApiService {
  async save(payload: LeavePeriodSeed): Promise<void> {
    const response = await this.put(leavePeriodData.adminPath, {
      data: {
        startDay: payload.startDay,
        startMonth: payload.startMonth,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error('Failed to update leave period', {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(`LeavePeriodApi.save failed: HTTP ${response.status()}\n${text.slice(0, 600)}`);
    }

    log.info('Leave period updated');
  }
}
