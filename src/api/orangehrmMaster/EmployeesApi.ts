import type { EmployeeSeed } from '../../../test-data/api/employees';
import { employees as employeesData } from '../../../test-data/api/employees';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('EmployeesApi');

/**
 * OrangeHRM Admin API v2 - employees.
 * Uses relative {@link employeesData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link employeesData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link employeesData.adminUrl}.
 */
export class EmployeesApi extends BaseApiService {
  async create(payload: EmployeeSeed): Promise<void> {
    const displayName = [payload.firstName, payload.middleName, payload.lastName]
      .filter(Boolean)
      .join(' ');

    const response = await this.post(employeesData.adminPath, {
      data: {
        employeeId: payload.employeeId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        middleName: payload.middleName,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add employee: ${displayName} (${payload.employeeId})`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `EmployeesApi.create failed: HTTP ${response.status()} ${payload.employeeId}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Employee successfully added: ${displayName}`);
  }
}
