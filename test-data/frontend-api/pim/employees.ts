import type { EmployeeSeed } from '../../api/employees';

/**
 * Payloads for `EmployeesApi` (same **shape** as `EmployeeSeed` in `test-data/api/employees.ts`).
 * Owned by Employee List UI tests — never read `api.*.seedRecords`; master data can change independently.
 *
 * Two rows share **first + middle** so name-filter tests can assert multiple matches; the third is distinct.
 */
export const filterTestRecords = [
  {
    employeeId: '061001',
    firstName: 'Olivia',
    lastName: 'Nguyen',
    middleName: 'Anne',
  },
  {
    employeeId: '061002',
    firstName: 'Olivia',
    lastName: 'Petrovic',
    middleName: 'Anne',
  },
  {
    employeeId: '061003',
    firstName: 'Samuel',
    lastName: 'Okonkwo',
    middleName: 'Chidi',
  },
] as const satisfies readonly EmployeeSeed[];

/** Primary row for name / id filter assertions (matches {@link ../../frontend/pim} samples). */
export const primaryFilterEmployee = filterTestRecords[0];
/** Secondary row — shares first name with primary; used for multi-record table validation (TC-PIM-EL-014). */
export const secondaryFilterEmployee = filterTestRecords[1];

export type FilterTestJobDetail = {
  employeeId: string;
  jobTitleName?: string;
  employmentStatusName?: string;
  subUnitName?: string;
  /** employeeId of the supervisor (must exist in filterTestRecords). */
  supervisorEmployeeId?: string;
};

/**
 * Job detail assignments for filter test employees.
 * Names must match master-data seed values (`test-data/api/jobTitles`, `employmentStatuses`, `subunits`).
 *
 * - Olivia Nguyen (061001): QA Engineer / Permanent / Engineering — primary for TC-PIM-EL-008/009/010/013.
 * - Olivia Petrovic (061002): UI Engineer / Permanent / People Operations — secondary for TC-PIM-EL-014.
 * - Samuel Okonkwo (061003): Software Engineer / Probation / Product & Design, supervised by Olivia — TC-PIM-EL-011.
 */
export const filterTestJobDetails: readonly FilterTestJobDetail[] = [
  {
    employeeId: '061001',
    jobTitleName: 'QA Engineer',
    employmentStatusName: 'Permanent',
    subUnitName: 'Engineering',
  },
  {
    employeeId: '061002',
    jobTitleName: 'UI Engineer',
    employmentStatusName: 'Permanent',
    subUnitName: 'Engineering',
  },
  {
    employeeId: '061003',
    jobTitleName: 'Software Engineer',
    employmentStatusName: 'Probation',
    subUnitName: 'Product & Design',
    supervisorEmployeeId: '061001',
  },
];
