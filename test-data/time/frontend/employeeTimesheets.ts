import { env } from '../../../src/config/env';

/**
 * UI strings, routes, and API paths for Time → Timesheets → Employee Timesheets
 * (`/time/viewEmployeeTimesheet`) — the supervisor/admin view used to look up a subordinate's
 * timesheet and Approve/Reject it. Verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-16).
 *
 * Notes (live-verified, some contradict the domain skill):
 * - The list view has a **Select Employee** card (Employee Name autocomplete + View) and a
 *   "Timesheets Pending Action" panel of the supervisor's submitted-and-pending timesheets.
 * - The detail page is `time/viewTimesheet/employeeId/{empNumber}?startDate=YYYY-MM-DD`
 *   (heading "Timesheet for <name>"). When the timesheet is **Submitted**, an inline
 *   **"Timesheet Action"** card renders with a Comment textbox + Reject/Approve buttons
 *   (it is NOT a modal). You cannot action your **own** timesheet (only Edit shows).
 * - The reject **comment is optional** in OS 5.8 — rejecting with an empty comment still
 *   transitions the timesheet to `Rejected` (the domain skill's "mandatory comment" is
 *   Enterprise-only / stale). Reject sets state to `REJECTED` (not `NOT_SUBMITTED`).
 * - Admin can view/approve any employee; a non-supervisor ESS gets a **"Credential Required"**
 *   content panel on the route.
 */
export const employeeTimesheets = {
  routes: {
    selectView: '/web/index.php/time/viewEmployeeTimesheet',
    /** Detail/approve page for a specific employee + week (any in-week date). */
    detail: (empNumber: number, date: string): string =>
      `/web/index.php/time/viewTimesheet/employeeId/${empNumber}?startDate=${date}`,
  },
  urlPatterns: {
    selectView: /time\/viewEmployeeTimesheet/i,
    detail: /time\/viewTimesheet\/employeeId\/\d+/i,
    login: /auth\/login/i,
  },
  /** API v2 paths (host = `env.baseURL`). */
  apiPaths: {
    /** POST `{date}` creates the week; GET lists an employee's timesheets. */
    employeeTimesheets: (empNumber: number): string =>
      `/web/index.php/api/v2/time/employees/${empNumber}/timesheets`,
    /** GET `?date=YYYY-MM-DD&empNumber=` → the week boundaries for that employee. */
    defaultTimesheet: '/web/index.php/api/v2/time/timesheets/default',
    /** Employee-scoped entries — note: no empNumber segment. */
    entries: (id: number): string => `/web/index.php/api/v2/time/employees/timesheets/${id}/entries`,
    /** PUT `{action,comment?}` — SUBMIT / APPROVE / REJECT for an employee's timesheet. */
    action: (empNumber: number, id: number): string =>
      `/web/index.php/api/v2/time/employees/${empNumber}/timesheets/${id}`,
  },
  get apiBaseUrl(): string {
    return env.baseURL.replace(/\/$/, '');
  },
  headings: {
    select: 'Select Employee',
    action: 'Timesheet Action',
    actionLog: 'Actions Performed on the Timesheet',
    /** Detail heading reads "Timesheet for <employee name>". */
    detailPrefix: 'Timesheet for',
  },
  /** `Status: <state>` text rendered on the detail view. */
  status: {
    notSubmitted: 'Not Submitted',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  /** Action-log "Actions" column values. */
  actions: {
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  messages: {
    noRecordsFound: 'No Records Found',
    noTimesheetsFound: 'No Timesheets Found',
    credentialRequired: 'Credential Required',
  },
  placeholders: {
    employeeName: 'Type for hints...',
    comment: 'Type here ...',
  },
  /** `reportingMethodId` for a Direct supervisor link (GET /pim/reporting-methods → Direct=1). */
  reportingMethodDirectId: 1,
  samples: {
    /**
     * Stable, suite-owned Customer/Project names (NOT stamped): a project referenced by a timesheet
     * can't be hard-deleted, so reusing the same names across runs (create-if-absent) avoids
     * accumulating residue on the shared instance.
     */
    customerName: 'ETS Customer',
    projectName: 'ETS Project',
    activityName: 'Development',
    validHours: '08:00',
    rejectComment: 'Please correct the logged hours and resubmit.',
  },
  /** Subordinate seeded for the suite (reports to the session admin). employeeId ≤ 10 chars. */
  subordinate: {
    employeeId: 'ETS0001',
    firstName: 'Empts',
    lastName: 'Subordinate',
    middleName: '',
  },
} as const;
