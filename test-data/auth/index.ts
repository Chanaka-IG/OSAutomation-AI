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
    /** "Forgot your password?" target. On an email-unconfigured instance this is the terminal page. */
    requestPasswordReset: '/web/index.php/auth/requestPasswordResetCode',
    logout: '/web/index.php/auth/logout',
    dashboard: '/web/index.php/dashboard/index',
    /** A protected page used to prove unauthenticated/expired sessions redirect to login. */
    protectedDeepLink: '/web/index.php/pim/viewEmployeeList',
  },
  urlPatterns: {
    login: /auth\/login/i,
    dashboard: /dashboard\/index/i,
    requestPasswordReset: /auth\/requestPasswordResetCode/i,
  },
  /** Login / reset strings verified live on the kord instance (OrangeHRM OS 5.8, 2026-06-25). */
  messages: {
    invalidCredentials: 'Invalid credentials',
    required: 'Required',
    accountDisabled: 'Account disabled',
    resetHeading: 'Reset Password',
    /** Shown on the reset page when the instance has no email configured. */
    emailNotConfigured:
      'The OrangeHRM system is not configured to receive email notifications. Please contact your OrangeHRM administrator to reset your password',
  },
  /** Inputs for negative / edge login attempts. */
  samples: {
    unknownUsername: 'no.such.user.zzz',
    wrongPassword: 'wrong@Password123',
    longUsername: 'a'.repeat(200),
    sqlInjectionUsername: "' OR '1'='1",
  },
  /** Suite-owned employee + disabled system user for the "Account disabled" path. */
  disabledUser: {
    employee: {
      // OrangeHRM caps employeeId at ~10 chars — keep it short or it is silently rejected.
      employeeId: 'AUTHDIS01',
      firstName: 'Disabled',
      lastName: 'LoginUser',
      middleName: '',
    },
    username: 'disabled.login.user',
    password: 'Disabled@OHRM123',
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
