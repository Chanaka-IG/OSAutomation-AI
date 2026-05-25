import type { PayGradeSeed } from '../../../test-data/pim/api/payGrades';
import { payGrades as payGradesData } from '../../../test-data/pim/api/payGrades';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('PayGradesApi');

/** OrangeHRM Admin API v2 — pay grades. */
export class PayGradesApi extends BaseApiService {
  async getAll(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.get(payGradesData.adminPath, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`PayGradesApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: Array<{ id: number; name: string }> };
    return json.data ?? [];
  }

  async createIfAbsent(payload: PayGradeSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((p) => p.name === payload.name)) {
      log.info(`Pay grade already exists, skipping: ${payload.name}`);
      return;
    }
    await this.create(payload);
  }

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
