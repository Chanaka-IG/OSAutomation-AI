import { env } from '../../../src/config/env';

/** Custom-field type codes used by the API (`fieldType`). */
export const CUSTOM_FIELD_TYPE = {
  textOrNumber: 0,
  dropDown: 1,
} as const;

export type CustomFieldSeed = {
  fieldName: string;
  /** Lowercased screen key, e.g. "personal", "contact". */
  screen: string;
  /** 0 = Text or Number, 1 = Drop Down. */
  fieldType: number;
  /** Comma-separated options (Drop Down only). */
  extraData?: string | null;
};

/**
 * PIM Custom Fields API v2. Host is the same as UI / `BASE_URL`.
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const customFields = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath: '/web/index.php/api/v2/pim/custom-fields',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  /** Hard cap enforced by the backend. */
  maxFields: 10,
} as const;
