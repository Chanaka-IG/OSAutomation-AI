import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the Leave Action UI suite (`tests/leave/leave-action.spec.ts`).
 *
 * Feature: Approve / Reject / Cancel actions on already-applied leave from the
 * Admin/Supervisor Leave List (`/leave/viewLeaveList`).
 *
 * Three dedicated employees are seeded once in `beforeAll`:
 *  - `subordinate` — applies the pending requests that Admin & Supervisor act on; reports to `supervisor`.
 *  - `supervisor`  — an ESS user with a subordinate; also applies one OWN request (self-approval test).
 *  - `other`       — a NON-subordinate; applies one pending request (supervisor-scope test).
 *
 * Every request is a single FULL working day on a distinct, non-overlapping date
 * (overlap is enforced per-employee, so dates only need to be unique within an employee).
 */
export const leaveActionData = {
  employees: {
    /** Applies the pending requests acted on by Admin (and by the Supervisor as a subordinate). */
    subordinate: {
      employeeId: '96001',
      firstName: 'TcAction',
      lastName: 'SubOne',
      middleName: '',
    },
    /** Supervisor of `subordinate`; also applies one own request for the self-approval test. */
    supervisor: {
      employeeId: '96002',
      firstName: 'TcAction',
      lastName: 'SupOne',
      middleName: '',
    },
    /** Non-subordinate used to prove a Supervisor cannot action others' leave. */
    other: {
      employeeId: '96003',
      firstName: 'TcAction',
      lastName: 'OthOne',
      middleName: '',
    },
  } satisfies Record<string, EmployeeSeed>,

  /** ESS logins (userRoleId 2). The subordinate/other accounts exist so they can self-apply (→ Pending). */
  subordinateUser: { username: 'tc.lve.act.sub', password: 'admin@OHRM123', userRoleId: 2 },
  supervisorUser: { username: 'tc.lve.act.sup', password: 'admin@OHRM123', userRoleId: 2 },
  otherUser: { username: 'tc.lve.act.oth', password: 'admin@OHRM123', userRoleId: 2 },

  /** Reporting method for the supervisor→subordinate link (1 = Direct). */
  reportingMethodId: 1,

  leaveTypes: {
    annual: { id: 2, label: 'Annual Leave' },
  },

  /** Entitlement seeded for every test employee for the active 2026 period. */
  entitlements: {
    annualDays: 20,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
  },

  /** DB status codes for the leave workflow (see business-rules §4). */
  statusCode: {
    rejected: -1,
    cancelled: 0,
    pending: 1,
    scheduled: 2,
    taken: 3,
  },

  /** Status filter labels in the "Show Leave with Status" control. */
  statusLabel: {
    pending: 'Pending Approval',
    scheduled: 'Scheduled',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  },

  /**
   * One distinct full-working-day per scenario (all weekdays in Aug 2026:
   * Aug 3–7, 10–14, 17–21, 24 are Mon–Fri). Cleanup deletes the employees afterwards.
   */
  dates: {
    // ── subordinate's requests (Admin acts on these) ──
    approve: '2026-08-03', // TC-001
    reject: '2026-08-04', // TC-002
    cancel: '2026-08-05', // TC-003
    approveBalance: '2026-08-21', // TC-100 (08-06 is a seeded global holiday — avoid)
    rejectBalance: '2026-08-07', // TC-101
    cancelBalance: '2026-08-10', // TC-102
    actionsVisible: '2026-08-11', // TC-500
    toast: '2026-08-12', // TC-502
    statusUpdates: '2026-08-13', // TC-503
    cancelScheduled: '2026-08-14', // TC-006 — seeded pending then admin-approved → Scheduled
    // ── supervisor acts on subordinate's requests ──
    supApprove: '2026-08-17', // TC-004
    supReject: '2026-08-18', // TC-005
    // ── supervisor's OWN request (cannot self-approve) ──
    supSelf: '2026-08-19', // TC-106
    // ── non-subordinate's request (supervisor cannot action) ──
    otherPending: '2026-08-20', // TC-202
  },

  routes: {
    leaveList: '/web/index.php/leave/viewLeaveList',
  },
  urlPatterns: {
    login: /auth\/login/i,
  },
} as const;
