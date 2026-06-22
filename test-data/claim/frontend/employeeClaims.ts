/** UI strings, routes, and filter values for the Admin "Employee Claims" search/list page. */

export const employeeClaims = {
  routes: {
    /** Admin Employee Claims search/list (heading "Employee Claims"). */
    list: '/web/index.php/claim/viewAssignClaim',
    /** ESS Submit Claim page — used to inspect the ESS Claim top-menu. */
    essSubmitClaim: '/web/index.php/claim/submitClaim',
    detail: (id: number) => `/web/index.php/claim/assignClaim/id/${id}`,
  },
  urlPatterns: {
    list: /claim\/viewAssignClaim$/i,
    detail: /claim\/assignClaim\/id\/\d+$/i,
    login: /auth\/login/i,
  },
  headings: {
    list: 'Employee Claims',
  },
  messages: {
    noRecords: 'No Records Found',
    credentialRequired: 'Credential Required',
  },
  /** Status filter options (lifecycle states). */
  statuses: {
    initiated: 'Initiated',
    submitted: 'Submitted',
    paid: 'Paid',
  },
  /** Include filter options. */
  include: {
    currentOnly: 'Current Employees Only',
    currentAndPast: 'Current and Past Employees',
    pastOnly: 'Past Employees Only',
  },
  /** Target employee that owns the seeded claims (seeded ESS user, empNumber 2). */
  employee: {
    query: 'Marcus',
    optionLabel: 'Marcus James Chen',
    summaryName: 'Marcus Chen',
    firstName: 'Marcus',
    lastName: 'Chen',
  },
  /** Reuses the persistent config fixtures created by the submit-claim / assign-claim suites. */
  fixtures: {
    currencyId: 'USD',
    activeEvent: 'ESS Submit Claim E2E Event',
    inactiveEvent: 'ESS Submit Claim E2E Inactive Event',
  },
  samples: {
    seedRemarks: 'Employee Claims list fixture (E2E)',
    /** A reference id that matches nothing — drives the empty state. */
    unknownReference: 'NO-SUCH-REFERENCE-0000',
    /** A future date range that contains no claims — proves the date filter constrains results. */
    futureFromDate: '2035-01-01',
    futureToDate: '2035-12-31',
    /** A wide range that contains every claim. */
    wideFromDate: '2000-01-01',
    wideToDate: '2035-12-31',
  },
} as const;
