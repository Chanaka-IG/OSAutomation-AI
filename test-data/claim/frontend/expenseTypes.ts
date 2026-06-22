/** UI strings, routes, and form values for Claim → Configuration → Expense Types tests. */

export const claimExpenseTypes = {
  routes: {
    list: '/web/index.php/claim/viewExpense',
    add: '/web/index.php/claim/saveExpense',
  },
  urlPatterns: {
    list: /claim\/viewExpense$/i,
    add: /claim\/saveExpense$/i,
    edit: /claim\/saveExpense\/\d+$/i,
  },
  /** Glob for the expense-types list/create endpoint; used to route-mock the empty state. */
  listApiPattern: '**/api/v2/claim/expenses/types**',
  /** Validation / UI messages verified live on the kord instance (OS 5.8). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    successSave: 'Successfully Saved',
    successUpdate: 'Successfully Updated',
    successDelete: 'Successfully Deleted',
    noRecords: 'No Records Found',
    credentialRequired: 'Credential Required',
  },
  /** Hard-delete confirmation dialog copy (verified live). */
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  samples: {
    description: 'Reimbursable expense category',
    updatedName: 'Airfare',
    updatedDescription: 'Flight ticket reimbursement',
    whitespaceName: '   ',
    xssName: "<script>alert('exp')</script>",
  },
} as const;
