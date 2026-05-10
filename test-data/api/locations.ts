import { env } from '../../src/config/env';

export type LocationSeed = {
  name: string;
  countryCode: string;
  province: string;
  city: string;
  address: string;
  zipCode: string;
  phone: string;
  fax: string;
  note: string;
};

/**
 * Locations Admin API v2. The **host** is the same as UI / `BASE_URL` (not `API_BASE_URL`).
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const locations = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/admin/locations',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  seedRecords: [
    {
      name: 'Washington',
      countryCode: 'US',
      province: 'Alebama',
      city: 'Washington',
      address: '10/12, grandmach, washington',
      zipCode: '25698',
      phone: '56985455795',
      fax: '5155414444551',
      note: 'Washington added',
    },
    {
      name: 'Sydney',
      countryCode: 'AU',
      province: 'Alebama',
      city: 'Washington',
      address: '10/12, grandmach, washington',
      zipCode: '25698',
      phone: '56985455795',
      fax: '5155414444551',
      note: 'Washington added',
    },
    {
      name: 'Location for Leave',
      countryCode: 'CA',
      province: 'Alebama',
      city: 'Location for Leave',
      address: '10/12, grandmach, washington',
      zipCode: '25698',
      phone: '56985455795',
      fax: '5155414444551',
      note: 'Location for Leave added',
    },
  ] as const satisfies readonly LocationSeed[],
};
