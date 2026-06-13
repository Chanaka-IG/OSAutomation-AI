import type { WorkShiftSeed } from '../../../test-data/admin/api/workShifts';
import { workShifts as workShiftsData } from '../../../test-data/admin/api/workShifts';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('WorkShiftsApi');

/**
 * OrangeHRM Admin API v2 — work shifts (Admin → Job → Work Shifts).
 * Uses relative {@link workShiftsData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= `BASE_URL`). The list endpoint does not return assigned employees inline.
 */
export type WorkShiftRecord = {
  id: number;
  name: string;
  /** Returned as a number by the API (e.g. 8 for "8.00"). */
  hoursPerDay: number;
  /** 24-hour "HH:mm". */
  startTime: string;
  /** 24-hour "HH:mm". */
  endTime: string;
};

export class WorkShiftsApi extends BaseApiService {
  async getAll(): Promise<WorkShiftRecord[]> {
    const response = await this.get(`${workShiftsData.adminPath}?limit=50&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`WorkShiftsApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: WorkShiftRecord[] };
    return json.data ?? [];
  }

  async getIdByName(name: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((s) => s.name === name)?.id;
  }

  async create(payload: WorkShiftSeed): Promise<WorkShiftRecord> {
    const response = await this.post(workShiftsData.adminPath, {
      data: {
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        hoursPerDay: payload.hoursPerDay,
        empNumbers: payload.empNumbers ?? [],
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add work shift: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `WorkShiftsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Work shift successfully added: ${payload.name}`);
    const json = (await response.json()) as { data: WorkShiftRecord };
    return json.data;
  }

  /** Hard-deletes work shifts by id (`DELETE /admin/work-shifts { ids }`). Used for suite cleanup. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(workShiftsData.adminPath, {
      data: { ids },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `WorkShiftsApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Work shifts deleted: [${ids.join(',')}]`);
  }

  /** Resolves the given names to ids and hard-deletes them. Safe to call with names that no longer exist. */
  async deleteByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    const ids = all.filter((s) => names.includes(s.name)).map((s) => s.id);
    await this.deleteByIds(ids);
  }
}
