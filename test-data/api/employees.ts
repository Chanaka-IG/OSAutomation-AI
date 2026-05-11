import { env } from '../../src/config/env';

export type EmployeeSeed = {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName: string;
};

/**
 * Employee Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const employees = {
  /**
   * OrangeHRM origin only (from `BASE_URL` / `env.baseURL`). This is the base URL for all
   * OrangeHRM master APIs that use the `orangehrmApiContext` fixture.
   */
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** Path only, appended to `orangehrmBaseURL` (or Playwright `baseURL` on the request context). */
  adminPath: '/web/index.php/api/v2/pim/employees',

  /** Full employees endpoint for reference, logging, or absolute `request.post` calls. */
  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      employeeId: '0002',
      firstName: 'Marcus',
      lastName: 'Chen',
      middleName: 'James',
    },
    {
      employeeId: '0003',
      firstName: 'Elena',
      lastName: 'Vasquez',
      middleName: 'Sofia',
    },
  ] as const satisfies readonly EmployeeSeed[],
};
