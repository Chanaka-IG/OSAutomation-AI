import type { EmploymentStatusSeed } from '../../../test-data/api/employmentStatuses';
import { employmentStatuses as employmentStatusesData } from '../../../test-data/api/employmentStatuses';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('EmploymentStatusesApi');

/**
 * OrangeHRM Admin API v2 - employment statuses.
 * Uses relative {@link employmentStatusesData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link employmentStatusesData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link employmentStatusesData.adminUrl}.
 */
export class EmploymentStatusesApi extends BaseApiService {
  async create(payload: EmploymentStatusSeed): Promise<void> {
    const response = await this.post(employmentStatusesData.adminPath, {
      data: {
        name: payload.name,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add employment status: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `EmploymentStatusesApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Employment status successfully added: ${payload.name}`);
  }
}
