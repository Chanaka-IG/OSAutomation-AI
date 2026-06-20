/** UI strings, routes, and form values for Claim → Configuration → Events tests. */

export const claimEvents = {
  routes: {
    list: '/web/index.php/claim/viewEvents',
    add: '/web/index.php/claim/saveEvents',
    /** Submit Claim — used to verify active events surface in the Event dropdown. */
    submitClaim: '/web/index.php/claim/submitClaim',
  },
  urlPatterns: {
    list: /claim\/viewEvents$/i,
    add: /claim\/saveEvents$/i,
    edit: /claim\/saveEvents\/\d+$/i,
  },
  /** Glob for the events list/create endpoint; used to route-mock the empty state. */
  listApiPattern: '**/api/v2/claim/events**',
  /** Validation / UI messages verified live on the kord instance (OS 5.8). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    successSave: 'Successfully Saved',
    successUpdate: 'Successfully Updated',
    successDelete: 'Successfully Deleted',
    noRecords: 'No Records Found',
    /** Rendered to ESS/unauthorised users on direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  /** Hard-delete confirmation dialog copy (verified live). */
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  /** Form sample values. Names that must be unique per run are generated in the spec via Date.now(). */
  samples: {
    description: 'Travel reimbursement for conferences',
    updatedName: 'Mileage Reimbursement',
    updatedDescription: 'Per-mile travel claim',
    /** Whitespace-only name — must be rejected as empty ("Required"). */
    whitespaceName: '   ',
    /** XSS payload — must render as inert text. */
    xssName: "<script>alert('evt')</script>",
  },
} as const;
