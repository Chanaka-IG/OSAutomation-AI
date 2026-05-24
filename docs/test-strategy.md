# Test Strategy: Vacancies List & Filter Functionalities

> **Input**: `docs/test-scenarios.md` (51 scenarios, TC-001 to TC-510)
> **Feature**: Recruitment → Vacancies List (`/web/index.php/recruitment/viewJobVacancy`)
> **API**: `GET /web/index.php/api/v2/recruitment/vacancies`
> **Generated**: 2026-05-23

---

## Distribution Table

| Layer | Count | Focus | Est. Time per Test | Total Est. |
|---|---|---|---|---|
| **E2E** | 43 | Page load, filter UI, sort, delete flow, navigation, bulk actions, empty states, UI labels | 25–40s | ~22 min |
| **API** | 8 | Filter query params, sort params, auth (401/403), status mapping | 5–10s | ~1 min |
| **Unit** | 0 | No pure-function logic isolated from I/O in this feature | — | — |
| **Total** | **51** | | | **~23 min** |

Pyramid shape: wide at API (fast, deterministic contracts), narrower at E2E (slower, browser-required).

---

## Layer Assignments

### E2E Tests (43)

These require a real browser — they test OXD dropdown rendering, table layout, navigation, reactive counter updates, and multi-step flows (filter → render → assert).

| ID | Title | Rationale |
|---|---|---|
| TC-001 | List loads with all records and correct columns | Full page render + column presence requires browser |
| TC-002 | Filter by Job Title | OXD dropdown interaction + rendered result |
| TC-003 | Filter by Vacancy name | OXD dropdown + single-match result in table |
| TC-004 | Filter by Hiring Manager | OXD dropdown + filtered rows |
| TC-005 | Status "Active" filter | Requires visual label verification "Active" in rows |
| TC-006 | Status "Closed" filter | Requires visual label "Closed" in rows |
| TC-007 | Job Title + Status combined | Multi-filter AND logic visible in rendered rows |
| TC-008 | All four filters combined | Full filter form interaction |
| TC-009 | Reset clears filters + restores list | OXD dropdown reset + counter update observed in browser |
| TC-010 | Edit button navigates to Edit Vacancy page | Navigation + pre-populated form |
| TC-011 | Delete button → confirm → record removed | Confirmation dialog interaction + row disappearance |
| TC-012 | Add button navigates to Add Vacancy | Navigation |
| TC-013 | Default sort Vacancy ASC on load | Visual row order + API param (defense-in-depth with TC-106) |
| TC-014 | Sort toggle to DESC | Column click → row reorder |
| TC-015 | Sort by Job Title | Column click → row reorder |
| TC-016 | Sort by Status | Column click → row reorder |
| TC-017 | Select-all header checkbox | Checkbox state across all rows |
| TC-018 | Bulk delete selected vacancies | Checkbox + bulk delete button + row disappearance |
| TC-100 | Vacancy dropdown lists all vacancies | Dropdown option count verified in browser |
| TC-101 | Job Title dropdown includes all configured titles | Requires inspecting dropdown options |
| TC-102 | Hiring Manager dropdown shows only managers | Dropdown options vs employee list — browser required |
| TC-105 | Record count matches filter results | Counter "(N) Records Found" ↔ visible row count |
| TC-107 | Pagination at 50+ records | Pagination controls appear/disappear in browser |
| TC-108 | Vacancy dropdown updates after new vacancy added | Dynamic dropdown refresh after navigation |
| TC-200 | Unauthenticated → redirected to login | Browser redirect behaviour |
| TC-201 | ESS user — no Recruitment in nav menu | Menu item visibility |
| TC-202 | ESS direct URL — no Add/Edit/Delete controls | Button visibility for ESS role |
| TC-300 | No match → "No Records Found" empty state | Empty state UI rendering |
| TC-301 | Search with no filter → full list | No filter param → all rows |
| TC-302 | Cancel delete → vacancy stays | Dialog interaction + no row removal |
| TC-303 | Status "Active" filter when all are Closed | Empty state rendering |
| TC-304 | Status "Closed" filter when all are Active | Empty state rendering |
| TC-305 | Vacancy filter → Reset → full list | Reset clears filter + re-renders |
| TC-400 | Zero records — correct empty state | Empty table with headers still shown |
| TC-401 | Long vacancy name — no layout break | Table cell truncation/wrap |
| TC-402 | Exactly 50 records — no pagination control | UI boundary — 50 = no pagination |
| TC-403 | 51 records — pagination appears | UI boundary — 51 = pagination control visible |
| TC-404 | Sort toggle ASC → DESC → ASC | Two-click sort reversal |
| TC-405 | Bulk delete all → empty state | Full bulk-delete + empty table |
| TC-406 | Hiring Manager dropdown — no duplicates | Dropdown deduplication verified visually |
| TC-407 | Deleted vacancy absent from dropdown | Dropdown freshness post-delete |
| TC-500 | Shimmer loader while API in flight | Loading state observation in browser |
| TC-501 | Counter updates after Search | Reactive counter — browser required |
| TC-502 | Dropdowns default to "-- Select --" on load | Initial state of all four OXD dropdowns |
| TC-503 | Reset → all dropdowns back to "-- Select --" | OXD dropdown reset state |
| TC-504 | Filter panel collapse/expand toggle | Panel visibility toggle |
| TC-505 | Closed vacancy displays label "Closed" | Display text != raw boolean — browser required |
| TC-506 | Row checkbox toggles independently | Per-row checkbox state |
| TC-507 | Select-all → deselect-all via header checkbox | Master toggle behaviour |
| TC-508 | Record count decrements by 1 after single delete | Reactive counter update |
| TC-509 | Edit button uses correct vacancy ID in URL | URL correctness post-navigation |
| TC-510 | Action buttons present on every row | Button presence across all rows |

