import type { ReportingMethodSeed } from '../../../test-data/pim/api/reportingMethods';
import { reportingMethods as reportingMethodsData } from '../../../test-data/pim/api/reportingMethods';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('ReportingMethodsApi');

/**
 * OrangeHRM PIM API v2 — reporting methods (PIM → Configuration → Reporting Methods).
 * `GET`/`POST`/`DELETE /api/v2/pim/reporting-methods`.
 */
export type ReportingMethodRecord = {
  id: number;
  name: string;
};

export class ReportingMethodsApi extends BaseApiService {
  async getAll(): Promise<ReportingMethodRecord[]> {
    const response = await this.get(`${reportingMethodsData.adminPath}?limit=50&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`ReportingMethodsApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: ReportingMethodRecord[] };
    return json.data ?? [];
  }

  async getIdByName(name: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((m) => m.name === name)?.id;
  }

  async create(payload: ReportingMethodSeed): Promise<ReportingMethodRecord> {
    const response = await this.post(reportingMethodsData.adminPath, {
      data: { name: payload.name },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add reporting method: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `ReportingMethodsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Reporting method successfully added: ${payload.name}`);
    const json = (await response.json()) as { data: ReportingMethodRecord };
    return json.data;
  }

  /** Hard-deletes reporting methods by id (`DELETE /pim/reporting-methods { ids }`). */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(reportingMethodsData.adminPath, {
      data: { ids },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `ReportingMethodsApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Reporting methods deleted: [${ids.join(',')}]`);
  }

  /** Resolves the given names to ids and hard-deletes them. Safe with names that no longer exist. */
  async deleteByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    const ids = all.filter((m) => names.includes(m.name)).map((m) => m.id);
    await this.deleteByIds(ids);
  }
}
