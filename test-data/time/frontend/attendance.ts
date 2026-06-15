import { env } from '../../../src/config/env';

/**
 * UI strings, routes, and API paths for Time → Attendance → Punch In/Out tests.
 * Selectors/behaviour verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-13).
 */
export const attendance = {
  routes: {
    punchIn: '/web/index.php/attendance/punchIn',
    punchOut: '/web/index.php/attendance/punchOut',
    myRecords: '/web/index.php/attendance/viewMyAttendanceRecord',
    employeeRecords: '/web/index.php/attendance/viewAttendanceRecord',
    configure: '/web/index.php/attendance/configure',
  },
  urlPatterns: {
    punchIn: /attendance\/punchIn$/i,
    punchOut: /attendance\/punchOut$/i,
    myRecords: /attendance\/viewMyAttendanceRecord$/i,
    login: /auth\/login/i,
  },
  /** API v2 paths (host = `env.baseURL`, same origin as the UI). */
  apiPaths: {
    records: '/web/index.php/api/v2/attendance/records',
    latest: '/web/index.php/api/v2/attendance/records/latest',
    currentDateTime: '/web/index.php/api/v2/attendance/current-datetime',
    configs: '/web/index.php/api/v2/attendance/configs',
    /** Employee Records summary (one entry per employee with their day total). */
    employeesSummary: '/web/index.php/api/v2/attendance/employees/summary',
  },
  /** OrangeHRM origin only (from `BASE_URL` / `env.baseURL`). */
  get apiBaseUrl(): string {
    return env.baseURL.replace(/\/$/, '');
  },
  headings: {
    punchIn: 'Punch In',
    punchOut: 'Punch Out',
    myRecords: 'My Attendance Records',
    /** Admin-only screens — asserted ABSENT for ESS denial checks. */
    configuration: 'Attendance Configuration',
    employeeRecords: 'Employee Attendance Records',
  },
  /** Attendance Configuration toggle labels (exact, verified live). */
  config: {
    labels: {
      changeTime: 'Employee can change current time when punching in/out',
      modifyOwn: 'Employee can edit/delete own attendance records',
      supervisorModify: 'Supervisor can add/edit/delete attendance records of subordinates',
    },
  },
  /** UI strings verified live on the kord instance. */
  messages: {
    /** Rendered to ESS/unauthorised users on direct admin attendance URLs. */
    credentialRequired: 'Credential Required',
    requiredLegend: '* Required',
    punchedInTimeLabel: 'Punched in time',
    punchedInNoteLabel: 'Punched In Note',
  },
  /** Note prefixes; tests append a unique suffix to keep records identifiable. */
  samples: {
    punchInNote: 'PIO in',
    punchOutNote: 'PIO out',
    /** Note used when seeding the "already punched in" precondition via API. */
    alreadyInNote: 'PIO already-in',
    /** Note used by the API state-reset punch-out. */
    resetNote: 'PIO reset',
    /** My Records note prefixes (unique suffix appended per test). */
    myRecordsInNote: 'MR in',
    myRecordsOutNote: 'MR out',
    /** A date guaranteed to have no records for any employee — used for empty-state checks. */
    emptyDate: '2015-06-14',
  },
  /**
   * Stable seeded master-data employees referenced by Employee Records tests.
   * `option` is the autocomplete label (full name w/ middle); `summaryName` is the list label.
   * Ruwan Kumara (empNumber 1) is the account the admin login maps to.
   */
  employees: {
    ruwan: { empNumber: 1, name: 'Ruwan Kumara' },
    marcus: {
      empNumber: 2,
      query: 'Marcus',
      option: 'Marcus James Chen',
      summaryName: 'Marcus Chen',
    },
  },
} as const;
