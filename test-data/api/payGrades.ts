import { env } from '../../src/config/env';

export type PayGradeSeed = {
  name: string;
};

export const payGrades = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/admin/pay-grades',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    { name: 'Band A — Associate' },
    { name: 'Band B — Professional' },
    { name: 'Band C — Lead / Principal' },
  ] as const satisfies readonly PayGradeSeed[],
};
