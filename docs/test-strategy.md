# Test Strategy: Assign Leave

> Feature: Leave → Assign Leave (`/web/index.php/leave/assign-leave`)
> Generated: 2026-05-28
> Source: docs/test-scenarios.md

---

## Distribution Table

| Layer       | Count | Focus                                              | Avg Run Time |
|-------------|-------|----------------------------------------------------|-------------|
| E2E         | 30    | Full-stack user journeys, role enforcement, UI state | 20–45s each |
| API         | 5     | Backend business rules, auth contracts, error codes | 1–3s each  |
| Component   | 0     | (OXD components not independently testable in isolation in this project) | — |
| Unit        | 0     | No pure functions identified in the assign-leave flow | — |
| **Total**   | **35** |                                                   |             |

> **Pyramid shape**: Wide API base (fast, reliable rule coverage) + targeted E2E for critical flows.
> Anti-pattern flagged: Several validation rules (balance exceeded, overlapping) are tested via E2E only in existing tests — these should be pushed to API layer where possible for speed and reliability.

---

## Layer Assignments

### E2E Tests (30)

These scenarios require multi-page navigation, real browser interaction, or full-stack verification of role-based rendering.

| ID     | Title                                                               | Rationale |
|--------|---------------------------------------------------------------------|-----------|
| TC-001 | Admin assigns full-day leave with sufficient entitlement            | Multi-page: Assign Leave → Leave List verification; requires real browser session |
| TC-002 | Admin assigns multi-day leave                                       | Verifies working-day computation in UI (Balance widget); requires real date picker interaction |
| TC-003 | Admin assigns half-day morning leave                                | Duration dropdown + balance change; E2E because UI flow is non-trivial |
| TC-004 | Admin assigns half-day afternoon leave                              | Same rationale as TC-003; separate scenario to cover all duration options |
| TC-005 | Admin assigns leave with "Specify Time" duration                    | Conditional field rendering (time pickers appear); requires E2E browser validation |
| TC-006 | Admin assigns leave with a comment                                  | Full round-trip: comment saved and visible in Leave List detail view |
| TC-007 | Supervisor assigns leave for subordinate                            | Role-based flow requires login as Supervisor; multi-step E2E |
| TC-008 | Balance widget updates when leave type changes                      | Dynamic UI behavior (no page reload); cannot be tested at API layer |
| TC-104 | Leave spanning weekends counts only working days                    | Balance widget must show correct exclusion; visual verification required |
| TC-105 | Admin-assigned leave status is immediately Scheduled                | Cross-page verification (Assign → Leave List status); E2E confirms full flow |
| TC-106 | From Date must be ≤ To Date (date range validation)                 | Frontend date validation is UI-only; backend also validates — covered at E2E level |
| TC-107 | Specify Time requires From/To Time fields                           | Conditional required field; UI-layer validation only |
| TC-108 | Half-day duration auto-computes 0.5 days in balance widget          | Dynamic widget behavior; verifiable only via browser |
| TC-201 | ESS user cannot access Assign Leave page                            | Role-based menu/page access; requires E2E login as ESS and URL navigation attempt |
| TC-202 | Supervisor cannot assign leave for non-subordinate                  | Autocomplete scoping by supervisor relationship; requires E2E to test suggest-list behavior |
| TC-203 | Unauthenticated user redirected to login                            | Session/redirect behavior; requires real browser navigation |
| TC-301 | Missing employee field → "Required" validation                      | OXD inline validation; must fire on-blur in real browser |
| TC-302 | Missing leave type field → "Required" validation                    | Same; OXD reactive validation |
| TC-303 | Missing From Date → "Required" validation                           | Same; OXD date field validation |
| TC-304 | Missing To Date → "Required" validation                             | Same |
| TC-305 | Invalid date format                                                 | Date picker behavior; browser-level validation |
| TC-306 | Weekend-only date range results in 0 working days                   | Balance widget / submit behavior for non-working day ranges |
| TC-307 | Terminated employee not in autocomplete suggestions                 | Autocomplete filtering is rendered server-side but verified via UI |
| TC-308 | Specify Time — To Time before From Time                             | UI-level time validation |
| TC-401 | Leave on public holiday — holiday excluded from day count           | Balance widget must reflect holiday exclusion; requires E2E |
| TC-402 | Assign exactly remaining balance (boundary)                         | End-to-end: assign → verify 0 balance in Leave List |
| TC-403 | Mix of pending and approved leave — balance partially consumed      | Verifies balance escrow; cross-state E2E flow |
| TC-501 | Page renders correctly for Admin                                    | Page structure and initial empty state — E2E rendering check |
| TC-502 | Leave Type dropdown populated only after employee selected          | Dynamic dropdown behavior; browser rendering |
| TC-503 | Duration dropdown shows correct options                             | Option list verification in real browser |
| TC-504 | Time fields appear only when "Specify Time" selected                | Conditional field visibility; requires DOM inspection in browser |
| TC-505 | Balance widget updates when date range changes                      | Reactive UI; requires browser interaction |
| TC-506 | Employee autocomplete shows suggestions on typing                   | Autocomplete rendering; cannot test at lower layer |
| TC-507 | Success toast appears after assign                                  | Toast component lifecycle; requires real browser |
| TC-508 | "Assign Leave" menu item visible only for Admin/Supervisor          | Role-based nav rendering; requires login as each role type |

