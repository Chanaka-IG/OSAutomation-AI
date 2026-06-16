/**
 * Seed identities + sample values for the cross-role timesheet lifecycle E2E
 * (ESS submits via `time/viewMyTimesheet`; Admin/Supervisor actions via `time/viewEmployeeTimesheet`).
 *
 * Routes/UI strings are reused from the sibling data modules:
 *   - ESS side:        `test-data/time/frontend/timesheets` (`frontend.timesheets`)
 *   - Supervisor side: `test-data/time/frontend/employeeTimesheets` (`frontend.employeeTimesheets`)
 *
 * Seed strategy (verified live, 2026-06-16): a dedicated ESS **employee + login (userRoleId 2)** reporting
 * to the session admin, plus a Customer→Project→Activity where the **ESS is a project admin** — required so
 * the project appears in the ESS My-Timesheet autocomplete (`/time/projects?onlyAllowed=true`). Identities
 * are STABLE and created-if-absent (reused across runs) so nothing accumulates on the shared instance.
 */
export const timesheetLifecycle = {
  /** ESS employee who submits their own timesheet. employeeId ≤ 10 chars (API cap). */
  essEmployee: {
    employeeId: 'TSVIS01',
    firstName: 'TceTs',
    lastName: 'EssVis',
    middleName: '',
  },
  /** ESS login mapped to {@link essEmployee} (userRoleId 2 = ESS). */
  essUser: {
    username: 'tc.e2e.ts.vis',
    password: 'admin@OHRM123',
    userRoleId: 2,
  },
  /** `reportingMethodId` for a Direct supervisor link (GET /pim/reporting-methods → Direct=1). */
  reportingMethodDirectId: 1,
  project: {
    customerName: 'TS Vis Cust',
    projectName: 'TS Vis Proj',
    activityName: 'Development',
    activity2Name: 'Testing',
  },
  samples: {
    validHours: '08:00',
    day2Hours: '04:00',
    /** day1 + day2 row/grand total. */
    twoDayTotal: '12:00',
    overLimitHours: '25:00',
    resubmitHours: '06:00',
    rejectComment: 'Please correct the logged hours and resubmit.',
  },
} as const;
