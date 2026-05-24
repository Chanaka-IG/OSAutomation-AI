import type { PayGradeSeed } from '../../../test-data/pim/api/payGrades';
import { payGrades as payGradesData } from '../../../test-data/pim/api/payGrades';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('PayGradesApi');

/** OrangeHRM Admin API v2 — pay grades. */
export class PayGradesApi extends BaseApiService {
  async create(payload: PayGradeSeed): Promise<void> {
    const response = await this.post(payGradesData.adminPath, {
      data: { name: payload.name },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add pay grade: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `PayGradesApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Pay grade successfully added: ${payload.name}`);
  }
}
