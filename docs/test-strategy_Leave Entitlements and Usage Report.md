# Test Strategy — Leave Entitlements and Usage Report

> Input: `docs/test-scenarios_Leave Entitlements and Usage Report.md` (42 scenarios).
> Goal: assign each scenario its optimal test-pyramid layer. The feature is a **read-only report** (no writes), so the test surface is dominated by data-correctness (best at API) and navigation/render concerns (E2E). There is no app-side pure function or isolated component we own, so Unit is effectively N/A and Component is minimal.

## Architecture context (where the logic lives)

- **Report criteria UI** → Vue page at `/web/index.php/leave/viewLeaveBalanceReport` (Admin) and `/leave/viewMyLeaveBalanceReport` (ESS). "Generate For" radios swap the criteria field set client-side.
- **Report computation** → server-side, exposed by:
  - `GET /api/v2/leave/reports?name=<reportName>` → column/header definitions.
  - `GET /api/v2/leave/reports/data?name=<reportName>&fromDate=&toDate=[&leaveTypeId=][&empNumber=][&includeEmployees=]&_dateFormattingEnabled=true` → computed rows (`entitlementDays, pendingApprovalDays, scheduledDays, takenDays, balanceDays`) + `meta.total` / `meta.employee` / `meta.leaveType`.
- **Balance math** (`Balance = Entitlement − (Pending + Scheduled + Taken)`, pending escrowed) is computed in the backend report service and surfaced verbatim in `balanceDays` — so correctness is a **backend/API** contract, verifiable without a browser.
- **Results grid** is a `revo-grid` web component (shadow DOM, not OXD `.oxd-table`). Its cell text is hard to read from the DOM in automation, which pushes value-equality assertions toward the API layer and keeps E2E focused on render/navigation/visibility.

## Distribution

| Layer | Count | Focus | Approx. time |
|---|---|---|---|
| **E2E** | 17 | Auth/redirect, menu access, criteria render, Generate flow, drill-down navigation, empty/loaded UI states, mode toggle, CSV export | ~6–9 min |
| **API** | 23 | Balance math, escrow, filters (sub unit/job title/location/include-past/period), self-scoping, cross-user isolation, pagination, fractional/working-day counts, grid-vs-API parity | ~2–3 min |
| **Component** | 2 | Generate-For criteria-panel swap; column-config panel (render-only) | ~1 min |
| **Unit** | 0 | No app-owned pure function in this repo to unit-test | — |

> Pyramid note: wide at the bottom (API holds all data-correctness and filter logic), a focused E2E band for the things only a browser proves (redirects, menu visibility, drill-down, render), and a thin Component sliver. This is a healthy pyramid, not an ice-cream cone.

## Layer assignments

### E2E (17)
| ID | Scenario | Why E2E |
|---|---|---|
| TC-001 | Generate by Leave Type | Full-stack generate flow + grid render |
| TC-002 | Generate by Employee | Autocomplete → generate → grid |
| TC-004 | ESS My report auto-generates | Page-load render, self menu |
| TC-005 | Export to CSV | Browser download behavior |
| TC-006 | Drill-down: Entitlement cell | Client navigation to entitlements screen |
| TC-007 | Drill-down: status cell | Client navigation to filtered Leave List |
| TC-201 | Unauthenticated Admin report → login | Redirect only observable in browser |
| TC-202 | Unauthenticated My report → login | Redirect |
| TC-203 | ESS cannot reach Admin report | Menu/route guard in browser |
| TC-301 | Employee Name required | Inline OXD field validation |
| TC-302 | Leave Period required | Inline validation |
| TC-303 | Invalid (unresolved) employee | Autocomplete field error |
| TC-404 | Default Leave Period = current | Default rendered value |
| TC-405 | Generate-For toggle (smoke) | Criteria panel swap in browser (also Component) |
| TC-501 | Leave Type criteria controls render | Visibility set |
| TC-502 | Employee criteria controls render | Visibility set |
| TC-503 | Result grid column headers | Header render |
| TC-504 | Empty result "No Records" | Empty-state render |
| TC-505 | Records-Found only after Generate | On-demand render |
| TC-506 | My report has no criteria | Self-scoped render |
| TC-507 | Column-config toggle | Config panel render |

*(TC-003 is split: value-equality lives in API; the E2E half is folded into TC-001/TC-503.)*

