import { env } from '../../../src/config/env';

export type AdminUserSeed = {
  username: string;
  password: string;
  status: boolean;
  userRoleId: number;
  empNumber: number;
};

export const adminUsers = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/admin/users',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      username: 'marcus.chen',
      password: 'admin@OHRM123',
      status: true,
      userRoleId: 2,
      empNumber: 2,
    },
  ] as const satisfies readonly AdminUserSeed[],
};
