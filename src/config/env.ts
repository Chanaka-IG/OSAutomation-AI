/** Default OrangeHRM UI origin (path-relative URLs use `/web/index.php/...`). Override with `BASE_URL`. */
const DEFAULT_BASE_URL = 'https://automationtest-os-kord.orangehrm.com';

export const env = {
  baseURL: process.env.BASE_URL ?? DEFAULT_BASE_URL,
  /** OrangeHRM admin API/session login (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). */
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin@OHRM123',
  /**
   * Logger verbosity (`src/lib/logger.ts`): `silent` (errors only) | `error` | `warn` | `info` | `debug`.
   * Set with `LOG_LEVEL`. Default `info`.
   */
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
