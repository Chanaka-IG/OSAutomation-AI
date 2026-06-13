import { env } from '../../../src/config/env';

/** PIM optional-field configuration — instance-wide boolean singleton. */
export type OptionalFieldsConfig = {
  pimShowDeprecatedFields: boolean;
  showSIN: boolean;
  showSSN: boolean;
  showTaxExemptions: boolean;
};

/**
 * PIM Optional Fields config API v2. Host is the same as UI / `BASE_URL`.
 * Playwright resolves `adminPath` against `orangehrmApiContext`'s `baseURL` (`env.baseURL`).
 */
export const optionalFields = {
  get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  /** Path only, appended to `orangehrmBaseURL` (or Playwright `baseURL` on the request context). */
  adminPath: '/web/index.php/api/v2/pim/optional-field',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

  /** Instance default on the kord test instance (verified live 2026-06-13). */
  allOff: {
    pimShowDeprecatedFields: false,
    showSIN: false,
    showSSN: false,
    showTaxExemptions: false,
  } as const satisfies OptionalFieldsConfig,
} as const;
