import type { EmployeeSeed } from '../../pim/api/employees';

/**
 * Data for the Leave E2E lifecycle suite (`tests/leave/leave-e2e-lifecycle.spec.ts`).
 *
 * Feature: the full cross-role chain —
 *   Admin adds an entitlement → ESS applies leave → Admin/Supervisor actions it.
 *
 * Three dedicated employees are seeded once in `beforeAll`:
 *  - `ess`         — the golden-path employee. Gets NO Annual entitlement at seed time;
 *                    TC-001 creates it through the Add Entitlement UI. Casual (2 days)
 *                    is API-seeded for the over-balance test.
 *  - `subordinate` — reports to `supervisor`; self-applies the pending requests the
 *                    Supervisor acts on (approve / reject) and one it self-cancels.
 *  - `supervisor`  — an ESS user with a subordinate; self-applies one OWN request
 *                    (self-approval-blocked test).
 *
 * Every request is a single full working day on a distinct date (overlap is enforced
 * per-employee). All weekdays below are Sep 2026 Mon–Fri — clear of the seeded
 * 2026-08-06 global holiday and of the Jul/Aug dates used by the other leave suites.
 */
export const leaveE2eData = {
  employees: {
    /** Golden-path ESS employee (entitled through the UI in TC-001). */
    ess: {
      employeeId: '99001',
      firstName: 'TcE2e',
      lastName: 'LveEss',
      middleName: '',
    },
    /** Subordinate of `supervisor`; target of the supervisor approve/reject tests. */
    subordinate: {
      employeeId: '99002',
      firstName: 'TcE2e',
      lastName: 'LveSub',
      middleName: '',
    },
    /** Supervisor of `subordinate`; also applies one own request. */
    supervisor: {
      employeeId: '99003',
      firstName: 'TcE2e',
      lastName: 'LveSup',
      middleName: '',
    },
  } satisfies Record<string, EmployeeSeed>,

  /** ESS logins (userRoleId 2). */
  essUser: { username: 'tc.e2e.lve.ess', password: 'admin@OHRM123', userRoleId: 2 },
  subordinateUser: { username: 'tc.e2e.lve.sub', password: 'admin@OHRM123', userRoleId: 2 },
  supervisorUser: { username: 'tc.e2e.lve.sup', password: 'admin@OHRM123', userRoleId: 2 },

  /** Reporting method for the supervisor→subordinate link (1 = Direct). */
  reportingMethodId: 1,

  /**
   * Leave type LABELS only — ids differ between instances (e.g. Casual Leave is id 3
   * on the current target, id 5 on older seeds), so the suite resolves ids by name
   * at runtime via `LeaveTypesApi.getAll()`.
   */
  leaveTypes: {
    annual: { label: 'Annual Leave' },
    casual: { label: 'Casual Leave' },
    /** No entitlement is ever seeded for this type → entitlement-gate test. */
    sick: { label: 'Sick Leave' },
    /** Used only by the bulk-assign test, so it cannot collide with other suites. */
    inLieu: { label: 'Time Off In Lieu' },
  },

  /**
   * Dedicated sub unit for the bulk-assign test, created (if absent) under the root
   * org unit in beforeAll. Using a suite-owned subunit keeps the bulk entitlement from
   * leaking onto real/seeded employees (instance subunit master data also drifts —
   * the old "Dept for Leave" no longer exists).
   */
  // unitId 9xx range is reserved for test-owned subunits (real org units use 0xx).
  bulkSubUnit: { label: 'Dept for Leave E2E', parentId: 1, unitId: '901' },

  entitlements: {
    /** Created through the UI in TC-001 (golden path). */
    annualUiDays: '15',
    /** API-seeded for the over-balance test (ess employee). */
    casualDays: 2,
    /** API-seeded for subordinate + supervisor so they can self-apply. */
    subAnnualDays: 10,
    /**
     * TC-007 enters this in the Entitlement field for the subordinate. NOTE: updating
     * an existing entitlement is ADDITIVE — the confirmation dialog shows the sum
     * (10 existing + 12 entered = 22 total), verified against the live app.
     */
    annualUpdatedDays: '12',
    /** Expected total after the additive update (subAnnualDays + annualUpdatedDays). */
    annualUpdatedTotal: '22',
    /** TC-008 bulk-assigns this many Time Off In Lieu days. */
    bulkDays: '3',
    fromDate: '2026-01-01',
    toDate: '2026-12-31',
  },

  /** DB status codes for the leave workflow (business-rules §4). */
  statusCode: {
    rejected: -1,
    cancelled: 0,
    pending: 1,
    scheduled: 2,
    taken: 3,
  },

  statusLabel: {
    pending: 'Pending Approval',
    scheduled: 'Scheduled',
  },

  /** Distinct full-working-day dates (Sep 2026 weekdays), unique per employee. */
  dates: {
    // ── ess employee ──
    goldenFrom: '2026-09-01', // TC-001 — Tue (also the overlap target of TC-304)
    goldenTo: '2026-09-02', // TC-001 — Wed (2 working days)
    rejectPath: '2026-09-03', // TC-002 — Thu
    cancelPath: '2026-09-04', // TC-003 — Fri
    overFrom: '2026-09-07', // TC-104 — Mon (3 days > 2 Casual balance)
    overTo: '2026-09-09', // TC-104 — Wed
    badOrderFrom: '2026-09-21', // TC-302 — Mon (deliberately AFTER badOrderTo)
    badOrderTo: '2026-09-18', // TC-302 — Fri
    // ── subordinate's requests ──
    supApprove: '2026-09-14', // TC-004 — Mon
    supReject: '2026-09-15', // TC-005 — Tue
    selfCancel: '2026-09-16', // TC-006 — Wed
    // ── supervisor's OWN request ──
    supSelf: '2026-09-11', // TC-108 — Fri
  },

  /** Working days consumed by the golden-path request (Tue+Wed). */
  goldenDays: 2,

  routes: {
    addEntitlement: '/web/index.php/leave/addLeaveEntitlement',
    applyLeave: '/web/index.php/leave/applyLeave',
    leaveList: '/web/index.php/leave/viewLeaveList',
    myLeaveList: '/web/index.php/leave/viewMyLeaveList',
  },
  urlPatterns: {
    login: /auth\/login/i,
    entitlementList: /viewLeaveEntitlements/,
  },
} as const;
