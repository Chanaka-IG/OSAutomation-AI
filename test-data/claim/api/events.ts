import { env } from '../../../src/config/env';

export type ClaimEventSeed = {
  name: string;
  description?: string;
  /** true = Active, false = Inactive. Defaults to Active in the UI. */
  status?: boolean;
};

export type ClaimEventRecord = {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
};

/**
 * Claim Events config API v2. Host = UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const events = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** GET/POST list+create; PUT `${adminPath}/{id}`; DELETE `${adminPath}` with `{ ids }`. */
  adminPath: '/web/index.php/api/v2/claim/events',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },
} as const;
