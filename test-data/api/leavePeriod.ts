import { env } from '../../src/config/env';

export type LeavePeriodSeed = {
  startDay: number;
  startMonth: number;
};

export const leavePeriod = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/leave/leave-period',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  /** Single leave-period configuration (PUT). */
  seedPayload: {
    startDay: 1,
    startMonth: 1,
  } as const satisfies LeavePeriodSeed,
};
