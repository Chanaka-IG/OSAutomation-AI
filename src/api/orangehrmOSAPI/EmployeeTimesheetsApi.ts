import { employeeTimesheets } from '../../../test-data/time/frontend/employeeTimesheets';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('EmployeeTimesheetsApi');

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

export type EmployeeTimesheetStatusId = 'NOT SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type EmployeeTimesheetAction = 'SUBMIT' | 'APPROVE' | 'REJECT';

/** `data` from `/timesheets/default?date=&empNumber=`; `id` is null when the week has no timesheet yet. */
export type EmployeeTimesheetMeta = {
  id: number | null;
  status: { id: EmployeeTimesheetStatusId | null; name: string | null };
  startDate: string;
  endDate: string;
};

export type EmployeeTimesheetEntry = {
  project: { id: number; name: string };
  customer: { id: number; name: string };
  activity: { id: number; name: string };
  total: { label: string };
  dates: Record<string, { id: number; date: string; duration: string }>;
};

export type EmployeeTimesheetEntriesResponse = {
  data: EmployeeTimesheetEntry[];
  meta: {
    timesheet: EmployeeTimesheetMeta;
    employee: { empNumber: number; firstName: string; lastName: string };
    sum: { label: string };
    allowedActions: { action: string; name: string }[];
  };
};

type EntryInput = {
  projectId: number;
  activityId: number;
  dates: Record<string, { duration: string }>;
};

/**
 * OrangeHRM Time API v2 — supervisor/admin **Employee Timesheets** lifecycle. Used for deterministic
 * seeding/state setup around the Employee Timesheets E2E suite. Host is `env.baseURL`.
 *
 * Endpoint shapes verified live (2026-06-16) — they are deliberately NOT uniform:
 * - create/action carry the empNumber: `…/time/employees/{empNumber}/timesheets[/{id}]`
 * - entries are id-only:               `…/time/employees/timesheets/{id}/entries`
 * - default carries empNumber as a query param: `…/time/timesheets/default?date=&empNumber=`
 *
 * Week starts Sunday in this instance; `getDefault` returns the week boundaries even when empty
 * (`id` null), which {@link findEmptyWeek} relies on to locate a never-used week deterministically.
 */
export class EmployeeTimesheetsApi extends BaseApiService {
  private base(path: string): string {
    return `${employeeTimesheets.apiBaseUrl}${path}`;
  }

  /** The employee's timesheet covering `date` (YYYY-MM-DD); `id` null when none exists yet. */
  async getDefault(empNumber: number, date: string): Promise<EmployeeTimesheetMeta> {
    const url = `${this.base(employeeTimesheets.apiPaths.defaultTimesheet)}?date=${date}&empNumber=${empNumber}`;
    const res = await this.get(url, { headers: JSON_HEADERS });
    if (!res.ok()) throw new Error(`EmployeeTimesheetsApi.getDefault failed: HTTP ${res.status()}`);
    return ((await res.json()) as { data: EmployeeTimesheetMeta }).data;
  }

  /** Creates the week containing `date` for the employee. */
  async createTimesheet(empNumber: number, date: string): Promise<EmployeeTimesheetMeta> {
    const res = await this.post(this.base(employeeTimesheets.apiPaths.employeeTimesheets(empNumber)), {
      headers: JSON_HEADERS,
      data: { date },
    });
    if (!res.ok()) {
      throw new Error(
        `EmployeeTimesheetsApi.createTimesheet failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`,
      );
    }
    log.info('Employee timesheet created', { empNumber, date });
    return ((await res.json()) as { data: EmployeeTimesheetMeta }).data;
  }

  /**
   * Scans backward week-by-week from `fromDate` and returns the first week that has **no** timesheet
   * yet for the employee (so a fresh, isolated week can be created for a test). Returns `id` null.
   */
  async findEmptyWeek(empNumber: number, fromDate: string, maxWeeksBack = 520): Promise<EmployeeTimesheetMeta> {
    let cursor = fromDate;
    for (let i = 0; i < maxWeeksBack; i++) {
      const meta = await this.getDefault(empNumber, cursor);
      if (meta.id == null) return meta;
      cursor = this.addDays(meta.startDate, -1);
    }
    throw new Error(
      `EmployeeTimesheetsApi.findEmptyWeek: no empty week within ${maxWeeksBack} weeks of ${fromDate}`,
    );
  }

  async getEntries(id: number): Promise<EmployeeTimesheetEntriesResponse> {
    const res = await this.get(this.base(employeeTimesheets.apiPaths.entries(id)), { headers: JSON_HEADERS });
    if (!res.ok()) throw new Error(`EmployeeTimesheetsApi.getEntries failed: HTTP ${res.status()}`);
    return (await res.json()) as EmployeeTimesheetEntriesResponse;
  }

  async putEntries(id: number, entries: EntryInput[], deletedEntries: unknown[] = []): Promise<void> {
    const res = await this.put(this.base(employeeTimesheets.apiPaths.entries(id)), {
      headers: JSON_HEADERS,
      data: { entries, deletedEntries },
    });
    if (!res.ok()) {
      throw new Error(
        `EmployeeTimesheetsApi.putEntries failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`,
      );
    }
    log.info('Employee timesheet entries saved', { id });
  }

  /** Seeds a single project/activity row with one day's duration. */
  async seedEntry(
    id: number,
    projectId: number,
    activityId: number,
    date: string,
    duration: string,
  ): Promise<void> {
    await this.putEntries(id, [{ projectId, activityId, dates: { [date]: { duration } } }]);
  }

  /** PUT a lifecycle action; returns the raw HTTP status (so negatives can assert non-2xx). */
  async setAction(
    empNumber: number,
    id: number,
    action: EmployeeTimesheetAction,
    comment?: string,
  ): Promise<number> {
    const res = await this.put(this.base(employeeTimesheets.apiPaths.action(empNumber, id)), {
      headers: JSON_HEADERS,
      data: comment != null ? { action, comment } : { action },
    });
    if (!res.ok()) {
      log.warn('Employee timesheet action non-OK', { empNumber, id, action, status: res.status() });
    } else {
      log.info('Employee timesheet action applied', { empNumber, id, action });
    }
    return res.status();
  }

  async submit(empNumber: number, id: number): Promise<void> {
    const status = await this.setAction(empNumber, id, 'SUBMIT');
    if (status < 200 || status >= 300) throw new Error(`EmployeeTimesheetsApi.submit failed: HTTP ${status}`);
  }

  async approve(empNumber: number, id: number, comment?: string): Promise<number> {
    return this.setAction(empNumber, id, 'APPROVE', comment);
  }

  async reject(empNumber: number, id: number, comment?: string): Promise<number> {
    return this.setAction(empNumber, id, 'REJECT', comment);
  }

  /** Creates a fresh week timesheet for the employee, seeds one row, and submits it (ready to approve). */
  async createSubmittedTimesheet(
    empNumber: number,
    weekStartDate: string,
    projectId: number,
    activityId: number,
    duration: string,
  ): Promise<number> {
    const created = await this.createTimesheet(empNumber, weekStartDate);
    const id = created.id as number;
    await this.seedEntry(id, projectId, activityId, this.addDays(weekStartDate, 1), duration);
    await this.submit(empNumber, id);
    return id;
  }

  /** Adds `n` days to a YYYY-MM-DD string (UTC-safe), returning YYYY-MM-DD. */
  addDays(date: string, n: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
}
