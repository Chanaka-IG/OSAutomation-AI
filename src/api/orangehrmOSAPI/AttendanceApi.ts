import { attendance } from '../../../test-data/time/frontend/attendance';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('AttendanceApi');

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

export type AttendanceStateId = 'PUNCHED IN' | 'PUNCHED OUT';

export type AttendancePunch = {
  utcDate: string | null;
  utcTime: string | null;
  userDate: string | null;
  userTime: string | null;
  offset: string | null;
  note: string | null;
};

export type AttendanceRecord = {
  id: number;
  punchIn: AttendancePunch;
  punchOut: AttendancePunch;
  state: { id: AttendanceStateId; name: string };
  employee: { empNumber: number; firstName: string; lastName: string };
};

export type AttendanceConfigs = {
  canUserChangeCurrentTime: boolean;
  canUserModifyAttendance: boolean;
  canSupervisorModifyAttendance: boolean;
};

/**
 * OrangeHRM Attendance API v2 (Time → Attendance → Punch In/Out).
 *
 * Punch payloads are sent in **UTC with `timezoneOffset: 0`**, anchored to the server's
 * `current-datetime`, so the helper never has to reconcile the request machine's local
 * timezone with the server's — punch-out is always at-or-after the open punch-in. Used for
 * deterministic state setup/reset around the E2E suite, not for the assertions themselves.
 */
export class AttendanceApi extends BaseApiService {
  async getConfigs(): Promise<AttendanceConfigs> {
    const res = await this.get(`${attendance.apiBaseUrl}${attendance.apiPaths.configs}`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.getConfigs failed: HTTP ${res.status()}`);
    }
    return ((await res.json()) as { data: AttendanceConfigs }).data;
  }

  /**
   * Writes the full attendance config (all three booleans). The config is a global singleton — callers
   * MUST capture the prior value via {@link getConfigs} and restore it after the test.
   */
  async setConfigs(config: AttendanceConfigs): Promise<void> {
    const res = await this.put(`${attendance.apiBaseUrl}${attendance.apiPaths.configs}`, {
      headers: JSON_HEADERS,
      data: config,
    });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.setConfigs failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 400)}`);
    }
    log.info('Attendance config updated', config);
  }

  /** Server's current UTC date/time — the anchor for UTC punch payloads. */
  async getCurrentDateTime(): Promise<{ utcDate: string; utcTime: string }> {
    const res = await this.get(`${attendance.apiBaseUrl}${attendance.apiPaths.currentDateTime}`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.getCurrentDateTime failed: HTTP ${res.status()}`);
    }
    return ((await res.json()) as { data: { utcDate: string; utcTime: string } }).data;
  }

  /** Latest attendance record for the session employee, or `null` when none exists. */
  async getLatest(): Promise<AttendanceRecord | null> {
    const res = await this.get(`${attendance.apiBaseUrl}${attendance.apiPaths.latest}`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) return null;
    const data = ((await res.json()) as { data: AttendanceRecord | null }).data;
    return data ?? null;
  }

  async getState(): Promise<AttendanceStateId | null> {
    return (await this.getLatest())?.state.id ?? null;
  }

  /**
   * Records for the session employee on a given date (the My Records query).
   * Returns the rows plus the server-computed `total` count and `sumLabel`
   * ("Total Duration (Hours)") so tests can compare the rendered UI to the contract.
   */
  async getRecordsByDate(
    date: string,
  ): Promise<{ data: unknown[]; total: number; sumLabel: string }> {
    const url = `${attendance.apiBaseUrl}${attendance.apiPaths.records}?limit=50&offset=0&date=${date}`;
    const res = await this.get(url, { headers: JSON_HEADERS });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.getRecordsByDate failed: HTTP ${res.status()}`);
    }
    const json = (await res.json()) as {
      data: unknown[];
      meta: { total: number; sum: { label: string } };
    };
    return {
      data: json.data ?? [],
      total: json.meta?.total ?? 0,
      sumLabel: json.meta?.sum?.label ?? '0.00',
    };
  }

  async punchIn(note = ''): Promise<void> {
    const { utcDate, utcTime } = await this.getCurrentDateTime();
    const res = await this.post(`${attendance.apiBaseUrl}${attendance.apiPaths.records}`, {
      headers: JSON_HEADERS,
      data: { date: utcDate, time: utcTime, note, timezoneOffset: 0, timezoneName: 'UTC' },
    });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.punchIn failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 400)}`);
    }
    log.info('Punched in (API/UTC)', { note });
  }

  async punchOut(note = ''): Promise<void> {
    const { utcDate, utcTime } = await this.getCurrentDateTime();
    const res = await this.put(`${attendance.apiBaseUrl}${attendance.apiPaths.records}`, {
      headers: JSON_HEADERS,
      data: { date: utcDate, time: utcTime, note, timezoneOffset: 0, timezoneName: 'UTC' },
    });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.punchOut failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 400)}`);
    }
    log.info('Punched out (API/UTC)', { note });
  }

  /**
   * Employee Records summary for a date: one entry per employee with their day total, plus the
   * server `total` (employee count). Used to compare the rendered roster/count to the contract.
   */
  async getEmployeeSummary(
    date: string,
  ): Promise<{ data: unknown[]; total: number }> {
    const url = `${attendance.apiBaseUrl}${attendance.apiPaths.employeesSummary}?limit=50&offset=0&date=${date}`;
    const res = await this.get(url, { headers: JSON_HEADERS });
    if (!res.ok()) {
      throw new Error(`AttendanceApi.getEmployeeSummary failed: HTTP ${res.status()}`);
    }
    const json = (await res.json()) as { data: unknown[]; meta: { total: number } };
    return { data: json.data ?? [], total: json.meta?.total ?? 0 };
  }

  /** Guarantees the session employee is NOT punched in (closes an open record if present). */
  async ensurePunchedOut(): Promise<void> {
    if ((await this.getState()) === 'PUNCHED IN') {
      await this.punchOut(attendance.samples.resetNote);
    }
  }
}
