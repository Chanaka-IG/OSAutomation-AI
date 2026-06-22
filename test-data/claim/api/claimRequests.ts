import { env } from '../../../src/config/env';

export type ClaimRequestSeed = {
  claimEventId: number;
  /** ISO currency code, e.g. "USD". */
  currencyId: string;
  remarks?: string;
};

export type ClaimExpenseSeed = {
  expenseTypeId: number;
  /** "yyyy-mm-dd". */
  date: string;
  /** Decimal string, e.g. "125.50". */
  amount: string;
  note?: string;
};

export type ClaimRequestRecord = {
  id: number;
  referenceId: string;
  status: string;
};

/**
 * Claim Requests API v2 (self-scoped to the authenticated employee). Host = UI / `BASE_URL`.
 * NOTE: claim requests cannot be deleted (DELETE → 405) — they are permanent.
 */
export const claimRequests = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },
  adminPath: '/web/index.php/api/v2/claim/requests',
  /** Admin assign-claim base: `${employeesPath}/{empNumber}/requests`. */
  employeesPath: '/web/index.php/api/v2/claim/employees',
  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },
} as const;
