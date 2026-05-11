import type { EmployeeSeed } from '../../api/employees';

/**
 * Employees created only for `tests/api/pim-employees.spec.ts`.
 * Do not reuse `test-data/api/*` master seed rows — those may change with seed jobs.
 */
export const apiContractRecords = [
  {
    employeeId: '061090',
    firstName: 'ContractUi',
    lastName: 'ApiProbe',
    middleName: '',
  },
] as const satisfies readonly EmployeeSeed[];

export const apiContractEmployee = apiContractRecords[0];
