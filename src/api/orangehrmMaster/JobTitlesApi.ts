import type { JobTitleSeed } from '../../../test-data/api/jobTitles';
import { jobTitles as jobTitlesData } from '../../../test-data/api/jobTitles';
import { BaseApiService } from '../BaseApiService';

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
      throw new Error(
        `JobTitlesApi.create failed: HTTP ${response.status()} ${payload.title}\n${text.slice(0, 600)}`,
      );
    }
  }
}
