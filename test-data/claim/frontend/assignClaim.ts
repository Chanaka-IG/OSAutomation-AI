/** UI strings, routes, and form values for the Admin "Assign Claim" flow. */

export const assignClaim = {
  routes: {
    /** Admin employee-claims list (has the Assign Claim button). */
    list: '/web/index.php/claim/viewAssignClaim',
    assign: '/web/index.php/claim/assignClaim',
    detail: (id: number) => `/web/index.php/claim/assignClaim/id/${id}`,
  },
  urlPatterns: {
    detail: /claim\/assignClaim\/id\/\d+$/i,
    list: /claim\/viewAssignClaim$/i,
  },
  messages: {
    required: 'Required',
    successSave: 'Successfully Saved',
    noRecords: 'No Records Found',
    credentialRequired: 'Credential Required',
  },
  statuses: {
    initiated: 'Initiated',
  },
  /** Target employee for assignment (seeded ESS user, empNumber 2). */
  employee: {
    /** Typed into the autocomplete. */
    query: 'Marcus',
    /** Autocomplete option label + the value shown in the Employee summary field. */
    optionLabel: 'Marcus James Chen',
    summaryName: 'Marcus Chen',
    firstName: 'Marcus',
    lastName: 'Chen',
  },
  /** Reuses the persistent config fixtures created by the submit-claim suite. */
  fixtures: {
    currencyName: 'United States Dollar',
    currencyId: 'USD',
    activeEvent: 'ESS Submit Claim E2E Event',
    inactiveEvent: 'ESS Submit Claim E2E Inactive Event',
    activeExpenseType: 'ESS Submit Claim E2E Expense Type',
    inactiveExpenseType: 'ESS Submit Claim E2E Inactive Expense Type',
  },
  samples: {
    remarks: 'Admin-assigned claim (E2E)',
    date: '2026-06-20',
    amount1: '60.00',
    amount2: '40.00',
    /** 60.00 + 40.00 */
    expectedTotal: '100.00',
    /** Free text that matches no employee hint. */
    unknownEmployee: 'Zzz No Such Person',
  },
} as const;
