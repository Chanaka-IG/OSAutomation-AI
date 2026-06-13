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
  },
} as const;
