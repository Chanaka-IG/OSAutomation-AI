import type { ClaimEventSeed, ClaimEventRecord } from '../../../test-data/claim/api/events';
import { events as claimEventsData } from '../../../test-data/claim/api/events';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('ClaimEventsApi');

/**
 * OrangeHRM Claim API v2 — events (Claim → Configuration → Events).
 * Uses relative {@link claimEventsData.adminPath}; host is `orangehrmApiContext`'s `baseURL` (= `BASE_URL`).
 */
export class ClaimEventsApi extends BaseApiService {
  async getAll(): Promise<ClaimEventRecord[]> {
    const response = await this.get(`${claimEventsData.adminPath}?limit=100&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`ClaimEventsApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: ClaimEventRecord[] };
    return json.data ?? [];
  }

  async getIdByName(name: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((e) => e.name === name)?.id;
  }

  async create(payload: ClaimEventSeed): Promise<ClaimEventRecord> {
    const response = await this.post(claimEventsData.adminPath, {
      data: {
        name: payload.name,
        description: payload.description ?? null,
        status: payload.status ?? true,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add claim event: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `ClaimEventsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Claim event successfully added: ${payload.name}`);
    const json = (await response.json()) as { data: ClaimEventRecord };
    return json.data;
  }

  /** Creates the event only when an event of the same name does not already exist. */
  async createIfAbsent(payload: ClaimEventSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((e) => e.name === payload.name)) {
      log.info(`Claim event already exists, skipping: ${payload.name}`);
      return;
    }
    await this.create(payload);
  }

  /** Hard-deletes claim events by id (`DELETE /claim/events { ids }`). Used for suite cleanup. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(claimEventsData.adminPath, {
      data: { ids },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `ClaimEventsApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Claim events deleted: [${ids.join(',')}]`);
  }

  /** Resolves the given names to ids and hard-deletes them. Safe to call with names that no longer exist. */
  async deleteByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    const ids = all.filter((e) => names.includes(e.name)).map((e) => e.id);
    await this.deleteByIds(ids);
  }
}
