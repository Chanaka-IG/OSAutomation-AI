import { env } from '../../src/config/env';

export type LeaveTypeSeed = {
  name: string;
  situational: boolean;
};

export const leaveTypes = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/leave/leave-types',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    { name: 'Sick Leave', situational: true },
    { name: 'Annual Leave', situational: false },
    { name: 'Casual Leave', situational: true },
    { name: 'Time Off In Lieu', situational: false },
  ] as const satisfies readonly LeaveTypeSeed[],
};
