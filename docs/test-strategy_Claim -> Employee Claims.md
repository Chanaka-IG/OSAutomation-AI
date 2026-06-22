# Test Strategy — Claim → Employee Claims

**Input:** `docs/test-scenarios_Claim -> Employee Claims.md` (33 scenarios)
**Feature shape:** A single admin search/list page (`/claim/viewAssignClaim`) whose entire behaviour is driven by one read endpoint, `GET /api/v2/claim/employees/requests` (filters, sort, paging, employee-scope), plus `GET /api/v2/claim/events?status=true` for the Event dropdown. There is **no create/update/delete** on this page — it is read + filter + navigate.

Because the logic lives almost entirely in **query-parameter semantics on one endpoint**, the bulk of filter/sort/scope coverage pushes DOWN to the **API** layer; **E2E** is reserved for the user-visible journey (page loads, filter→search→grid wiring, View Details navigation) and UI state; there is no isolated pure function to unit-test and no standalone component worth mounting in isolation here.

---

## Layer Distribution

| Layer | Count | Focus | Relative time |
|-------|-------|-------|---------------|
| **E2E** | 16 | Page load, filter→search→grid wiring, View Details navigation, Reset, menu/role visibility, UI state, empty/loading | Slow |
| **API** | 14 | Filter predicate correctness, sort order, `includeEmployees` scope modes, status enum, pagination offset, injection-safety, API authorization | Fast |
| **Component** | 0 | (No isolated OXD component worth mounting outside the page) | — |
| **Unit** | 0 | (No pure, I/O-free logic in this feature) | — |
| **Total** | 33 (several dual-layered) | | |

> Defense-in-depth: filter/sort/scope rules that matter most (TC-002, TC-005, TC-100, TC-102, TC-105, TC-106) are asserted at **both** API (semantics) and E2E (the grid actually reflects them).

---

## Layer Assignments

### E2E (multi-page / full-stack journey, user-visible state)
| TC | Title | Why E2E |
|----|-------|---------|
| TC-001 | Default list loads | Page render + default request wiring; user-visible grid |
| TC-002 | Search by Reference Id | Filter → grid wiring (also API) |
| TC-003 | Search by Employee Name | Autocomplete hint selection is a UI interaction |
| TC-004 | Filter by Event Name | Dropdown → grid wiring |
| TC-005 | Filter by Status | Dropdown → grid (also API) |
| TC-006 | Date range filter | Date picker → grid |
| TC-007 | Combined filters | Multi-control interaction in the UI |
| TC-008 | View Details navigation | Cross-page journey to `/assignClaim/id/{id}` |
| TC-009 | Reset clears filters | UI reset behaviour |
| TC-200 | ESS cannot open page | Route guard / redirect — full-stack |
| TC-201 | Menu hides Employee Claims for ESS | Rendered menu state per role |
| TC-203 | Unauthenticated → login | Route guard redirect |
| TC-500 | Filter panel collapse/expand | Pure UI toggle |
| TC-501 | "No Records Found" empty state | Rendered empty state |
| TC-502 | "Records Found" count updates | Live UI update |
| TC-503 | Loading state during search | Transient UI indicator |

### API (query-param semantics, contract, authorization)
| TC | Title | Endpoint / param | Why API |
|----|-------|------------------|---------|
| TC-002 | Reference Id filter | `?referenceId=` | Predicate correctness without UI cost |
| TC-005 | Status filter | `?status=<code>` | Enum→result mapping |
| TC-006 | Date range filter | `?fromDate&toDate` | Range predicate |
| TC-100 | Event dropdown = active only | `GET …/events?status=true` | Source-of-truth check |
| TC-102 | Default `includeEmployees=onlyCurrent` | default request | Default param contract |
| TC-103 | Include = currentAndPast widens | `?includeEmployees=currentAndPast` | Scope semantics; needs terminated-emp data — cheap via API |
| TC-104 | Include = onlyPast | `?includeEmployees=onlyPast` | Scope semantics |
| TC-105 | Default sort referenceId DESC | `?sortField&sortOrder` | Ordering contract |
| TC-106 | Records Found = meta.total | response `meta.total` | Count source-of-truth |
| TC-202 | ESS API forbidden/self-scoped | `GET …/employees/requests` as ESS | Authorization at the contract |
| TC-300 | Non-existent Reference Id → empty | `?referenceId=999…` | Empty-result contract |
| TC-302 | From > To → empty, no 500 | `?fromDate>toDate` | Server robustness |
| TC-402 | Injection-like Reference Id | `?referenceId=' OR 1=1 --` | Parameterized-query safety |
| TC-400 | Pagination offset | `?limit&offset` | Paging contract (no dup/missing) |

### Scenarios validated at BOTH layers (defense-in-depth)
TC-002, TC-005, TC-006, TC-100, TC-102, TC-105, TC-106 — API proves the semantics; E2E proves the grid reflects them.

---

## Decision Rationale (contested assignments)

- **TC-103 / TC-104 (Include past employees) → API, not E2E.** These require a terminated employee that owns a claim — expensive and brittle to set up through the UI. The `includeEmployees` query param is the actual rule; assert it directly. Keep the *default* (TC-102) at E2E so the page's out-of-box behaviour is still user-verified.
- **TC-105 (sort), TC-106 (count) → primarily API.** Sort order and total are deterministic in the response payload; reading them from the DOM is flakier than asserting `sortOrder=DESC` and `meta.total`. A light E2E spot-check confirms the grid honours them.
- **TC-302 / TC-402 (bad/hostile input) → API.** Validation and injection-safety belong at the contract, not E2E (anti-pattern: "input validation at E2E"). A single E2E may smoke-check TC-300's empty state for the user-facing message.
- **TC-003 (Employee Name autocomplete) → E2E only.** The value is the *interaction* (type → hint → select); the resulting request is already covered by employee-scope API tests.
- **TC-401 / TC-403 (boundary date, long input) → fold into API** where practical; low value as standalone E2E.

---

## Anti-Patterns Checked

- ✅ No input validation pushed to E2E — TC-302/TC-402/TC-403 live at API.
- ✅ No API error/authorization codes tested through the browser — TC-202 is API.
- ✅ Critical journeys retain E2E coverage (TC-001, TC-008) — not an all-API strategy.
- ✅ Not an ice-cream cone: only 16 E2E for a read-only page, with semantics pushed to fast API tests.
- ⚠️ Existing `tests/claim/*.spec.ts` are **all E2E** (assign/submit/expense-types). Acceptable there (they mutate state across pages), but Employee Claims should not blindly copy that pattern — its read-only filter logic is cheaper at the API layer.

---

## Notes for Generation
- Reuse `ClaimRequestsApi` / `ClaimEventsApi` and the `orangehrmAdminApi` fixture for API-layer assertions and for seeding read-only fixtures.
- Claims are **permanent** (DELETE → 405); rely on already-seeded claims (env had 28) rather than creating throwaway data. Seed at most a couple of fixed permanent claims if a specific status/event is required.
- A new `EmployeeClaimsPage` POM (list + filters) is needed; the existing `AssignClaimPage` already models part of this list (`assignClaimButton`, `referenceIdFilter`, `searchButton`, `claimRows`) and can be extended or mirrored.
