import { recruitment } from '../../../test-data/frontend/recruitment';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('VacanciesApi');

export type VacancySeed = {
  name: string;
  jobTitleId: number;
  hiringManagerId: number;
  numOfPositions: number;
  description?: string;
  isPublished?: boolean;
  status?: boolean;
};

export type VacancyRecord = {
  id: number;
  name: string;
  status: boolean;
  isPublished: boolean;
};

export class VacanciesApi extends BaseApiService {
  private static readonly path = recruitment.api.vacanciesPath;

  async create(payload: VacancySeed): Promise<number> {
    const res = await this.post(VacanciesApi.path, {
      data: {
        name: payload.name,
        jobTitleId: payload.jobTitleId,
        employeeId: payload.hiringManagerId,
        numOfPositions: payload.numOfPositions,
        description: payload.description ?? '',
        isPublished: payload.isPublished ?? false,
        status: payload.status ?? true,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });

    if (!res.ok()) {
      const text = await res.text();
      throw new Error(
        `VacanciesApi.create failed: HTTP ${res.status()} "${payload.name}"\n${text.slice(0, 600)}`,
      );
    }

    const json = (await res.json()) as { data: { id: number } };
    log.info(`Vacancy created: "${payload.name}" (id=${json.data.id})`);
    return json.data.id;
  }

  async createIfAbsent(payload: VacancySeed): Promise<number> {
    const all = await this.getAll();
    const existing = all.find((v) => v.name === payload.name);
    if (existing) {
      log.info(`Vacancy already exists, skipping: "${payload.name}" (id=${existing.id})`);
      return existing.id;
    }
    return this.create(payload);
  }

  async getAll(): Promise<VacancyRecord[]> {
    const res = await this.get(`${VacanciesApi.path}?limit=100&offset=0`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok()) {
      throw new Error(`VacanciesApi.getAll failed: HTTP ${res.status()}`);
    }
    const json = (await res.json()) as { data: VacancyRecord[] };
    return json.data ?? [];
  }

  async deleteVacancies(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await this.delete(VacanciesApi.path, {
      data: { ids },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      const text = await res.text();
      log.warn(`VacanciesApi.deleteVacancies partial failure: HTTP ${res.status()} ${text.slice(0, 200)}`);
    } else {
      log.info(`Vacancies deleted: [${ids.join(', ')}]`);
    }
  }
}
