import { env } from '../../../src/config/env';

export type EmploymentStatusSeed = {
  name: string;
};

/**
 * Employment status Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const employmentStatuses = {
  /**
   * OrangeHRM origin only (from `BASE_URL` / `env.baseURL`). This is the base URL for all
   * OrangeHRM master APIs that use the `orangehrmApiContext` fixture.
   */
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** Path only, appended to `orangehrmBaseURL` (or Playwright `baseURL` on the request context). */
  adminPath: '/web/index.php/api/v2/admin/employment-statuses',

  /** Full employment-statuses endpoint for reference, logging, or absolute `request.post` calls. */
  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    { name: 'Permanent' },
    { name: 'Probation' },
    { name: 'Intern' },
    { name: 'Terminated' },
  ] as const satisfies readonly EmploymentStatusSeed[],
};
