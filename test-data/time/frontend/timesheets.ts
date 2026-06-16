import { env } from '../../../src/config/env';

/**
 * UI strings, routes, and API paths for Time → Timesheets → My Timesheet tests.
 * Verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-15).
 *
 * Notes:
 * - The logged-in user maps to an employee; My Timesheet is self-scoped (no employee selector).
 * - Week runs Sun→Sat in this instance; `timesheets/default?date=` returns the week boundaries
 *   (`startDate`/`endDate`) even when no timesheet exists (then `data.id` is null).
 * - A timesheet row needs an active Project (with a Customer) + Activity — seed these via API.
 */
export const timesheets = {
  routes: {
    view: '/web/index.php/time/viewMyTimesheet',
    /** Edit form for a specific timesheet id. */
    edit: (id: number): string => `/web/index.php/time/editTimesheet/${id}`,
    /** View a specific week by any in-week date. */
    viewWeek: (date: string): string => `/web/index.php/time/viewMyTimesheet?startDate=${date}`,
  },
  urlPatterns: {
    view: /time\/viewMyTimesheet/i,
    edit: /time\/editTimesheet\/\d+/i,
    login: /auth\/login/i,
  },
  /** API v2 paths (host = `env.baseURL`). */
  apiPaths: {
    timesheets: '/web/index.php/api/v2/time/timesheets',
    defaultTimesheet: '/web/index.php/api/v2/time/timesheets/default',
    entries: (id: number): string => `/web/index.php/api/v2/time/timesheets/${id}/entries`,
    timesheet: (id: number): string => `/web/index.php/api/v2/time/timesheets/${id}`,
    actionLogs: (id: number): string =>
      `/web/index.php/api/v2/time/timesheets/${id}/action-logs?limit=50&offset=0`,
  },
  get apiBaseUrl(): string {
    return env.baseURL.replace(/\/$/, '');
  },
  headings: {
    view: 'My Timesheet',
    edit: 'Edit Timesheet',
  },
  /** `Status: <state>` text rendered on the view. */
  status: {
    notSubmitted: 'Not Submitted',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  messages: {
    noTimesheetsFound: 'No Timesheets Found',
    noRecordsFound: 'No Records Found',
    hoursInvalid: 'Should Be Less Than 24 and in HH:MM or Decimal Format',
  },
  samples: {
    customerPrefix: 'TS Customer',
    projectPrefix: 'TS Project',
    activityName: 'Development',
    activityName2: 'Testing',
    validHours: '08:00',
    decimalHours: '8.5',
    /** What `decimalHours` (8.5) normalises to once persisted. */
    decimalHoursNormalized: '08:30',
    hhmmHours: '04:30',
    hhmmAlt: '08:30',
    overLimitHours: '25:00',
    /** Two-day row used by the multi-day total + delete scenarios. */
    multiDay: { day1: '08:00', day2: '04:00', total: '12:00' },
  },
} as const;
