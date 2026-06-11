
import { env } from '../../../src/config/env';

export type KPIseed = {
  title: string;
  minRating: number;
  maxRating: number;
  jobTitleId: number;
  isDefault: boolean;
};

export const kpis = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/performance/kpis',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      title: 'Test Delete',
      minRating: 25,
      maxRating: 50,
      jobTitleId: 1,
      isDefault: false,
    },
    {
      title: "KPI 2",
      minRating: 10,
      maxRating: 20,
      jobTitleId: 2,
      isDefault: true,
    },
    {
      title : 'KPI 3',
      minRating: 0,
      maxRating: 100,
      jobTitleId: 1,
      isDefault: true,
    },
    {
      title : 'Delete Cancel',
      minRating: 0,
      maxRating: 100,
      jobTitleId: 1,
      isDefault: true,
    },
  ] as const satisfies readonly KPIseed[],
};
