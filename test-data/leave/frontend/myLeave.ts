import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the My Leave (ESS) UI suite (`tests/leave/my-leave.spec.ts`).
 *
 * Feature: an ESS user views/manages their OWN leave at `/leave/viewMyLeaveList`.
 *
 * One dedicated ESS employee is seeded once in `beforeAll`; it self-applies several
 * Pending Approval requests on distinct, non-overlapping working days (overlap is enforced
 * per-employee). The employee is deleted in `afterAll` (which clears its leave + user).
 */
export const myLeaveData = {
  /** Dedicated ESS employee that owns all the leave under test. */
  employee: {
    employeeId: '96050',
    firstName: 'TcMyLeave',
    lastName: 'EssOne',
    middleName: '',
  } satisfies EmployeeSeed,

  /** ESS login (userRoleId 2) linked to the employee above. */
  user: { username: 'tc.myleave.ess', password: 'admin@OHRM123', userRoleId: 2 },

  /**
   * A SECOND dedicated employee with NO entitlement and NO requests — used by TC-401 to
   * prove the empty My Leave state. Seeded/cleaned alongside the primary employee.
   */
  noEntitlementEmployee: {
    employeeId: '96052',
    firstName: 'TcMyLeave',
    lastName: 'EssNoEnt',
    middleName: '',
  } satisfies EmployeeSeed,
  noEntitlementUser: { username: 'tc.myleave.noent', password: 'admin@OHRM123', userRoleId: 2 },

  /** A second entitlement (different leave type, ZERO requests) so TC-304 can filter to an empty type. */
  secondEntitlementDays: 5,

  leaveType: { id: 2, label: 'Annual Leave' },

  /** Entitlement seeded for the active 2026 period. */
  entitlement: { days: 20, fromDate: '2026-01-01', toDate: '2026-12-31' },

  /** DB status codes (business-rules §4). */
  statusCode: { rejected: -1, cancelled: 0, pending: 1, scheduled: 2, taken: 3 },

  /** "Show Leave with Status" multi-select labels. */
  statusLabel: {
    pending: 'Pending Approval',
    scheduled: 'Scheduled',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    taken: 'Taken',
  },

  /**
   * One distinct request per scenario (Aug 2026 weekdays; 08-06 is a seeded global
   * holiday — avoided). `weekendSpan` is a Fri→Mon range = 2 working days.
   */
  dates: {
    search: '2026-08-03', // TC-001 / TC-004 / TC-105 / TC-202
    cancel: '2026-08-04', // TC-006
    escrow: '2026-08-05', // TC-104
    dateRange: '2026-08-11', // TC-003
    weekendSpanFrom: '2026-08-07', // TC-107 (Fri)
    weekendSpanTo: '2026-08-10', // TC-107 (Mon) → 2 working days
    /** Seeded then cancelled in beforeAll — owned by the terminal-state tests (TC-108 / TC-404). */
    preCancelled: '2026-08-12',
    /** A range that contains none of the seeded requests (TC-303 / TC-502). */
    emptyRangeFrom: '2026-03-02',
    emptyRangeTo: '2026-03-06',
    /** Probe range for the Reset test (TC-007) — any non-default range. */
    resetProbeFrom: '2026-02-01',
    resetProbeTo: '2026-02-02',
  },

  /** Expected result-grid column headers (TC-505). */
  columns: [
    'Date',
    'Employee Name',
    'Leave Type',
    'Leave Balance (Days)',
    'Number of Days',
    'Status',
    'Comments',
    'Actions',
  ],

  /** All five "Show Leave with Status" options (TC-504). */
  allStatusOptions: ['Rejected', 'Cancelled', 'Pending Approval', 'Scheduled', 'Taken'],

  /** Default search range = current annual leave period. */
  defaultRange: { fromDate: '2026-01-01', toDate: '2026-12-31' },

  routes: {
    myLeaveList: '/web/index.php/leave/viewMyLeaveList',
    leaveList: '/web/index.php/leave/viewLeaveList',
  },
  urlPatterns: {
    login: /auth\/login/i,
  },
} as const;
