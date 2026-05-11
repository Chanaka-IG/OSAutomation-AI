import type { WorkweekSeed } from '../../../test-data/api/workweek';
import { workweek as workweekData } from '../../../test-data/api/workweek';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('WorkweekApi');

/** Leave API v2 — work week (documented as update; uses PUT). */
export class WorkweekApi extends BaseApiService {
  async save(payload: WorkweekSeed): Promise<void> {
    const response = await this.put(workweekData.adminPath, {
      data: {
        monday: payload.monday,
        tuesday: payload.tuesday,
        wednesday: payload.wednesday,
        thursday: payload.thursday,
        friday: payload.friday,
        saturday: payload.saturday,
        sunday: payload.sunday,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error('Failed to update work week', {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(`WorkweekApi.save failed: HTTP ${response.status()}\n${text.slice(0, 600)}`);
    }

    log.info('Work week updated');
  }
}
