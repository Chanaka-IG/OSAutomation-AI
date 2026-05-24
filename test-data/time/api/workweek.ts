import { env } from '../../../src/config/env';

export type WorkweekSeed = {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
};

export const workweek = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/leave/workweek',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  /** Single work week (PUT). 0 = working day, 4 = half day, 8 = non-working day. */
  seedPayload: {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 8,
    sunday: 8,
  } as const satisfies WorkweekSeed,
};
