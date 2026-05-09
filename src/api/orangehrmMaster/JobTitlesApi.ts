import type { JobTitleSeed } from '../../../test-data/api/jobTitles';
import { jobTitles as jobTitlesData } from '../../../test-data/api/jobTitles';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('JobTitlesApi');

/**
 * OrangeHRM Admin API v2 — job titles.
 * Uses relative {@link jobTitlesData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link jobTitlesData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link jobTitlesData.adminUrl}.
 */
export class JobTitlesApi extends BaseApiService {
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
}
