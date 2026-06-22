import type { ClaimExpenseTypeSeed, ClaimExpenseTypeRecord } from '../../../test-data/claim/api/expenseTypes';
import { expenseTypes as expenseTypesData } from '../../../test-data/claim/api/expenseTypes';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('ClaimExpenseTypesApi');

/**
 * OrangeHRM Claim API v2 — expense types (Claim → Configuration → Expense Types).
 * Uses relative {@link expenseTypesData.adminPath}; host is `orangehrmApiContext`'s `baseURL` (= `BASE_URL`).
 */
export class ClaimExpenseTypesApi extends BaseApiService {
  async getAll(): Promise<ClaimExpenseTypeRecord[]> {
    const response = await this.get(`${expenseTypesData.adminPath}?limit=100&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`ClaimExpenseTypesApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: ClaimExpenseTypeRecord[] };
    return json.data ?? [];
  }

  async getIdByName(name: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((e) => e.name === name)?.id;
  }

  async create(payload: ClaimExpenseTypeSeed): Promise<ClaimExpenseTypeRecord> {
    const response = await this.post(expenseTypesData.adminPath, {
      data: {
        name: payload.name,
        description: payload.description ?? null,
        status: payload.status ?? true,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add expense type: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `ClaimExpenseTypesApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Expense type successfully added: ${payload.name}`);
    const json = (await response.json()) as { data: ClaimExpenseTypeRecord };
    return json.data;
  }

  /** Creates the type only when one of the same name does not already exist. */
  async createIfAbsent(payload: ClaimExpenseTypeSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((e) => e.name === payload.name)) {
      log.info(`Expense type already exists, skipping: ${payload.name}`);
      return;
    }
    await this.create(payload);
  }

  /** Hard-deletes expense types by id (`DELETE /claim/expenses/types { ids }`). Used for suite cleanup. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(expenseTypesData.adminPath, {
      data: { ids },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `ClaimExpenseTypesApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Expense types deleted: [${ids.join(',')}]`);
  }

  /** Resolves the given names to ids and hard-deletes them. Safe to call with names that no longer exist. */
  async deleteByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    const ids = all.filter((e) => names.includes(e.name)).map((e) => e.id);
    await this.deleteByIds(ids);
  }
}
