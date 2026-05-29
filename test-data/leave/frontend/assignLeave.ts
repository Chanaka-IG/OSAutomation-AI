import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the Assign Leave UI suite (`tests/leave/assign-leave.spec.ts`).
 * Keeps employees, users, leave-type ids/labels, dates and expected day-counts
 * out of the spec body so the spec passes only test-data (not hardcoded literals)
 * into page objects.
 */
export const assignLeaveData = {
  employees: {
    /** Main employee — receives entitlements and most happy-path assignments. */
    main: {
      employeeId: '98001',
      firstName: 'TcAssign',
      lastName: 'LveOne',
      middleName: '',
    },
    /** ESS-only employee used for the access-control test (also the supervisor's NON-subordinate). */
    ess: {
      employeeId: '98002',
      firstName: 'TcAssign',
      lastName: 'EssLve',
      middleName: '',
    },
    /** Supervisor employee; `employees.main` reports to this person (see beforeAll). */
    supervisor: {
      employeeId: '98003',
      firstName: 'TcAssign',
      lastName: 'SupOne',
      middleName: '',
    },
    /** Dedicated employee for the P2 suite (Annual + Casual entitlements, distinct balances). */
    p2: {
      employeeId: '98004',
      firstName: 'TcAssign',
      lastName: 'P2Lve',
      middleName: '',
    },
  } satisfies Record<string, EmployeeSeed>,

  /** ESS login linked to `employees.ess` (userRoleId 2). */
  essUser: { username: 'tc.lve.assign.ess', password: 'admin@OHRM123', userRoleId: 2 },

  /** Supervisor login linked to `employees.supervisor` (an ESS user who has subordinates). */
  supervisorUser: { username: 'tc.lve.assign.sup', password: 'admin@OHRM123', userRoleId: 2 },

  /** Reporting method for the supervisor→subordinate link (1 = Direct). */
  reportingMethodId: 1,

  leaveTypes: {
    annual: { id: 2, label: 'Annual Leave' },
    casual: { id: 5, label: 'Casual Leave' },
  },

  /** Entitlements seeded once in `beforeAll` for the active leave period. */
  entitlements: {
    annualDays: 20,
    casualDays: 2,
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
    /** P2 employee — Annual and Casual deliberately differ so the balance widget changes visibly. */
    p2AnnualDays: 15,
    p2CasualDays: 3,
  },

  /** Holiday that makes TC-401's Mon–Fri range consume 4 days, not 5. */
  holiday: {
    name: 'TC Assign Leave Test Holiday',
    date: '2026-08-06',
    recurring: false,
    length: 0,
  },

  /** Distinct, non-overlapping dates per scenario (cleanup deletes the employee after the run). */
  dates: {
    fullDay: '2026-07-07',
    multiDayFrom: '2026-07-13',
    multiDayTo: '2026-07-15',
    firstHalf: '2026-07-17',
    secondHalf: '2026-07-20',
    specifyTime: '2026-07-21',
    weekendFrom: '2026-07-24', // Fri
    weekendTo: '2026-07-27', // Mon (spans Sat+Sun)
    successToast: '2026-07-28',
    casualFrom: '2026-07-29',
    casualTo: '2026-07-30',
    holidayFrom: '2026-08-03', // Mon
    holidayTo: '2026-08-07', // Fri (holiday on Thu 08-06)
    missingLeaveType: '2026-09-01',
    missingFromDate: '2026-09-02',
    autoToDate: '2026-09-03',
    balanceUpdate: '2026-10-05',
    scheduledCheck: '2026-11-02', // self-seeded leave for the "Scheduled" status test
    supervisorAssign: '2026-12-07', // Mon — supervisor assigns leave for the subordinate
    // ── P2 dates (dedicated p2 employee) ──
    p2Single: '2026-10-12', // Mon — single working day for widget/duration checks
    p2WeekendFrom: '2026-10-17', // Sat
    p2WeekendTo: '2026-10-18', // Sun (weekend-only range → 0 working days)
    p2OutOfPeriod: '2027-03-01', // outside the 2026 entitlement period → balance 0.00
    p2Comment: '2026-11-16', // Mon — assign-with-comment date
    p2HalfDay: '2026-10-19', // Mon — half-day assign (consumes 0.5 days)
  },

  times: { from: '08:00', to: '12:00' },

  /** Expected working days consumed (entitlement balance delta) for count tests. */
  expectedConsumed: {
    weekend: 2,
    holiday: 4,
  },
} as const;
