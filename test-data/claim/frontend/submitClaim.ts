/** UI strings, routes, and form values for the ESS "Submit Claim" flow. */

export const submitClaim = {
  routes: {
    create: '/web/index.php/claim/submitClaim',
    myClaims: '/web/index.php/claim/viewClaim',
    /** Admin-only Assign Claim (used for the ESS security check). */
    assignClaim: '/web/index.php/claim/viewAssignClaim',
    detail: (id: number) => `/web/index.php/claim/submitClaim/id/${id}`,
  },
  urlPatterns: {
    detail: /claim\/submitClaim\/id\/\d+$/i,
    myClaims: /claim\/viewClaim$/i,
  },
  messages: {
    required: 'Required',
    successSave: 'Successfully Saved',
    noRecords: 'No Records Found',
    credentialRequired: 'Credential Required',
  },
  statuses: {
    initiated: 'Initiated',
    submitted: 'Submitted',
    cancelled: 'Cancelled',
  },
  /** Persistent config fixtures (created via API with createIfAbsent, never deleted). */
  fixtures: {
    currencyName: 'United States Dollar',
    currencyId: 'USD',
    activeEvent: 'ESS Submit Claim E2E Event',
    inactiveEvent: 'ESS Submit Claim E2E Inactive Event',
    activeExpenseType: 'ESS Submit Claim E2E Expense Type',
    inactiveExpenseType: 'ESS Submit Claim E2E Inactive Expense Type',
  },
  samples: {
    remarks: 'Business trip reimbursement (E2E)',
    date: '2026-06-20',
    amount1: '125.50',
    amount2: '74.50',
    /** 125.50 + 74.50 */
    expectedTotal: '200.00',
  },
} as const;
