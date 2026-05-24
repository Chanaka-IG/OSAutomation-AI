import * as fs from 'fs';
import * as path from 'path';
import type { APIRequestContext } from '@playwright/test';
import type { OrangehrmAdminApi } from '../api/orangehrmOSAPI/OrangehrmAdminApi';
import { adminUsers } from '../../test-data/pim/api/adminUsers';
import { employees } from '../../test-data/pim/api/employees';
import { employmentStatuses } from '../../test-data/pim/api/employmentStatuses';
import { holidays } from '../../test-data/leave/api/holidays';
import { jobTitles } from '../../test-data/pim/api/jobTitles';
import { leavePeriod as leavePeriodConfig } from '../../test-data/leave/api/leavePeriod';
import { leaveTypes } from '../../test-data/leave/api/leaveTypes';
import { locations } from '../../test-data/pim/api/locations';
import { payGrades } from '../../test-data/pim/api/payGrades';
import { subunits } from '../../test-data/pim/api/subunits';
import { workweek as workweekConfig } from '../../test-data/time/api/workweek';

export type MasterDataStatus = {
  ok: boolean;
  missing: string[];
  checkedAt: string;
  /** Present when verification was skipped (e.g. env flag). */
  skipped?: boolean;
};

const STATUS_RELATIVE = path.join('test-results', 'master-data-status.json');

function extractRows(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== 'object') return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object');
}

function extractSingleRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as { data?: unknown };
  const inner = root.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root as Record<string, unknown>;
}

function jsonIncludes(body: unknown, needle: string): boolean {
  try {
    return JSON.stringify(body).includes(needle);
  } catch {
    return false;
  }
}

/** Validates all seeded markers from `test-data/api/*` against OrangeHRM API v2 (admin session). */
export async function verifyMasterData(adminApi: OrangehrmAdminApi): Promise<MasterDataStatus> {
  await adminApi.loginAsAdmin();
  const request = adminApi.request;
  const missing: string[] = [];

  await expectEmployees(request, missing);

  await expectListByField(request, jobTitles.adminPath, jobTitles.seedRecords, 'title', 'job title', missing);
  await expectListByField(
    request,
    employmentStatuses.adminPath,
    employmentStatuses.seedRecords,
    'name',
    'employment status',
    missing,
  );
  await expectListByField(request, payGrades.adminPath, payGrades.seedRecords, 'name', 'pay grade', missing);
  await expectListByField(request, locations.adminPath, locations.seedRecords, 'name', 'location', missing);
  await expectListByField(request, leaveTypes.adminPath, leaveTypes.seedRecords, 'name', 'leave type', missing);
  await expectListByField(request, subunits.adminPath, subunits.seedRecords, 'name', 'subunit', missing);

  await expectAdminUsers(request, missing);
  await expectLeavePeriod(request, missing);
  await expectWorkweek(request, missing);
  await expectHolidays(request, missing);

  return {
    ok: missing.length === 0,
    missing,
    checkedAt: new Date().toISOString(),
  };
}

async function expectEmployees(request: APIRequestContext, missing: string[]): Promise<void> {
  for (const seed of employees.seedRecords) {
    const expectedId = seed.employeeId;

    let res = await request.get(employees.adminPath, {
      headers: { Accept: 'application/json' },
      params: { employeeId: expectedId },
    });

    let body = await res.json().catch(() => ({}));
    let rows = extractRows(body);
    let found = rows.some((r) => String(r.employeeId ?? '') === expectedId);

    if (!found && res.ok()) {
      res = await request.get(employees.adminPath, {
        headers: { Accept: 'application/json' },
      });
      body = await res.json().catch(() => ({}));
      rows = extractRows(body);
      found = rows.some((r) => String(r.employeeId ?? '') === expectedId);
    }

    if (!found && jsonIncludes(body, expectedId)) {
      found = true;
    }

    if (!found) {
      missing.push(`employee with employeeId "${expectedId}" (${seed.firstName} ${seed.lastName})`);
    }
  }
}

