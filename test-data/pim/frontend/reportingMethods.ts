/** UI strings, routes, and form values for PIM → Configuration → Reporting Methods tests. */

export const reportingMethods = {
  routes: {
    list: '/web/index.php/pim/viewReportingMethods',
    add: '/web/index.php/pim/saveReportingMethod',
  },
  urlPatterns: {
    list: /pim\/viewReportingMethods$/i,
    add: /pim\/saveReportingMethod$/i,
  },
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    successToast: 'Successfully Saved',
    /** Rendered to ESS/unauthorised users on the direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  /** Seeded default reporting method reused (read-only) for duplicate checks. */
  duplicateName: 'Direct',
  /** A seeded employee (Marcus Chen, empNumber 2) used read-only for the Report-to dropdown check. */
  sampleEmpNumber: 2,
  samples: {
    whitespaceName: '   ',
    xssName: "<script>alert('xss')</script>",
  },
} as const;
