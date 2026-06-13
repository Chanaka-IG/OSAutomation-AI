/** UI strings, routes, and form values for Admin → Job → Work Shifts tests. */

export const adminWorkShifts = {
  routes: {
    list: '/web/index.php/admin/workShift',
    add: '/web/index.php/admin/saveWorkShifts',
  },
  urlPatterns: {
    list: /admin\/workShift$/i,
    add: /admin\/saveWorkShifts$/i,
  },
  /** Validation / UI messages verified live on the kord instance (OS 5.8, 2026-06-13). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    successToast: 'Successfully Saved',
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
  /** Default Working Hours window pre-filled by the Add form. */
  defaults: {
    from: '09:00 AM',
    to: '05:00 PM',
    duration: '8.00',
  },
  samples: {
    /** From 10:00 AM → 04:30 PM = 6.50h. */
    customHours: {
      from: { hour: '10', minute: '00', meridiem: 'AM' as const },
      to: { hour: '04', minute: '30', meridiem: 'PM' as const },
      expectedDuration: '6.50',
    },
    /** Recompute check: From 11:30 AM (To stays 05:00 PM) = 5.50h. */
    recalcFrom: { hour: '11', minute: '30', meridiem: 'AM' as const },
    recalcExpectedDuration: '5.50',
    /** From 06:30 PM ≥ To 05:00 PM → floors to 0.00 (no overnight wrap). */
    invalidRangeFrom: { hour: '06', minute: '30', meridiem: 'PM' as const },
    invalidRangeDuration: '0.00',
    /** A known seeded employee for assignment (empNumber 2). */
    assignEmployeeQuery: 'Marcus',
    assignEmployeeName: 'Marcus James Chen',
    /** A second known employee for the multi-assign case (the admin user). */
    assignEmployee2Query: 'Ruwan',
    assignEmployee2Name: 'Ruwan Kumara',
    /** Whitespace-only name — must be rejected as empty ("Required"). */
    whitespaceName: '   ',
  },
} as const;
