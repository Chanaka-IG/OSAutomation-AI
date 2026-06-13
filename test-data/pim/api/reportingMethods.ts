import { env } from '../../../src/config/env';

export type ReportingMethodSeed = {
  name: string;
};

/**
 * PIM Reporting Methods API v2. Host is the same as UI / `BASE_URL`.
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const reportingMethods = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/pim/reporting-methods',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  /** Seeded defaults on the instance — never delete (used read-only for duplicate checks). */
  defaults: ['Direct', 'Indirect'] as const,
} as const;
