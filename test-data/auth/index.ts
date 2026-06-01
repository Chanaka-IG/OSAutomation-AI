/** Auth routes (OrangeHRM OS). */

export type LoginRole = 'admin' | 'ess' | 'supervisor';

function resolveCredentials(role: LoginRole): { username: string; password: string } {
  switch (role) {
    case 'admin':
      return {
        username:
          process.env.OHRM_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin',
        password:
          process.env.OHRM_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'admin@OHRM123',
      };
    case 'ess':
      return {
        username: process.env.OHRM_ESS_USERNAME ?? '',
        password: process.env.OHRM_ESS_PASSWORD ?? '',
      };
    case 'supervisor':
      return {
        username: process.env.OHRM_SUPERVISOR_USERNAME ?? '',
        password: process.env.OHRM_SUPERVISOR_PASSWORD ?? '',
      };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export const auth = {
  routes: {
    login: '/web/index.php/auth/login',
  },
  urlPatterns: {
    login: /auth\/login/i,
  },
  /** Override with OHRM_USERNAME / OHRM_PASSWORD (or ADMIN_*); same source as `getCredentials('admin')`. */
  credentials: {
    get username() {
      return resolveCredentials('admin').username;
    },
    get password() {
      return resolveCredentials('admin').password;
    },
  },
  /**
   * Known seeded ESS user for suites that must always exercise ESS access control
   * (e.g. recruitment) rather than skip when `OHRM_ESS_*` env vars are unset.
   * Override via `OHRM_ESS_USERNAME` / `OHRM_ESS_PASSWORD`. Centralized here so no
   * spec carries a plaintext credential literal.
   */
  essTestUser: {
    username: process.env.OHRM_ESS_USERNAME || 'marcus.chen',
    password: process.env.OHRM_ESS_PASSWORD || 'admin@OHRM123',
  },
  getCredentials: resolveCredentials,
  /** True when both username and password are non-empty for the role (env-configured). */
  hasLoginCredentials(role: LoginRole): boolean {
    const { username, password } = resolveCredentials(role);
    return Boolean(username && password);
  },
};
