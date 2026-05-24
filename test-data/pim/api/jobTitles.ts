import { env } from '../../../src/config/env';

export type JobTitleSeed = {
  title: string;
  description: string;
  note: string;
};

/**
 * Job titles Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
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
      description:
        'Designs, implements, and maintains application features; collaborates on technical design and code review.',
      note: 'Individual contributor — engineering ladder levels L3–L5.',
    },
    {
      title: 'QA Engineer',
      description:
        'Defines test scope, executes exploratory and regression testing, and maintains automated checks.',
      note: 'Embedded with squads prior to major releases.',
    },
    {
      title: 'UI Engineer',
      description:
        'Builds responsive interfaces and design-system components; partners with UX on accessibility.',
      note: 'Design systems guild.',
    },
    {
      title: 'Business Analyst',
      description:
        'Captures requirements, maps processes, and validates acceptance criteria with stakeholders.',
      note: 'Aligned to product domains.',
    },
    {
      title: 'HR Specialist',
      description:
        'Delivers employee lifecycle support: onboarding, policy guidance, and HRIS transactions.',
      note: 'People Operations — shared services.',
    },
    {
      title: 'Senior Software Engineer',
      description:
        'Leads technical initiatives, mentors engineers, and owns reliability and scalability outcomes.',
      note: 'Senior IC track; staff-equivalent in some regions.',
    },
  ] as const satisfies readonly JobTitleSeed[],
};
