# Test Priority: Assign Leave (E2E Only)

> Input: docs/test-strategy.md
> Scope: E2E tests only (30 scenarios assigned to E2E layer)
> Layer: Playwright, tests/leave/assign-leave.spec.ts
> Generated: 2026-05-28

---

## P0 — Release-Blocking (Core business flow, data integrity, no workaround)

| ID     | Title                                                               | Rationale |
|--------|---------------------------------------------------------------------|-----------|
| TC-001 | Admin assigns a full-day leave with sufficient entitlement          | Core assign-leave happy path — the entire feature is untestable if this fails |
| TC-105 | Admin-assigned leave status is immediately "Scheduled"              | Data integrity — wrong status means leave workflow is broken; downstream approvals and reports would be wrong |
| TC-201 | ESS user cannot access the Assign Leave page                        | Security/compliance — unauthorized role must not be able to assign leave; no workaround acceptable |
| TC-203 | Unauthenticated user redirected to login                            | Security — unauthenticated access to any leave action is a release blocker |
| TC-301 | Missing employee field shows "Required" validation                  | Blocks submit with incomplete data; if this fails, any malformed request could reach the backend |
| TC-302 | Missing leave type field shows "Required" validation                | Same — required field gate must be enforced before submission |

---

## P1 — High Business Impact (High user reach, primary feature paths, major integrations)

| ID     | Title                                                               | Rationale |
|--------|---------------------------------------------------------------------|-----------|
| TC-002 | Admin assigns multi-day leave                                       | Most real-world leave assignments span multiple days; high usage frequency |
| TC-003 | Admin assigns half-day morning leave                                | Half-day is a commonly used duration option; important for accurate balance tracking |
| TC-004 | Admin assigns half-day afternoon leave                              | Same as TC-003; separate duration option with distinct impact |
| TC-005 | Admin assigns leave with "Specify Time" duration                    | Supports precise time tracking use cases; affects how duration is recorded in hours |
| TC-007 | Supervisor assigns leave for a subordinate employee                 | Supervisors are a primary actor for this feature; high user-reach |
| TC-104 | Leave spanning weekends counts only working days                    | Incorrect day count directly impacts leave balance — major data integrity risk |
| TC-202 | Supervisor cannot assign leave for a non-subordinate employee       | Access control for supervisor role — critical for data isolation |
| TC-303 | Missing From Date shows "Required" validation                       | Prevents malformed date range from being submitted; blocks submission correctly |
| TC-304 | Missing To Date shows "Required" validation                         | Same; to-date is required for any leave computation |
| TC-401 | Holiday excluded from day count                                     | Holiday awareness is a core payroll-adjacent concern; wrong count = wrong deduction |
| TC-402 | Assign exactly remaining balance (boundary)                         | Boundary behavior at exactly 0 remaining balance — important edge case for balance integrity |
| TC-502 | Leave Type dropdown populated only after employee selected          | Primary UX flow — if the dropdown doesn't load, the form cannot be completed |
| TC-507 | Success toast appears after assign                                  | User feedback for the action completing; without this, users cannot confirm success |

---

## P2 — Moderate Impact (Secondary flows, edge cases on common paths, workaround exists)

| ID     | Title                                                               | Rationale |
|--------|---------------------------------------------------------------------|-----------|
| TC-006 | Admin assigns leave with a comment                                  | Comment is optional; workaround is to omit it; but commonly used in practice |
| TC-008 | Balance widget updates when leave type changes                      | UX feedback; workaround is to check balance separately; not blocking |
| TC-107 | Specify Time requires From/To Time fields                           | Validation for a secondary duration option; moderate reach |
| TC-108 | Half-day duration auto-computes 0.5 days in balance widget          | Widget accuracy; moderate impact; balance is confirmed on save |
| TC-306 | Weekend-only date range results in 0 working days                   | Edge case on common path; workaround is correct date selection |
| TC-307 | Terminated employee not in autocomplete                             | Prevents assigning leave to inactive employees; workaround exists (system blocks if submitted) |
| TC-403 | Mix of pending and approved leave — balance partially consumed      | Tests escrow mechanism; important for data accuracy but workaround exists via balance check |
| TC-501 | Page renders correctly for Admin                                    | Page structure test; not blocking but important for regression |
| TC-503 | Duration dropdown shows correct options                             | Option availability check; secondary to functional flow |
| TC-504 | Time fields appear only when "Specify Time" selected                | Conditional rendering; secondary UX concern |
| TC-505 | Balance widget updates when date range changes                      | Reactive UI; workaround is to check balance manually |
| TC-506 | Employee autocomplete shows suggestions on typing                   | Autocomplete UX; workaround is typing more characters or using exact name |
| TC-508 | "Assign Leave" menu visible only for Admin/Supervisor               | Role-based menu; caught by TC-201 for ESS access — this is a separate rendering check |

---

## P3 — Low / Cosmetic (Rare edge cases, nice-to-have, easily bypassed)

| ID     | Title                                                               | Rationale |
|--------|---------------------------------------------------------------------|-----------|
| TC-106 | From Date must be ≤ To Date validation                              | Date pickers usually prevent reverse ranges; low risk since UI and API both validate |
| TC-305 | Invalid date format                                                 | Date pickers prevent invalid input in most browsers; low risk in real usage |
| TC-308 | Specify Time — To Time before From Time                             | Rare input scenario; limited real-world occurrence; UX provides time pickers |
| TC-404 | Assign leave for PIM-only employee (no login account)               | Niche scenario; most tested employees have accounts; low user reach |

---

## Summary

| Priority | Count | IDs |
|----------|-------|-----|
| P0       | 6     | TC-001, TC-105, TC-201, TC-203, TC-301, TC-302 |
| P1       | 13    | TC-002, TC-003, TC-004, TC-005, TC-007, TC-104, TC-202, TC-303, TC-304, TC-401, TC-402, TC-502, TC-507 |
| P2       | 13    | TC-006, TC-008, TC-107, TC-108, TC-306, TC-307, TC-403, TC-501, TC-503, TC-504, TC-505, TC-506, TC-508 |
| P3       | 4     | TC-106, TC-305, TC-308, TC-404 |
| **Total E2E** | **36** | |

> **Tests to implement**: P0 (6) + P1 (13) = **19 E2E tests** in `tests/leave/assign-leave.spec.ts`
