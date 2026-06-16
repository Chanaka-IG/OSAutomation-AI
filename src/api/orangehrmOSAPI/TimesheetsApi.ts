import { timesheets } from '../../../test-data/time/frontend/timesheets';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('TimesheetsApi');

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

export type TimesheetStatusId = 'NOT SUBMITTED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TimesheetAction = 'SUBMIT' | 'APPROVE' | 'REJECT';

/** `data` from `/timesheets/default`; `id` is null when the week has no timesheet yet. */
export type TimesheetMeta = {
  id: number | null;
  status: { id: TimesheetStatusId | null; name: string | null };
  startDate: string;
  endDate: string;
};

export type TimesheetEntry = {
  project: { id: number; name: string };
  customer: { id: number; name: string };
  activity: { id: number; name: string };
  total: { label: string };
  dates: Record<string, { id: number; date: string; duration: string }>;
};

export type TimesheetEntriesResponse = {
  data: TimesheetEntry[];
  meta: {
    timesheet: TimesheetMeta;
    sum: { label: string };
    columns: Record<string, { total: { label: string } }>;
    dates: string[];
    allowedActions: { action: string; name: string }[];
  };
};

type EntryInput = {
  projectId: number;
  activityId: number;
  dates: Record<string, { duration: string }>;
};

/**
 * OrangeHRM Time API v2 — My Timesheet lifecycle (default/create/entries/submit/action-logs).
 * Used for deterministic seeding/state setup around the My Timesheets E2E suite. Host is `env.baseURL`.
 *
 * Week starts Sunday in this instance; `getDefault` returns the week boundaries even when empty
 * (`id` null), which {@link findEmptyWeek} relies on to locate a never-used week deterministically.
 */
export class TimesheetsApi extends BaseApiService {
  private base(path: string): string {
    return `${timesheets.apiBaseUrl}${path}`;
  }

  /** The timesheet covering `date` (YYYY-MM-DD); `id` null when none exists yet. */
  async getDefault(date: string): Promise<TimesheetMeta> {
    const res = await this.get(`${this.base(timesheets.apiPaths.defaultTimesheet)}?date=${date}`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) throw new Error(`TimesheetsApi.getDefault failed: HTTP ${res.status()}`);
    return ((await res.json()) as { data: TimesheetMeta }).data;
  }

  /** Creates the week containing `date`. */
  async createTimesheet(date: string): Promise<TimesheetMeta> {
    const res = await this.post(this.base(timesheets.apiPaths.timesheets), {
      headers: JSON_HEADERS,
      data: { date },
    });
    if (!res.ok()) {
      throw new Error(`TimesheetsApi.createTimesheet failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Timesheet created', { date });
    return ((await res.json()) as { data: TimesheetMeta }).data;
  }

  /** Returns the existing timesheet for the week, or creates it. */
  async ensureTimesheet(date: string): Promise<TimesheetMeta> {
    const existing = await this.getDefault(date);
    if (existing.id != null) return existing;
    return this.createTimesheet(date);
  }

  /**
   * Scans backward week-by-week from `fromDate` and returns the first week that has **no**
   * timesheet yet (so a fresh, isolated week can be created for a mutating test). Returns the
   * week's `TimesheetMeta` with `id` null (boundaries populated).
   */
  async findEmptyWeek(fromDate: string, maxWeeksBack = 520): Promise<TimesheetMeta> {
    let cursor = fromDate;
    for (let i = 0; i < maxWeeksBack; i++) {
      const meta = await this.getDefault(cursor);
      if (meta.id == null) return meta;
      cursor = this.addDays(meta.startDate, -1); // jump to the previous week
    }
    throw new Error(`TimesheetsApi.findEmptyWeek: no empty week within ${maxWeeksBack} weeks of ${fromDate}`);
  }

  async getEntries(id: number): Promise<TimesheetEntriesResponse> {
    const res = await this.get(this.base(timesheets.apiPaths.entries(id)), { headers: JSON_HEADERS });
    if (!res.ok()) throw new Error(`TimesheetsApi.getEntries failed: HTTP ${res.status()}`);
    return (await res.json()) as TimesheetEntriesResponse;
  }

  async putEntries(id: number, entries: EntryInput[], deletedEntries: unknown[] = []): Promise<void> {
    const res = await this.put(this.base(timesheets.apiPaths.entries(id)), {
      headers: JSON_HEADERS,
      data: { entries, deletedEntries },
    });
    if (!res.ok()) {
      throw new Error(`TimesheetsApi.putEntries failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Timesheet entries saved', { id });
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

  async setAction(id: number, action: TimesheetAction, comment?: string): Promise<void> {
    const res = await this.put(this.base(timesheets.apiPaths.timesheet(id)), {
      headers: JSON_HEADERS,
      data: comment ? { action, comment } : { action },
    });
    if (!res.ok()) {
      throw new Error(`TimesheetsApi.setAction(${action}) failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Timesheet action applied', { id, action });
  }

  async submit(id: number): Promise<void> {
    await this.setAction(id, 'SUBMIT');
  }

  async getActionLogs(id: number): Promise<{ data: unknown[]; total: number }> {
    const res = await this.get(this.base(timesheets.apiPaths.actionLogs(id)), { headers: JSON_HEADERS });
    if (!res.ok()) throw new Error(`TimesheetsApi.getActionLogs failed: HTTP ${res.status()}`);
    const json = (await res.json()) as { data: unknown[]; meta: { total: number } };
    return { data: json.data ?? [], total: json.meta?.total ?? 0 };
  }

  /** Adds `n` days to a YYYY-MM-DD string (UTC-safe), returning YYYY-MM-DD. */
  addDays(date: string, n: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
}
