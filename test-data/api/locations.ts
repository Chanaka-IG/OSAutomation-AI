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
      name: 'Seattle — Headquarters',
      countryCode: 'US',
      province: 'WA',
      city: 'Seattle',
      address: '410 Terry Avenue North, South Lake Union',
      zipCode: '98109',
      phone: '+1 206-555-0142',
      fax: '+1 206-555-0143',
      note: 'Primary US campus; executive and platform teams.',
    },
    {
      name: 'Sydney — Pacific Office',
      countryCode: 'AU',
      province: 'NSW',
      city: 'Sydney',
      address: '100 George Street, Level 12',
      zipCode: '2000',
      phone: '+61 2 9876 5432',
      fax: '+61 2 9876 5433',
      note: 'APAC sales, implementation, and CS hub.',
    },
    {
      name: 'Toronto — Support Center',
      countryCode: 'CA',
      province: 'ON',
      city: 'Toronto',
      address: '200 Bay Street, Suite 2400',
      zipCode: 'M5J 2J2',
      phone: '+1 416-555-0198',
      fax: '+1 416-555-0199',
      note: 'Global support tiers and workforce scheduling.',
    },
  ] as const satisfies readonly LocationSeed[],
};
