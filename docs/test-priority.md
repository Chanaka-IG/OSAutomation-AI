# Test Priority: Vacancies List & Filter Functionalities — E2E Tests

> **Input**: `docs/test-strategy.md` — 52 E2E scenarios
> **Feature**: Recruitment → Vacancies List (`/web/index.php/recruitment/viewJobVacancy`)
> **Generated**: 2026-05-23

---

## Summary

| Priority | Count | Focus |
|---|---|---|
| **P0** | 5 | Page load, delete flow, security (auth/role access) |
| **P1** | 13 | All four filter types, reset, core navigation, bulk delete, empty state UX, data display |
| **P2** | 18 | Combined filters, sort, dropdown content, counter accuracy, reset completeness, row actions |
| **P3** | 16 | Pagination edge, dropdown freshness, cosmetic states, low-level checkbox UX |
| **Total** | **52** | |

> ⚠️ TC-500, TC-402, TC-403 are included in P3 but **excluded from automation** (see test-strategy.md — flake risk / high setup cost).

---

## P0 — Release Blocking

> Core feature works end-to-end, security gates enforced. A failure here ships broken recruitment management or exposes data to unauthorized users.

| ID | Description | Rationale |
|---|---|---|
| TC-001 | Vacancies list page loads with all records and correct columns | If the page fails to load or table is empty/misrendered, all recruitment management is blocked with no workaround |
| TC-011 | Delete button → confirm → vacancy removed from list | Core destructive CRUD operation; broken delete means stale/unremovable data with no UI workaround |
| TC-200 | Unauthenticated user redirected to login | Security gate — if bypassed, vacancy data is publicly exposed. Blocks release by compliance requirement |
| TC-201 | ESS user has no Recruitment item in side navigation | Role-based access control; ESS users must not see the Recruitment module under any path |
| TC-202 | ESS user accessing vacancies URL directly sees no Add/Edit/Delete controls | Defense-in-depth security — UI must not expose write actions to unauthorized roles even via direct URL |

---

## P1 — High Business Impact

> Primary feature paths used daily by Recruitment Admins. Failures degrade core workflows significantly; most have no practical workaround beyond direct API calls.

| ID | Description | Rationale |
|---|---|---|
| TC-002 | Filter by Job Title returns only matching vacancies | Primary filter — Admins routinely narrow vacancies by role; broken filter returns wrong data |
| TC-003 | Filter by specific Vacancy name returns exact match | Primary filter — essential for locating a specific vacancy in large lists |
| TC-004 | Filter by Hiring Manager returns only their vacancies | Primary filter — managers need to see their own vacancies; wrong results are misleading |
| TC-005 | Status "Active" filter shows only active vacancies | Most frequent filter use case — Admins work exclusively with active postings; closed vacancies add noise |
| TC-006 | Status "Closed" filter shows only closed vacancies | Common archive review path — Admins regularly audit closed postings |
| TC-009 | Reset clears all filters and restores full list | Core UX — reset is used after every filtered search; broken reset leaves users stuck in a filtered state |
| TC-010 | Edit button navigates to the correct Edit Vacancy page | Primary row action — the only UI path to modify an existing vacancy |
| TC-012 | Add button navigates to Add Vacancy page | Primary creation path — broken Add button prevents any new vacancy creation from the list |
| TC-018 | Bulk delete selected vacancies removes them | High-frequency admin task for vacancies cleanup; broken bulk delete forces tedious one-by-one deletion |
| TC-300 | Filter with no match shows "No Records Found" empty state | Critical UX feedback — without this, users cannot distinguish "filter returned nothing" from "page load failed" |
| TC-302 | Cancel delete confirmation leaves vacancy unchanged | Data safety — if cancel secretly deletes, it is a silent data loss bug with no recovery path |
| TC-501 | Record count updates after each Search action | Primary UX signal — Admins rely on the count to know how many vacancies match their filter |
| TC-505 | Closed vacancy shows label "Closed" (not "false" or "Inactive") | Data display correctness — the label must match the status vocabulary used everywhere in the UI |

---

## P2 — Moderate Impact

> Secondary flows and feature completeness. Failures are noticeable but workarounds exist (e.g. apply filters separately, reload page). High polish / accuracy requirements.