---

### API Tests (8)

These verify HTTP contracts, query parameter mapping, and auth enforcement. No browser required — use `OrangehrmAdminApi.request` directly.

| ID | Title | Endpoint / Contract | Rationale |
|---|---|---|---|
| TC-103 | Status "Active" maps to `status=true` | `GET /recruitment/vacancies?status=true` | Pure API param mapping — no UI needed |
| TC-104 | Status "Closed" maps to `status=false` | `GET /recruitment/vacancies?status=false` | Pure API param mapping — no UI needed |
| TC-106 | Default page load fires correct unfiltered params | `GET /recruitment/vacancies?limit=50&offset=0&sortField=vacancy.name&sortOrder=ASC&model=detailed` | API contract verification — param names and defaults |
| TC-203 | Unauthenticated GET → 401 | `GET /recruitment/vacancies` without session | Auth contract — no browser needed |
| TC-204 | ESS DELETE → 403 | `DELETE /recruitment/vacancies` with ESS session | Role permission contract — no browser needed |

**Defense-in-depth pairs** (critical rules covered at both layers):

| Business Rule | E2E Test | API Test |
|---|---|---|
| Status filter renders correct label | TC-005 / TC-006 | TC-103 / TC-104 |
| Unauthenticated access blocked | TC-200 (redirect) | TC-203 (401) |
| ESS cannot write vacancies | TC-202 (no buttons) | TC-204 (403) |
| Default sort on page load | TC-013 (visual order) | TC-106 (query params) |

---

## File Map

| File | Purpose |
|---|---|
| `tests/recruitment/vacancies-list.spec.ts` | E2E tests — all 43 E2E scenarios |
| `tests/api/recruitment-vacancies.spec.ts` | API tests — all 8 API scenarios |
| `src/pages/recruitment/VacanciesListPage.ts` | Page Object for vacancies list (new) |
| `src/api/orangehrmOSAPI/VacanciesApi.ts` | Already exists — `getAll()`, `deleteVacancies()` sufficient |
| `test-data/frontend/recruitment.ts` | Already has `routes.vacancies`, `urlPatterns.vacancies` |
| `test-data/frontend-api/recruitment/` | Seed data for E2E suite (vacancy fixtures) |

