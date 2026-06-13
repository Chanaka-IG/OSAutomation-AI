import { env } from '../../../src/config/env';

export type WorkShiftSeed = {
  name: string;
  /** 24-hour "HH:mm". */
  startTime: string;
  /** 24-hour "HH:mm". */
  endTime: string;
  /** Decimal hours as a string, e.g. "8.00". */
  hoursPerDay: string;
  /** Employee empNumbers to assign; empty when none. */
  empNumbers?: number[];
};

/**
 * Work Shifts Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const workShifts = {
  /** OrangeHRM origin only (from `BASE_URL` / `env.baseURL`). */
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** Path only, appended to `orangehrmBaseURL` (or Playwright `baseURL` on the request context). */
  adminPath: '/web/index.php/api/v2/admin/work-shifts',

  /** Full work-shifts endpoint for reference, logging, or absolute calls. */
  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },
} as const;
