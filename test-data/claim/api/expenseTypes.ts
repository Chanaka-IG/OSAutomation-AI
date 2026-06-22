import { env } from '../../../src/config/env';

export type ClaimExpenseTypeSeed = {
  name: string;
  description?: string;
  /** true = Active (default), false = Inactive. */
  status?: boolean;
};

export type ClaimExpenseTypeRecord = {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
};

/**
 * Claim Expense Types config API v2. Host = UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const expenseTypes = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** GET/POST list+create; PUT `${adminPath}/{id}`; DELETE `${adminPath}` with `{ ids }`. */
  adminPath: '/web/index.php/api/v2/claim/expenses/types',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },
} as const;
