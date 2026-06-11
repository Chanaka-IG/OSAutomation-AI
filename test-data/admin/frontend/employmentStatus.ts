/** UI strings, routes, and form values for Admin → Job → Employment Status tests. */

export const adminEmploymentStatus = {
  routes: {
    list: '/web/index.php/admin/employmentStatus',
    add: '/web/index.php/admin/saveEmploymentStatus',
  },
  urlPatterns: {
    /** List page — `/admin/employmentStatus` (also the post-save redirect target). */
    list: /\/employmentStatus(\?.*)?$/i,
    /** Add form — `/admin/saveEmploymentStatus`. */
    add: /saveEmploymentStatus$/i,
    /** Edit form — `/admin/saveEmploymentStatus/{id}`. */
    edit: /saveEmploymentStatus\/\d+$/i,
  },
  /** Validation messages verified live on the kord instance (2026-06-09). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    /** Employment Status name limit is 50 (NOT Job Titles' 100). */
    maxLength: 'Should not exceed 50 characters',
    /** Rendered to ESS/unauthorised users on direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  /** Hard-delete confirmation dialog copy (verified live, identical to Job Titles). */
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  samples: {
    /** 51 chars — exceeds the 50-char name limit (live length error). */
    overlongName: 'A'.repeat(51),
    /** Exactly 50 chars — boundary (accepted). */
    maxLengthName: 'B'.repeat(50),
  },
  /** Seeded master-data status reused (read-only!) for duplicate checks. */
  masterData: {
    duplicateName: 'Permanent',
  },
} as const;