async function expectListByField<T extends Record<string, unknown>>(
  request: APIRequestContext,
  adminPath: string,
  seedRecords: readonly T[],
  field: keyof T & string,
  label: string,
  missing: string[],
): Promise<void> {
  const res = await request.get(adminPath, {
    headers: { Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  const rows = extractRows(body);

  for (const seed of seedRecords) {
    const expected = String(seed[field] ?? '');
    if (!expected) continue;

    const found =
      rows.some((r) => String(r[field] ?? '') === expected) || jsonIncludes(body, expected);

    if (!found) {
      missing.push(`${label} "${expected}"`);
    }
  }
}

async function expectAdminUsers(request: APIRequestContext, missing: string[]): Promise<void> {
  const res = await request.get(adminUsers.adminPath, {
    headers: { Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  const rows = extractRows(body);

  for (const seed of adminUsers.seedRecords) {
    const uname = seed.username;
    const found =
      rows.some((r) => String(r.userName ?? r.username ?? '') === uname) ||
      jsonIncludes(body, `"${uname}"`) ||
      jsonIncludes(body, uname);

    if (!found) {
      missing.push(`user "${uname}"`);
    }
  }
}

async function expectLeavePeriod(request: APIRequestContext, missing: string[]): Promise<void> {
  const want = leavePeriodConfig.seedPayload;
  const res = await request.get(leavePeriodConfig.adminPath, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok()) {
    missing.push(`leave period (HTTP ${res.status()})`);
    return;
  }

  const body = await res.json().catch(() => ({}));
  const record = extractSingleRecord(body);

  const startDay = Number(record?.startDay);
  const startMonth = Number(record?.startMonth);

  if (
    Number.isFinite(startDay) &&
    Number.isFinite(startMonth) &&
    startDay === want.startDay &&
    startMonth === want.startMonth
  ) {
    return;
  }

  missing.push(
    `leave period startDay=${want.startDay}, startMonth=${want.startMonth} (got startDay=${startDay}, startMonth=${startMonth})`,
  );
}

async function expectWorkweek(request: APIRequestContext, missing: string[]): Promise<void> {
  const want = workweekConfig.seedPayload;
  const res = await request.get(workweekConfig.adminPath, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok()) {
    missing.push(`work week (HTTP ${res.status()})`);
    return;
  }

  const body = await res.json().catch(() => ({}));
  const record = extractSingleRecord(body);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const mismatches: string[] = [];

  for (const d of days) {
    const got = Number(record?.[d]);
    if (got !== want[d]) {
      mismatches.push(`${d}: want ${want[d]}, got ${got}`);
    }
  }

  if (mismatches.length > 0) {
    missing.push(`work week (${mismatches.join('; ')})`);
  }
}

function normalizeHolidayName(value: unknown): string {
  return String(value ?? '')
    .replace(/\u2019/g, "'")
    .trim();
}

/** OrangeHRM may return ISO datetimes; extract the calendar day for comparison. */
function holidayCalendarDay(value: unknown): string | null {
  const s = String(value ?? '');
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function expectHolidays(request: APIRequestContext, missing: string[]): Promise<void> {
  const seedDays = holidays.seedRecords.map((s) => s.date.slice(0, 10)).sort();
  const fromDate = seedDays[0] ?? '2026-01-01';
  const toDate = seedDays[seedDays.length - 1] ?? '2026-12-31';

  const res = await request.get(holidays.adminPath, {
    headers: { Accept: 'application/json' },
    /** Required by OrangeHRM `HolidayAPI::getAll` (see `FILTER_FROM_DATE` / `FILTER_TO_DATE`). */
    params: { fromDate, toDate },
  });
  const body = await res.json().catch(() => ({}));
  const rows = extractRows(body);
  const wantDay = (d: string) => d.slice(0, 10);

  for (const seed of holidays.seedRecords) {
    const name = seed.name;
    const dateStr = seed.date;
    const day = wantDay(dateStr);

    const found =
      rows.some((r) => {
        const apiDay = holidayCalendarDay(r.date);
        return normalizeHolidayName(r.name) === normalizeHolidayName(name) && apiDay === day;
      }) ||
      (jsonIncludes(body, day) &&
        (jsonIncludes(body, name) || jsonIncludes(body, normalizeHolidayName(name))));

    if (!found) {
      missing.push(`holiday "${name}" (${dateStr})`);
    }
  }
}

export function getMasterDataStatusPath(): string {
  return path.join(process.cwd(), STATUS_RELATIVE);
}

export function writeMasterDataStatus(status: MasterDataStatus): void {
  const filePath = getMasterDataStatusPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
}

export function readMasterDataStatus(): MasterDataStatus | null {
  const filePath = getMasterDataStatusPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as MasterDataStatus;
  } catch {
    return null;
  }
}
