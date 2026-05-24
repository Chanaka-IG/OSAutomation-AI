import { env } from '../../../src/config/env';

export type SubunitSeed = {
  parentId: number;
  unitId: string;
  name: string;
  description: string;
};

export const subunits = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/admin/subunits',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      parentId: 1,
      unitId: '001',
      name: 'Engineering',
      description: 'Product development, infrastructure, and quality engineering.',
    },
    {
      parentId: 1,
      unitId: '002',
      name: 'Product & Design',
      description: 'Product management, UX research, content design, and analytics.',
    },
    {
      parentId: 1,
      unitId: '003',
      name: 'People Operations',
      description: 'HR business partners, recruiting, compensation, and employee relations.',
    },
  ] as const satisfies readonly SubunitSeed[],
};
