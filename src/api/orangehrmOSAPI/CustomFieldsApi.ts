import type { CustomFieldSeed } from '../../../test-data/pim/api/customFields';
import { customFields as customFieldsData } from '../../../test-data/pim/api/customFields';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('CustomFieldsApi');

/**
 * OrangeHRM PIM API v2 — custom fields (PIM → Configuration → Custom Fields).
 * `GET`/`POST`/`DELETE /api/v2/pim/custom-fields`. Capped at 10 fields per instance.
 */
export type CustomFieldRecord = {
  id: number;
  fieldName: string;
  fieldType: number;
  extraData: string | null;
  screen: string;
};

export class CustomFieldsApi extends BaseApiService {
  async getAll(): Promise<CustomFieldRecord[]> {
    const response = await this.get(`${customFieldsData.adminPath}?limit=50&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`CustomFieldsApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: CustomFieldRecord[] };
    return json.data ?? [];
  }

  async getIdByName(fieldName: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((f) => f.fieldName === fieldName)?.id;
  }

  async create(payload: CustomFieldSeed): Promise<CustomFieldRecord> {
    const response = await this.post(customFieldsData.adminPath, {
      data: {
        fieldName: payload.fieldName,
        screen: payload.screen,
        fieldType: payload.fieldType,
        extraData: payload.extraData ?? null,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add custom field: ${payload.fieldName}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `CustomFieldsApi.create failed: HTTP ${response.status()} ${payload.fieldName}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Custom field successfully added: ${payload.fieldName}`);
    const json = (await response.json()) as { data: CustomFieldRecord };
    return json.data;
  }

  /** Hard-deletes custom fields by id (`DELETE /pim/custom-fields { ids }`). Used for suite cleanup. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(customFieldsData.adminPath, {
      data: { ids },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `CustomFieldsApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Custom fields deleted: [${ids.join(',')}]`);
  }

  /** Resolves the given names to ids and hard-deletes them. Safe with names that no longer exist. */
  async deleteByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    const ids = all.filter((f) => names.includes(f.fieldName)).map((f) => f.id);
    await this.deleteByIds(ids);
  }
}
