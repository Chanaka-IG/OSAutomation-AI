/** Auth routes (OrangeHRM OS). */

export const auth = {
  routes: {
    login: '/web/index.php/auth/login',
  },
  urlPatterns: {
    login: /auth\/login/i,
  },
  /** Override with OHRM_USERNAME / OHRM_PASSWORD if you avoid committing defaults. */
  credentials: {
    username: process.env.OHRM_USERNAME ?? 'admin',
    password: process.env.OHRM_PASSWORD ?? 'admin@OHRM123',
  },
} as const;
