import type { HolidaySeed } from '../../../test-data/leave/api/holidays';
import { holidays as holidaysData } from '../../../test-data/leave/api/holidays';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('HolidaysApi');

/** Leave API v2 — holidays. */
export class HolidaysApi extends BaseApiService {
  async create(payload: HolidaySeed): Promise<void> {
    const response = await this.post(holidaysData.adminPath, {
      data: {
        name: payload.name,
        date: payload.date,
        recurring: payload.recurring,
        length: payload.length,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add holiday: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `HolidaysApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Holiday successfully added: ${payload.name}`);
  }
}
