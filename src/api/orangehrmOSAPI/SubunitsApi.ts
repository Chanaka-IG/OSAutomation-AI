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

  async createIfAbsent(payload: SubunitSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((s) => s.name === payload.name)) {
      log.info(`Subunit already exists, skipping: ${payload.name}`);
      return;
    }
    await this.create(payload);
  }

  async create(payload: SubunitSeed): Promise<void> {
    await this.createAndGetId(payload);
  }

  /**
   * Creates a sub-unit and returns its new id (parsed from the `{ data: { id } }` envelope).
   * Used by E2E suites that need to seed a parent then nest a child under it, and to track
   * ids for single-id-path cleanup. POST `/api/v2/admin/subunits` with `parentId` (1 = root).
   */
  async createAndGetId(payload: SubunitSeed): Promise<number> {
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

    const json = (await response.json()) as { data: { id: number } };
    log.info(`Subunit successfully added: ${payload.name}`, { id: json.data?.id });
    return json.data.id;
  }

  /**
   * Hard-deletes a single sub-unit by id. NOTE: subunits use a SINGLE id in the PATH
   * (`DELETE /admin/subunits/{id}`), NOT the bulk `{ ids: [...] }` body shape that
   * job-titles / employment-statuses use. Deletion cascades to all descendants server-side.
   */
  async deleteById(id: number): Promise<void> {
    const response = await this.delete(`${subunitsData.adminPath}/${id}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `SubunitsApi.deleteById failed: HTTP ${response.status()} id=${id}\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Subunit deleted: ${id}`);
  }

  /**
   * Cleanup helper: deletes every sub-unit whose name is in `names` and is still present
   * (cascade deletes may have already removed some). Tolerant — skips names not found.
   */
  async deleteByNamesIfPresent(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getAll();
    for (const unit of all) {
      if (names.includes(unit.name)) {
        await this.deleteById(unit.id).catch((e) =>
          log.warn(`cleanup: could not delete ${unit.name} (${unit.id})`, { error: String(e) }),
        );
      }
    }
  }
}