| ID | Description | Rationale |
|---|---|---|
| TC-007 | Job Title + Status combined filter narrows results | Multi-filter is a common power-user scenario; failure forces two separate searches |
| TC-008 | All four filters combined returns exact match | Advanced filter combination; workaround is to narrow sequentially |
| TC-013 | Default sort is Vacancy name ASC on page load | Users expect a predictable default order; wrong default causes confusion but workaround (click column) exists |
| TC-014 | Clicking Vacancy column toggles to DESC | Sort usability; workaround is to manually scan the list |
| TC-015 | Sort by Job Title reorders rows | Secondary sort option; moderate usability impact |
| TC-016 | Sort by Status groups Active/Closed rows | Useful for status-based scanning; workaround is Status filter |
| TC-017 | Select-all header checkbox selects every row | Prerequisite for bulk operations; broken select-all forces row-by-row selection |
| TC-100 | Vacancy dropdown lists all existing vacancies | Filter data integrity — stale dropdown misleads Admins into thinking a vacancy doesn't exist |
| TC-101 | Job Title dropdown lists all configured job titles | Filter completeness — missing job titles in the dropdown makes those vacancies unreachable via filter |
| TC-102 | Hiring Manager dropdown shows only actual managers | Filter accuracy — non-managers in the list produce confusing zero-result searches |
| TC-105 | Record count matches visible row count | Accuracy — mismatch between counter and rows undermines trust in the page |
| TC-301 | Search with no filter selected returns full list | Expected no-op behaviour; broken would incorrectly restrict the list |
| TC-303 | Status "Active" filter when all vacancies are Closed shows empty state | Edge case of primary filter — must show empty state, not crash or show wrong data |
| TC-304 | Status "Closed" filter when all vacancies are Active shows empty state | Symmetric counterpart to TC-303 |
| TC-305 | Vacancy filter → Reset → full list restored | Reset completeness — failing only when a specific filter is applied; workaround is page reload |
| TC-508 | Record count decrements by 1 after single delete | Reactive UI accuracy — stale counter after delete misleads admin about current state |
| TC-509 | Edit button uses the correct vacancy ID in the URL | If Edit opens the wrong vacancy, edits corrupt wrong record — but only if ID lookup is wrong |
| TC-510 | Action buttons (Edit, Delete) present on every row | UI structural completeness — missing buttons on some rows blocks actions for those vacancies |

---

## P3 — Low Impact / Cosmetic / Rare Edge Cases

> Nice-to-have validations, rare scenarios, cosmetic states, or scenarios with easy workarounds. Implement after P0–P2 coverage is solid.

| ID | Description | Rationale |
|---|---|---|
| TC-107 | Pagination controls appear when >50 vacancies exist | Rare in practice — few organisations reach 50+ active vacancies; high setup cost |
| TC-108 | Vacancy dropdown updates immediately after new vacancy created | Dynamic refresh; workaround is a page reload |
| TC-400 | Zero records — correct empty state with column headers | Valid but rarely encountered system state; cosmetic/structural |
| TC-401 | Long vacancy name truncates without breaking table layout | Pure cosmetic layout concern; no functional impact |
| TC-402 | Exactly 50 records — no pagination control shown | ⚠️ **Excluded from automation** — requires seeding exactly 50 vacancies; high setup cost |
| TC-403 | 51 records — pagination control appears | ⚠️ **Excluded from automation** — requires seeding exactly 51 vacancies; high setup cost |
| TC-404 | Sort toggle ASC → DESC → ASC on two clicks | Detailed sort correctness; workaround is to reload (returns to default ASC) |
| TC-405 | Bulk delete all vacancies → empty state | Destructive edge case; overlap with TC-018 (bulk delete) + TC-400 (empty state) |
| TC-406 | Hiring Manager dropdown has no duplicate entries | Data deduplication edge; functional but low frequency |
| TC-407 | Deleted vacancy no longer appears in Vacancy dropdown | Dropdown staleness edge; workaround is page reload |
| TC-500 | Shimmer loader visible while API call is in progress | ⚠️ **Excluded from automation** — flake-prone on fast connections; requires network throttling |
| TC-502 | All filter dropdowns show "-- Select --" on fresh page load | Cosmetic initial state; if wrong, users notice immediately and can work around it |
| TC-503 | Reset shows "-- Select --" in all dropdowns | Cosmetic reset state; partial overlap with TC-009 (reset functional behaviour) |
| TC-504 | Filter panel collapse/expand toggle works | Nice-to-have UI feature; filter panel is open by default, toggle rarely needed |
| TC-506 | Row checkbox toggles checked/unchecked independently | Low-level UI state detail; covered implicitly by TC-017 and TC-018 |
| TC-507 | Select-all then deselect-all via header checkbox | Inverse of TC-017; low incremental value once TC-017 is passing |

---

## Recommended Generation Order

Generate and implement in priority order. Stop after P1 for CI gate; add P2/P3 in subsequent sprints.

```
P0 (5 tests)  → always run, block merge on failure
P1 (13 tests) → always run, block merge on failure
P2 (18 tests) → run on schedule / pre-release
P3 (13 tests) → run on schedule, non-blocking
              (TC-402, TC-403, TC-500 excluded from automation)
```
