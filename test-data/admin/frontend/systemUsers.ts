/** UI strings, routes, and form values for Admin → User Management → Users tests. */

export const adminSystemUsers = {
  routes: {
    list: '/web/index.php/admin/viewSystemUsers',
    add: '/web/index.php/admin/saveSystemUser',
  },
  urlPatterns: {
    list: /viewSystemUsers/i,
    add: /saveSystemUser$/i,
    dashboard: /dashboard\/index/i,
  },
  /** Validation messages verified live on the kord instance (2026-06-07). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    usernameMinLength: 'Should be at least 5 characters',
    usernameMaxLength: 'Should not exceed 40 characters',
    passwordMinLength: 'Should have at least 8 characters',
    passwordNeedsUpperCase: 'Your password must contain minimum 1 upper-case letter',
    passwordsDoNotMatch: 'Passwords do not match',
    /** Shown in the Employee Name autocomplete error slot when free text is never bound to a hint. */
    invalid: 'Invalid',
    noRecordsFound: 'No Records Found',
    /** Rendered to ESS/unauthorised users on direct admin URLs. */
    credentialRequired: 'Credential Required',
    /** Login alert for a Status=Disabled account (verified live 2026-06-07). */
    accountDisabled: 'Account disabled',
  },
  samples: {
    /** Strong enough that the live strength meter shows no warning ("Strongest"). */
    strongPassword: 'Kx9#mPv@2Lq7',
    weakShortPassword: 'Ab@1',
    /** ≥ 8 chars but no upper-case letter — triggers the upper-case rule. */
    noUpperCasePassword: 'abcdefgh',
    tooShortUsername: 'abc',
    /** 41 chars — exceeds the 40-char username limit. */
    overlongUsername: 'a'.repeat(41),
    /** Free text that matches no employee in the autocomplete. */
    unknownEmployeeQuery: 'zzzznotanemployee',
  },
  /** Seeded master-data username reused (read-only!) for duplicate checks. */
  masterData: {
    duplicateUsername: 'admin',
  },
} as const;
