import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the ESS Apply Leave suite (`tests/leave/apply-leave.spec.ts`).
 * A dedicated ESS employee + user is seeded in beforeAll so the suite is
 * self-contained and does not collide with the Assign Leave suite.
 */
export const applyLeaveData = {
  /** ESS employee who applies for their own leave. */
  employee: {
    employeeId: '97001',
    firstName: 'TcApply',
    lastName: 'EssOne',
    middleName: '',
  } satisfies EmployeeSeed,

  /** ESS login (userRoleId 2) linked to `employee`. */
  essUser: { username: 'tc.apply.ess', password: 'admin@OHRM123', userRoleId: 2 },

  leaveTypes: {
    annual: { id: 2, label: 'Annual Leave' },
    casual: { id: 5, label: 'Casual Leave' },
    /** No entitlement is seeded for this type → used for the zero-balance test. */
    sick: { label: 'Sick Leave' },
  },

  entitlements: {
    annualDays: 20,
    casualDays: 2,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
  },

  /** Distinct, non-overlapping dates per scenario (employee deleted in afterAll). */
  dates: {
    fullDay: '2026-07-07', // Tue
    multiDayFrom: '2026-07-13', // Mon
    multiDayTo: '2026-07-15', // Wed
    firstHalf: '2026-07-17', // Fri
    secondHalf: '2026-07-20', // Mon
    pendingList: '2026-07-22', // Wed — TC-007 (My Leave shows Pending)
    escrow: '2026-07-23', // Thu — TC-102 (escrow balance delta)
    weekendFrom: '2026-07-24', // Fri
    weekendTo: '2026-07-27', // Mon (spans Sat+Sun)
    statusPending: '2026-07-28', // Tue — TC-105
    overlap: '2026-07-30', // Thu — TC-304 (apply, then re-apply same date)
    successToast: '2026-07-31', // Fri — TC-505
    balanceCheck: '2026-11-09', // Mon — TC-101 (no apply)
    zeroBalance: '2026-11-02', // Mon — TC-303 (Sick, no entitlement)
    casualOverFrom: '2026-10-05', // Mon — TC-305 (3 Casual days > 2 balance)
    casualOverTo: '2026-10-07', // Wed
    casualExactFrom: '2026-10-08', // Thu — TC-401 (exactly 2 Casual days)
    casualExactTo: '2026-10-09', // Fri
  },

  /** Expected working days consumed for count tests. */
  expectedConsumed: {
    weekend: 2,
    casualExact: 2,
  },
} as const;
