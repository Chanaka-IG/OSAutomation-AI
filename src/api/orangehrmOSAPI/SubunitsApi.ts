import type { SubunitSeed } from '../../../test-data/pim/api/subunits';
import { subunits as subunitsData } from '../../../test-data/pim/api/subunits';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('SubunitsApi');

/** OrangeHRM Admin API v2 — subunits (organization structure). */
export class SubunitsApi extends BaseApiService {
  async getAll(): Promise<Array<{ id: number; name: string }>> {
    const response = await this.get(subunitsData.adminPath, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`SubunitsApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: Array<{ id: number; name: string }> };
    return json.data ?? [];
  }

  async getIdByName(name: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((s) => s.name === name)?.id;
  }

  async create(payload: SubunitSeed): Promise<void> {
    const response = await this.post(subunitsData.adminPath, {
      data: {
        parentId: payload.parentId,
        unitId: payload.unitId,
        name: payload.name,
        description: payload.description,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add subunit: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `SubunitsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Subunit successfully added: ${payload.name}`);
  }
}