---

## Decision Rationale — Contested Assignments

### TC-103 / TC-104 pushed DOWN to API (from E2E)
The scenarios ask: *does selecting "Active" send `status=true`?* This is a pure API contract — the mapping between dropdown selection and query parameter. Testing this at E2E via Playwright network inspection adds unnecessary overhead and flakiness. The visual result (rows showing "Active") is already covered by TC-005/TC-006. → **API layer.**

### TC-106 pushed DOWN to API (from E2E)
Default page load API params (`limit=50`, `sortField=vacancy.name`, `sortOrder=ASC`, `model=detailed`) are backend contracts. Verifying them via browser network tab is fragile. A direct API assertion is fast, stable, and precise. Visual sort order is covered by TC-013 at E2E. → **API layer.**

### TC-203 / TC-204 pushed DOWN to API (from E2E)
401/403 HTTP status codes are API contracts, not browser behaviours. ESS redirect (TC-200/TC-201/TC-202) is E2E because it tests the Vue router's response and UI rendering. The API auth rejection (no browser) is cleanly expressed as an API test. → **API layer.**

### TC-402 / TC-403 kept at E2E (pagination boundary)
Pagination controls are rendered by the Vue frontend based on `meta.total` from the API. The boundary condition (50 vs 51) must be verified in the browser to confirm the control appears/disappears. The API already has `limit` tested in TC-106. → **E2E layer.**

### TC-100 / TC-101 / TC-102 kept at E2E (dropdown content)
These verify that specific options appear inside OXD dropdowns. OXD dropdowns are custom Vue components — their option list is not directly inspectable via API. The browser must render and open them. → **E2E layer.**

---

## Anti-Patterns Found in Existing Tests

### `tests/recruitment/recruitment.spec.ts`
```
test('candidates route loads', ...) {
  await recruitmentModulePage.openCandidates();
  await expect(page).toHaveURL(...)
}
```
**Anti-pattern**: Single smoke test with no assertions beyond URL. This file should be expanded or absorbed into the new vacancies-list suite.

### Scenarios that would be anti-patterns at E2E — correctly pushed to API
- TC-103/TC-104: Status boolean → query param mapping. Tested at API only.
- TC-106: Default query params. Tested at API only.
- TC-203/TC-204: HTTP 401/403 codes. Tested at API only.

### Potential flakiness risk — TC-500 (shimmer loader)
Shimmer loaders are only visible during a brief async window. This test is only reliable with network throttling or a request interception. Mark this as **low priority** to avoid intermittent failures on fast connections.

### TC-402 / TC-403 data setup cost
Setting up exactly 50 or 51 vacancies is expensive in `beforeAll`. These should be seeded via the `VacanciesApi` in bulk and cleaned up in `afterAll`. Avoid relying on existing data counts for boundary tests.

---

## Scenarios Excluded from Automation (Reason)

| ID | Title | Reason |
|---|---|---|
| TC-500 | Shimmer loader visible during load | Requires network throttling; flake risk on fast CI — treat as manual |
| TC-402 | Exactly 50 records — no pagination | High setup cost (bulk seed 50 vacancies); test at API layer for `meta.total` instead |
| TC-403 | 51 records — pagination appears | Same as TC-402 — high setup cost; defer or mock `meta.total` |

---

## Recommended Execution Order

Run API tests first (fast, fail-early on auth regressions), then E2E in serial mode:

```
1. tests/api/recruitment-vacancies.spec.ts   (~1 min)
2. tests/recruitment/vacancies-list.spec.ts  (~22 min)
```

Total estimated suite runtime: **~23 minutes**.