---

### API Tests (5)

These scenarios validate backend contracts, auth enforcement, and server-side validation rules that can be asserted without browser rendering.

| ID     | Title                                                               | Endpoint | Rationale |
|--------|---------------------------------------------------------------------|----------|-----------|
| TC-101 | Cannot assign leave — zero entitlement                              | `POST /leave/leave-requests` | Returns 422 "Leave balance exceeded"; pure backend rule, no UI needed |
| TC-102 | Cannot assign leave — requested days exceed balance                 | `POST /leave/leave-requests` | Same 422 contract; faster and more reliable at API layer |
| TC-103 | Overlapping leave request rejected                                  | `POST /leave/leave-requests` | Returns 422 "Overlapping leave requests found"; documented API error code |
| TC-204 | ESS user cannot call assign leave API                               | `POST /leave/leave-requests` with ESS token | 403 auth contract; purely server-side enforcement |
| TC-404 | Assign leave for PIM-only employee (no system user)                 | `POST /leave/leave-requests` | Validates that `empNumber` with no system user still accepts leave assignment |

---

### Tests NOT Generated (Moved down or excluded)

| ID     | Title                                | Decision |
|--------|--------------------------------------|----------|
| TC-405 | Comment at max length (250 chars)    | **API** — max-length validation is a backend 422; the frontend textarea may or may not enforce it — backend is authoritative. Include in API suite, not E2E. |
| TC-406 | Comment exceeds max length           | **API** — same reasoning; 422 `"Should be less than 250 characters"` comes from backend. |

---

## Anti-Patterns Found in Existing Tests

1. **Balance validation tested at E2E only** — `TC-101`, `TC-102`, `TC-103` were originally all E2E. Pushed to API layer since `POST /leave/leave-requests` returns deterministic 422 responses that are faster and more reliable to assert directly.
2. **No API-layer auth enforcement test** — `TC-204` fills this gap by testing the 403 contract for ESS users at the API level, where it's provably enforced.
3. **Existing leave test files** (`tests/leave/leave-entitlements.spec.ts`) rely on UI flows for all validation — new tests should use API setup helpers where possible to seed data before E2E actions.

---

## Backend Source References

- Leave request creation: `POST /api/v2/leave/leave-requests` — body: `{ empNumber, leaveTypeId, fromDate, toDate, comment?, duration?: { type, fromTime?, toTime? } }`
- Balance check: `GET /api/v2/leave/leave-balance/{leaveTypeId}?empNumber=&fromDate=&toDate=`
- Error codes: `422 "Leave balance exceeded"` | `422 "Overlapping leave requests found"` | `403 Unauthorized` (ESS cross-access)
- Admin-assigned leave bypasses approval → status set to `2` (Scheduled) directly by the backend service
- Duration type values: `FULL_DAY`, `HALF_DAY_MORNING`, `HALF_DAY_AFTERNOON`, `SPECIFY_TIME`