### API / Integration (23)
| ID | Scenario | Why API (push DOWN) |
|---|---|---|
| TC-003 | Seeded values match | `balanceDays`/`pendingApprovalDays` equality — read straight from `/reports/data` |
| TC-100 | Balance = E − (P+S+T) | Pure backend computation contract |
| TC-101 | Pending escrow reduces balance | Computation; no browser needed |
| TC-102 | Grid ⇄ API parity | Compare data API to UI (anchor at API) |
| TC-103 | One row per current employee | `meta.total` + row scope |
| TC-104 | One row per leave type (Employee) | Row shape from API |
| TC-105 | Sub Unit filter | Server filter via query param |
| TC-106 | Job Title filter | Server filter |
| TC-107 | Location filter | Server filter |
| TC-108 | Include Past Employees | `includeEmployees=currentAndPast` |
| TC-109 | Leave Period changes window | `fromDate/toDate` effect on values |
| TC-110 | My report self-scope | `meta.employee` assertion |
| TC-111 | Negative/overdrawn balance | Backend math edge |
| TC-204 | Forged empNumber ignored | API authorization (only meaningful at API) |
| TC-205 | Supervisor scope | API data scope |
| TC-304 | Empty filter combination | `meta.total = 0` |
| TC-305 | Unauthenticated data API → 401 | API auth |
| TC-401 | No entitlement ⇒ zeros | Computed zeros |
| TC-402 | Half-day → 0.50 | Fractional computation/formatting |
| TC-403 | Working-day counting | Work-week computation |
| TC-406 | Pagination at 50 | `limit/offset` behavior |
| (TC-100/111) | balance formatting `N.NN` | Response formatting |

### Component (2)
| ID | Scenario | Why Component |
|---|---|---|
| TC-405 | Generate-For panel swap | Conditional render of two field sets — a single-component concern (also smoked at E2E) |
| TC-507 | Column-config panel | Isolated panel render/interaction |

> No dedicated component-test harness exists in this Playwright-only repo, so TC-405/TC-507 are exercised through E2E in practice; they are tagged Component to mark the *correct* layer for a future CT setup.

## Decision rationale (contested assignments)

- **TC-003 / TC-100 / TC-101 (balance math)** → **API, not E2E.** The `balanceDays` value is computed server-side and returned verbatim; asserting the number through a `revo-grid` shadow-DOM cell is brittle and tests rendering, not math. Read it from `/reports/data`. (Anti-pattern avoided: *pure logic tested at E2E*.)
- **Filters TC-105–109** → **API.** Each maps to a query parameter (`subunitId`, `jobTitleId`, `locationId`, `includeEmployees`, `fromDate/toDate`). Verifying the filtered row set at the API is faster and less flaky than re-driving the criteria form per filter. Keep **one** E2E (TC-001) to prove the form wires through; the rest go down.
- **TC-204 (forged empNumber) / TC-205 (supervisor scope)** → **API only.** Authorization/data-scope is invisible from the My-report UI (which never offers an employee picker). Only a direct API call with a forged param proves the server ignores it.
- **TC-301–303 (validation)** → **E2E.** These are OXD inline field validations rendered by the criteria form; they have no API equivalent (generation simply never fires). (Anti-pattern *input validation at E2E* does **not** apply here — there is no lower layer for client-side required-field UI.)
- **TC-102 (parity)** → tagged API: the assertion compares the rendered grid to the API payload; the source of truth is the API, so it is owned there with an optional E2E spot-check.
- **Critical-flow E2E coverage retained:** TC-001, TC-002, TC-004 guarantee the report actually generates end-to-end for all three entry points — avoiding the *no E2E for critical flows* anti-pattern.

## Anti-patterns found in existing tests
- Existing `tests/leave/*.spec.ts` correctly use API services (`LeaveEntitlementsApi`, `LeaveRequestsApi`) to set up state and to assert balances (e.g. `my-leave.spec.ts` TC-104/TC-106 read balance via API and compare to the UI). This is the pattern to follow here: **seed + assert numeric truth via API, assert render/navigation via E2E.** No ice-cream-cone tendencies observed in the leave suite.
- Caution for this feature specifically: do **not** attempt to assert grid cell *values* by scraping `revo-grid` — it is a closed/shadow web component. Assert grid **headers/row-count/visibility** at E2E and **values** at API.
