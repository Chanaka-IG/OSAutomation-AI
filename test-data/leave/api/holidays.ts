import { env } from '../../../src/config/env';

export type HolidaySeed = {
  name: string;
  date: string;
  recurring: boolean;
  /** 0: full day, 4: half day */
  length: number;
};

export const holidays = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/leave/holidays',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      name: 'Poson Full Moon Poya Day',
      date: '2026-06-01',
      recurring: false,
      length: 0,
    },
    {
      name: "New Year's Day",
      date: '2026-01-01',
      recurring: true,
      length: 0,
    },
    {
      name: 'Christmas Day',
      date: '2026-12-25',
      recurring: true,
      length: 0,
    },
    {
      name: 'Thai Pongal',
      date: '2026-01-14',
      recurring: true,
      length: 4,
    },
  ] as const satisfies readonly HolidaySeed[],
};
