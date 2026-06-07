import type { JobTitleSeed } from '../../../test-data/pim/api/jobTitles';
import { jobTitles as jobTitlesData } from '../../../test-data/pim/api/jobTitles';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('JobTitlesApi');

/**
 * OrangeHRM Admin API v2 — job titles.
 * Uses relative {@link jobTitlesData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link jobTitlesData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link jobTitlesData.adminUrl}.
 */
export type JobTitleRecord = {
  id: number;
  title: string;
  /** Present when a job-specification attachment was uploaded with the title. */
  jobSpecification?: { id: number; filename: string } | null;
};

export class JobTitlesApi extends BaseApiService {
  async getAll(): Promise<JobTitleRecord[]> {
    const response = await this.get(jobTitlesData.adminPath, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`JobTitlesApi.getAll failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: JobTitleRecord[] };
    return json.data ?? [];
  }

  async getIdByTitle(title: string): Promise<number | undefined> {
    const all = await this.getAll();
    return all.find((jt) => jt.title === title)?.id;
  }

  async createIfAbsent(payload: JobTitleSeed): Promise<void> {
    const all = await this.getAll();
    if (all.some((jt) => jt.title === payload.title)) {
      log.info(`Job title already exists, skipping: ${payload.title}`);
      return;
    }
    await this.create(payload);
  }

  async create(payload: JobTitleSeed): Promise<void> {
    const response = await this.post(jobTitlesData.adminPath, {
      data: {
        title: payload.title,
        description: payload.description,
        note: payload.note,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add job title: ${payload.title}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `JobTitlesApi.create failed: HTTP ${response.status()} ${payload.title}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Job title successfully added: ${payload.title}`);
  }

  /** Hard-deletes job titles by id (`DELETE /admin/job-titles { ids }`). Used for suite cleanup. */
  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const response = await this.delete(jobTitlesData.adminPath, {
      data: { ids },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `JobTitlesApi.deleteByIds failed: HTTP ${response.status()} ids=[${ids.join(',')}]\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Job titles deleted: [${ids.join(',')}]`);
  }
}
