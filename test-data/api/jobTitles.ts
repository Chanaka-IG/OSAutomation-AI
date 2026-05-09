import { env } from '../../src/config/env';

export type JobTitleSeed = {
  title: string;
  description: string;
  note: string;
};

/**
 * Job titles Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`’s `baseURL` (`env.baseURL`).
 */
export const jobTitles = {
  /**
   * OrangeHRM origin only (from `BASE_URL` / `env.baseURL`). This is the base URL for all
   * OrangeHRM master APIs that use the `orangehrmApiContext` fixture.
   */
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** Path only, appended to `orangehrmBaseURL` (or Playwright `baseURL` on the request context). */
  adminPath: '/web/index.php/api/v2/admin/job-titles',

  /** Full job-titles endpoint for reference, logging, or absolute `request.post` calls. */
  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      title: 'Software Engineer',
      description: 'Software Engineer',
      note: 'Software Engineer position',
    },
    {
      title: 'QA Engineer',
      description: 'QA Enginee',
      note: 'QA Enginee position',
    },
    {
      title: 'UI Engineer',
      description: 'UI Engineer',
      note: 'UI Engineer position',
    },
    {
      title: 'BA',
      description: 'BA',
      note: 'BA position',
    },
    {
      title: 'HR',
      description: 'HR',
      note: 'HR position',
    },
    {
      title: 'Senior Software Engineer',
      description: 'Senior Software Engineer',
      note: 'Senior Software Engineer position',
    },
  ] as const satisfies readonly JobTitleSeed[],
};
