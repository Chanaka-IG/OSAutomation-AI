import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the Dashboard suite (`tests/dashboard/dashboard.spec.ts`).
 *
 * Two dedicated employees are seeded in beforeAll:
 *  - `ess`        — plain ESS user; reports to `supervisor`. Self-applies ONE pending
 *                   leave request so the supervisor's My Actions widget has work.
 *  - `supervisor` — ESS user with a subordinate (approver persona for TC-006).
 *
 * Leave type ids are resolved by NAME at runtime (instance ids drift — see
 * leave-e2e-lifecycle). employeeIds 99011/99012 are clear of every other suite
 * (96xxx, 97xxx, 98xxx, 99001–99003).
 */
export const dashboardData = {
  employees: {
    ess: {
      employeeId: '99011',
      firstName: 'TcDash',
      lastName: 'DashEss',
      middleName: '',
    },
    supervisor: {
      employeeId: '99012',
      firstName: 'TcDash',
      lastName: 'DashSup',
      middleName: '',
    },
  } satisfies Record<string, EmployeeSeed>,

  essUser: { username: 'tc.dash.ess', password: 'admin@OHRM123', userRoleId: 2 },
  supervisorUser: { username: 'tc.dash.sup', password: 'admin@OHRM123', userRoleId: 2 },

  /** Reporting method for the supervisor→ess link (1 = Direct). */
  reportingMethodId: 1,

  leaveTypes: {
    annual: { label: 'Annual Leave' },
  },

  entitlements: {
    annualDays: 5,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
  },

  /** Single pending request seeding the supervisor's My Actions (Mon 2026-10-12). */
  pendingDate: '2026-10-12',

  /** Widget titles verified on the live app (Admin set). */
  widgets: {
    timeAtWork: 'Time at Work',
    myActions: 'My Actions',
    quickLaunch: 'Quick Launch',
    buzz: 'Buzz Latest Posts',
    onLeaveToday: 'Employees on Leave Today',
    distBySubunit: 'Employee Distribution by Sub Unit',
    distByLocation: 'Employee Distribution by Location',
  },

  /**
   * Admin quick-launch tiles and their navigation targets (verified).
   *
   * The tile set is whatever `GET /api/v2/dashboard/shortcuts` returns for the logged-in user.
   * On this environment both Time shortcuts come back false — `time.employee_timesheet` is gated
   * on supervising someone (admin has no subordinates) and `time.my_timesheet` is off for the
   * admin and ESS accounts alike — so only the four leave shortcuts render. Re-add the
   * Timesheets / My Timesheet tiles here if the target instance starts serving them.
   */
  quickLaunch: {
    admin: [
      { title: 'Assign Leave', urlPattern: /leave\/assignLeave/ },
      { title: 'Leave List', urlPattern: /leave\/viewLeaveList/ },
      { title: 'Apply Leave', urlPattern: /leave\/applyLeave/ },
      { title: 'My Leave', urlPattern: /leave\/viewMyLeaveList/ },
    ],
    /** Self-service tiles every role keeps (My Timesheet excluded — see above). */
    essTitles: ['Apply Leave', 'My Leave'],
    /** Admin-only tiles that must NOT render for plain ESS. */
    adminOnlyTitles: ['Assign Leave', 'Leave List'],
  },

  /** Verified widget empty-state texts. */
  emptyStates: {
    myActions: 'No Pending Actions to Perform',
  },

  /** My Actions row for a pending leave approval, e.g. "(1) Leave Requests to Approve". */
  patterns: {
    leaveApprovalAction: /\(\d+\)\s*Leave Request(s)? to Approve/i,
    punchStatus: /Punched In/i, // matches "Punched In" and "Not Punched In"
    weekRange: /\w{3}\s\d{2}\s*-\s*\w{3}\s\d{2}/, // e.g. "Jun 01 - Jun 07"
  },

  routes: {
    dashboard: '/web/index.php/dashboard/index',
  },
  urlPatterns: {
    dashboard: /dashboard\/index/,
    login: /auth\/login/i,
    leaveList: /leave\/viewLeaveList/,
  },
} as const;
