/** UI strings, routes, and filter values for Directory module tests. */

export const directory = {
  routes: {
    view: '/web/index.php/directory/viewDirectory',
  },
  /** Read-only list endpoint backing the page (used for UI-vs-API cross-checks). */
  apiPath: '/web/index.php/api/v2/directory/employees',
  urlPatterns: {
    view: /directory\/viewDirectory/i,
  },
  /** Strings verified live on the kord instance (2026-06-07). */
  messages: {
    noRecordsFound: 'No Records Found',
    /** Employee Name autocomplete error when free text is never bound to a hint. */
    invalid: 'Invalid',
    /** Default text of the Job Title / Location dropdowns. */
    defaultSelect: '-- Select --',
  },
  samples: {
    /** Free text that matches no employee in the autocomplete. */
    unknownEmployeeQuery: 'zzzznotanemployee',
  },
  /**
   * Master-data names referenced read-only (never mutated by this suite).
   * Seeds live in `test-data/pim/api/jobTitles.ts` / `locations.ts`.
   */
  masterData: {
    /** Job title + location assigned to the suite-owned employee in beforeAll. */
    suiteJobTitle: 'Senior Software Engineer',
    suiteLocation: 'Seattle — Headquarters',
    /**
     * Location used to force an empty result set: combined with `suiteJobTitle`
     * it matches nobody (only the suite employee holds that title, and it sits
     * in `suiteLocation`).
     */
    nonMatchingLocation: 'Sydney — Pacific Office',
  },
} as const;
