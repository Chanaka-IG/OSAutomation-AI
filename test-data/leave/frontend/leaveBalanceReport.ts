import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the Leave Entitlements and Usage Report UI suite
 * (`tests/leave/leave-entitlements-usage-report.spec.ts`).
 *
 * Feature: `Leave → Reports → Leave Entitlements and Usage Report` (Admin/Supervisor,
 * `/leave/viewLeaveBalanceReport`) and `My Leave Entitlements and Usage Report`
 * (ESS/self, `/leave/viewMyLeaveBalanceReport`).
 *
 * One dedicated employee + ESS user is seeded once in `beforeAll` (with an Annual
 * entitlement) and deleted in `afterAll`. The results grid is a `revo-grid` web component
 * (shadow DOM) whose cells/headers are NOT reachable by Playwright locators, so the suite
 * drives the UI and asserts on the report's own `/api/v2/leave/reports/data` response plus
 * the visible `(N) Records Found` indicator.
 */
export const leaveBalanceReportData = {
  routes: {
    adminReport: '/web/index.php/leave/viewLeaveBalanceReport',
    myReport: '/web/index.php/leave/viewMyLeaveBalanceReport',
  },
  urlPatterns: { login: /auth\/login/i },

  /** `name` query values the report-data API is called with, per Generate-For mode. */
  reportNames: {
    leaveType: 'leave_type_leave_entitlements_and_usage',
    employee: 'employee_leave_entitlements_and_usage',
    my: 'my_leave_entitlements_and_usage',
  },

  /** Dedicated employee selected in Employee mode and linked to the ESS user below. */
  employee: {
    employeeId: '96070',
    firstName: 'TcRpt',
    lastName: 'UsageOne',
    middleName: '',
  } satisfies EmployeeSeed,

  /** ESS login (userRoleId 2) linked to the employee — for the My report + access tests. */
  user: { username: 'tc.rpt.ess', password: 'admin@OHRM123', userRoleId: 2 },

  leaveType: { id: 2, label: 'Annual Leave' },

  /** Entitlement seeded for the active 2026 period (gives the Employee/My report a real row). */
  entitlement: { days: 10, fromDate: '2026-01-01', toDate: '2026-12-31' },

  /** Documented result columns (Help Portal + discovered headers API). */
  leaveTypeModeColumns: [
    'Employee',
    'Leave Entitlements (Days)',
    'Leave Pending Approval (Days)',
    'Leave Scheduled (Days)',
    'Leave Taken (Days)',
    'Leave Balance (Days)',
  ],
  employeeModeColumns: [
    'Leave Type',
    'Leave Entitlements (Days)',
    'Leave Pending Approval (Days)',
    'Leave Scheduled (Days)',
    'Leave Taken (Days)',
    'Leave Balance (Days)',
  ],

  /** Row-object property keys the grid is built from (asserted in lieu of shadow-DOM cells). */
  leaveTypeRowProps: [
    'employeeName',
    'entitlementDays',
    'pendingApprovalDays',
    'scheduledDays',
    'takenDays',
    'balanceDays',
  ] as const,
  employeeRowProps: [
    'leaveTypeName',
    'entitlementDays',
    'pendingApprovalDays',
    'scheduledDays',
    'takenDays',
    'balanceDays',
  ] as const,

  /** Criteria labels visible per Generate-For mode (TC-501 / TC-502). */
  leaveTypeModeLabels: ['Leave Type', 'Leave Period', 'Location', 'Sub Unit', 'Job Title'],
  employeeModeLabels: ['Employee Name', 'Leave Period'],
} as const;
