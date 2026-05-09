/** Default OrangeHRM UI origin (path-relative URLs use `/web/index.php/...`). Override with `BASE_URL`. */
const DEFAULT_BASE_URL = 'https://automationtest-os-kord.orangehrm.com';

export const env = {
  baseURL: process.env.BASE_URL ?? DEFAULT_BASE_URL,
  /** API root for JSONPlaceholder sample (`postsApi`). Override with `API_BASE_URL`. */
  apiBaseURL:
    process.env.API_BASE_URL ?? 'https://jsonplaceholder.typicode.com',
  /** OrangeHRM admin API/session login (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). */
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin@OHRM123',
};
