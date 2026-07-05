/** UI strings, routes, and form values for the Maintenance module tests.
 *  Verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-07-04). */

export const maintenance = {
  routes: {
    /** Module entry — 302-redirects to the Administrator Access gate over `purgeEmployee`. */
    module: '/web/index.php/maintenance/viewMaintenanceModule',
    purge: '/web/index.php/maintenance/purgeEmployee',
    access: '/web/index.php/maintenance/accessEmployeeData',
  },
  urlPatterns: {
    /** Landing sub-page after a successful unlock. */
    purge: /maintenance\/purgeEmployee/i,
    access: /maintenance\/accessEmployeeData/i,
    /** The gate posts here; a failed unlock stays on this URL. */
    adminVerify: /auth\/adminVerify/i,
  },
  /** Autocomplete query endpoints (for route assertions / mocking). */
  api: {
    onlyPast: '**/api/v2/pim/employees?*includeEmployees=onlyPast*',
    currentAndPast: '**/api/v2/pim/employees?*includeEmployees=currentAndPast*',
    purge: '**/api/v2/maintenance/purge',
  },
  /** Strings verified live. */
  messages: {
    accessHeading: 'Administrator Access',
    accessCopy:
      'You have requested to access a critical Administrator function in OrangeHRM and are required to validate your credentials below',
    invalidCredentials: 'Invalid credentials',
    required: 'Required',
    noRecords: 'No Records Found',
    /** Rendered to ESS / unauthorised users on a direct maintenance URL. */
    credentialRequired: 'Credential Required',
    purgeHeading: 'Purge Employee Records',
    accessDataHeading: 'Download Personal Data',
    selectedEmployee: 'Selected Employee',
  },
  /** Purge confirmation dialog copy. */
  purgeDialog: {
    title: 'Purge Employee',
    body: 'You are about to purge the employee permanently. Are you sure you want to continue? This operation cannot be undone',
    confirm: 'Yes, Purge',
    cancel: 'No, Cancel',
  },
  /** Fixture inputs. The reason id is resolved dynamically by name (ids are environment-specific). */
  fixtures: {
    terminationReasonName: 'Contract Not Renewed',
    terminationDate: '2026-01-01',
  },
} as const;
