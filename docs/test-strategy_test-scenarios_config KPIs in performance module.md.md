# Test Strategy: Configure KPIs (Performance Module)

**Feature**: Performance → Configure → KPIs
**List page**: `/web/index.php/performance/searchKpi`
**Add/Edit page**: `/web/index.php/performance/saveKpi`
**API**: `GET /api/v2/performance/kpis?jobTitleId`, `POST /api/v2/performance/kpis`, `PUT/DELETE /api/v2/performance/kpis/{id}`
**Input**: `docs/test-scenarios_config KPIs in performance module.md` (67 scenarios)
**Generated**: 2026-05-31

---

## ⚠️ Domain-skill correction carried forward

The `orangehrm-opensource-domain` skill still states the **wrong** rule in three places:
- `business-rules.md:91` — *"Set of KPIs with weight (must sum to 100)"*
- `business-rules.md:94` — *"KPI weights … must equal exactly 100 … `Total weight should be 100`"*
- `user-flows.md:82,157` — *"KPIs with weights summing to 100"*

**There is no weight field on the Open Source Configure KPIs screen.** Weighting is an Enterprise feature. The Open Source KPI record is `{ title, jobTitleId, minRating (0–100, default 0), maxRating (0–100, default 100), isDefault }` — confirmed by `api-reference.md:96` and live demo. All layer assignments below trace to the **corrected** data model and observed behavior, never the weight rule. (This matches the project memory note on Performance KPI config.)

---

## Test Pyramid Distribution

| Layer       | Count | Focus                                                                 | Avg Run Time |
|-------------|-------|-----------------------------------------------------------------------|--------------|
| E2E         | 43    | Full-stack journeys, OXD dropdown/table interaction, role-based render, UI state, inline-validation message strings | 20–45s each |
| API         | 24    | Server-side validation enforcement, CRUD contracts, auth/CSRF, error codes, scoping/uniqueness/default-flag semantics | 1–3s each |
| Component   | 0     | OXD design-system components are not independently mountable in this project (consistent with all prior strategies) | — |
| Unit        | 0     | KPI validation/normalization is server-side PHP; no pure frontend functions to isolate | — |
| **Total**   | **67** |                                                                      |              |

> **Pyramid shape**: This feature is UI-config-heavy (list filtering, sort, pagination, bulk-select, inline validation), so E2E is unavoidably the larger band. However, every rule that the **server** enforces (required fields, 0–100 bounds, max>min, max-length, trimming, uniqueness, default-flag, scoping) is **pushed down to API** as the authoritative, fast, deterministic check — giving a 24-test API base rather than the 2–5 API tests of the prior recruitment/leave strategies. The UI keeps only a **representative** sample of inline-message E2E tests for OXD-reactive validation rather than one E2E per variant (avoids the ice-cream-cone anti-pattern).

---

## Layer Assignments

### API Tests (24)

Server contracts assertable without a browser. Endpoints per `api-reference.md:95-96`.

| ID     | Title                                            | Endpoint / Assertion | Rationale |
|--------|--------------------------------------------------|----------------------|-----------|
| TC-102 | Only one default scale per Job Title             | `POST/PUT kpis` then `GET ?jobTitleId` | Inspecting `isDefault` across the full result set is a data assertion, not a render — API is precise and avoids list-filter flake. **Defense-in-depth E2E**: TC-409. |
| TC-105 | Unchecked "Make Default" → `isDefault:false`     | `POST kpis` → read back | Flag default semantics are a contract; verify on the response/GET, not the "blank cell". Secondary E2E: TC-504. |
| TC-106 | New KPI scoped to its Job Title                  | `GET kpis?jobTitleId` | Server-side scoping is the rule under test; `jobTitleId` filter is the contract. Secondary E2E: TC-002/TC-106 list filter. |
| TC-108 | Duplicate title allowed across **different** Job Titles | `POST kpis` (2nd jobTitle) | Uniqueness is per-(title,jobTitle); proven by two POSTs + 200, no browser needed. |
| TC-109 | Duplicate title within the **same** Job Title (verify) | `POST kpis` (same jobTitle) | Capture the real server response (accept vs duplicate error) at the layer that owns it. |
| TC-202 | ESS create rejected                              | `POST kpis` w/ ESS token → 403 | Pure auth contract (data-group permission). |
| TC-204 | State-change requires valid CSRF token           | cookie-flow mutate, bad `_token` → 401 | CSRF is a request-layer guard; assert the status, not a page. |
| TC-207 | ESS PUT/DELETE by tampered id rejected           | `PUT/DELETE kpis/{id}` w/ ESS → 403 | Authorization-per-request (IDOR) — must be tested below the UI. |
| TC-301 | Missing Job Title rejected server-side           | `POST kpis` omit `jobTitleId` → 422 | Required-field enforcement is authoritative on the server. UI message represented by TC-300. |
| TC-302 | Missing Minimum Rating rejected                  | `POST kpis` omit `minRating` → 422 | Same; pushed down from the suggested E2E+Component. |
| TC-303 | Missing Maximum Rating rejected                  | `POST kpis` omit `maxRating` → 422 | Same. |
| TC-305 | Rating > 100 rejected                            | `POST kpis minRating/maxRating=150` → 422 | Bound enforcement; UI message represented by TC-101. |
| TC-306 | Negative rating rejected                         | `POST kpis minRating=-5` → 422 | Lower-bound enforcement. |
| TC-307 | Max == Min rejected (strictly greater)           | `POST kpis min=50,max=50` → 422 | Comparison rule; UI message represented by TC-100. |
| TC-308 | Create with missing required field               | `POST kpis` omit `title` → 400/422 | Explicit server-validation contract. |
| TC-309 | Delete stale / non-existent id                   | `DELETE kpis/{deletedId}` → 404 | Resource-not-found contract. |
| TC-310 | Create with out-of-range ratings                 | `POST kpis minRating=-1`/`maxRating=101` → 422 | Server mirrors UI 0–100 bounds. |
| TC-311 | Create with maxRating ≤ minRating                | `POST kpis min=80,max=50` → 422 | Server enforces Max>Min. |
| TC-400 | Title at/over max length                         | `POST kpis` title=N / N+1 chars → 200 / 422 | Max-length is backend-authoritative (frontend may not enforce); discover actual N here. Secondary E2E: representative over-limit message. |
| TC-402 | Smallest valid gap (Min 0, Max 1)                | `POST kpis min=0,max=1` → 200 | Boundary acceptance is a data fact; cheaper at API. |
| TC-403 | Top-of-range gap (Min 99, Max 100)               | `POST kpis min=99,max=100` → 200 | Boundary acceptance. |
| TC-404 | Decimal rating value (verify)                    | `POST kpis minRating=50.5` | Capture real precision handling (accept/round/reject) at the contract layer. Secondary E2E for inline message. |
| TC-405 | Leading/trailing whitespace in title             | `POST kpis title="  Quality  "` → stored trimmed | Trimming is server-side normalization; assert stored value via GET. |

### E2E Tests (43)

Multi-page journeys, OXD custom-dropdown/table interaction, role-based rendering, and inline-validation message strings that OXD renders reactively (client-side, before any request) — none assertable below the browser.

#### Happy Path (15)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-001 | List loads with correct columns/records | Full-stack page render + table; heading + "(N) Records Found". |
| TC-002 | Filter by Job Title | OXD custom dropdown (not native `<select>`) → server filter → table re-render; only E2E exercises the dropdown. API scoping covered by TC-106. |
| TC-003 | Reset clears the filter | Multi-state OXD interaction. |
| TC-004 | Add button → form | Navigation + form render assertion. |
| TC-005 | Add KPI with all valid fields | Full create journey + list appearance; POST contract verified separately at API (see Defense-in-depth). |
| TC-006 | Add using default scale 0–100 | Save + list shows Min 0 / Max 100. |
| TC-007 | Add as default scale | Checkbox → "Yes" in Is Default column; flag contract at TC-105. |
| TC-008 | Edit a KPI's title | Edit journey + list reflects change; PUT contract implicit. |
| TC-009 | Edit Min/Max rating | Edit + list shows 50/90. |
| TC-010 | Delete single KPI via row action | Confirm dialog + row removed + count decremented. |
| TC-011 | Bulk delete via checkboxes | Selection toolbar + multi-delete + count. |
| TC-012 | Sort by Job Title / KPI name | Client/server sort caret behavior — UI only. |
| TC-013 | Pagination between pages | ~50/page paging control — UI only. |
| TC-014 | Cancel on Add returns without saving | Partial-flow + count unchanged. |
| TC-015 | Select-all header checkbox | OXD bulk-select state. |

#### Business Rule (5)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-100 | Max must be greater than Min (inline message) | Asserts the OXD inline string `Maximum Rating should be greater than Minimum Rating`; server rule at TC-307/TC-311. |
| TC-101 | Ratings constrained 0–100 (inline message) | Asserts `Should be a number between 0-100`; server bound at TC-305/TC-310. |
| TC-103 | KPI used by a review cannot be deleted | UI affordance: Edit-only Actions cell (no Delete icon) — a render state only visible in the browser. |
| TC-104 | Job Title dropdown lists only real job titles | OXD dropdown option enumeration vs Admin→Job Titles; no free text. |
| TC-107 | Boundary ratings 0 and 100 accepted | Full save + list display of an accepted default scale (boundary *acceptance* at API via TC-402/403). |

#### Security (5)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-200 | ESS has no Configure KPIs menu | Role-based nav rendering — log in as ESS. |
| TC-201 | ESS direct-URL to searchKpi blocked | Server-side authz + redirect/forbidden page in browser. |
| TC-203 | Unauthenticated → login redirect | Session middleware + `/auth/login?next=` redirect. |
| TC-205 | Supervisor cannot configure KPIs | Role distinction (supervisor ≠ admin) via menu + URL. |
| TC-206 | XSS payload in title escaped on render | Output-encoding is only observable in the rendered list/review screen. |

#### Negative / Error (2)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-300 | Empty title → inline `Required` | Representative required-field **UI** message (OXD reactive, fires before submit); server-side required coverage at TC-301/302/303/308. |
| TC-304 | Non-numeric rating → inline `Should be a number between 0-100` | Typing `abc` in a numeric field is a client-side reactive validation that never reaches the server — E2E is the only layer that sees it. |

#### Edge Case (5)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-401 | Unicode / special-char title | Render fidelity (apostrophe, accents) is a browser concern; storage covered implicitly. |
| TC-406 | Rating with leading zeros (`050`→`50`) | Client-side numeric normalization in the field — UI behavior. |
| TC-407 | Very long title display in table | Table layout/wrap is a pure rendering assertion. |
| TC-408 | Add crosses a pagination boundary | Pagination recompute + "Records Found" update — UI state. |
| TC-410 | Whitespace-only title → `Required` after trim | The post-trim inline `Required` is OXD-reactive UI; server trim covered by TC-405. |

#### UI State (11)
| ID | Title | Rationale |
|----|-------|-----------|
| TC-500 | Loading shimmer before rows render | `.oxd-loading-spinner` lifecycle — browser only. |
| TC-501 | Empty state on no-match filter | "No Records Found" empty table. |
| TC-502 | Inline errors clear when input becomes valid | OXD reactive-validation lifecycle (suggested Component → no component layer here → E2E). |
| TC-503 | Add form pre-fills Min 0 / Max 100 | Default field state on form mount. |
| TC-504 | Default-scale rows show "Yes" | Is Default column render (flag contract at TC-105). |
| TC-505 | In-use KPI shows Edit only (no Delete) | Conditional action render (pairs with TC-103). |
| TC-506 | "Records Found" count updates after add/delete | Live banner state across actions. |
| TC-507 | Row checkbox reveals "Delete Selected" | Conditional bulk-action toolbar. |
| TC-508 | Heading exactly "Key Performance Indicators for Job Title" | Page-identity assertion. |
| TC-509 | Delete confirmation can be cancelled | Dialog cancel keeps record + count. |
| TC-510 | Save shows busy/disabled state (no double-submit) | Submit-in-progress guard — browser timing. |

---

## Defense-in-Depth (rules tested at both layers)

Per the strategy rule "critical rules tested at multiple layers", these scenarios have a primary layer (counted above) **and** a secondary check:

| Rule | API (authoritative) | E2E (user-visible) |
|------|---------------------|--------------------|
| Max > Min | TC-307, TC-311 | TC-100 (inline message) |
| Ratings 0–100 | TC-305, TC-306, TC-310 | TC-101, TC-304 (inline messages) |
| Required fields | TC-301, TC-302, TC-303, TC-308 | TC-300 (inline `Required`) |
| Default-scale flag/uniqueness | TC-102, TC-105 | TC-409→see note, TC-007, TC-504 |
| Job-title scoping / filter | TC-106 | TC-002 |
| Title trimming / whitespace | TC-405 | TC-410 |
| Max title length | TC-400 | over-limit message in TC-400's E2E companion |
| Create CRUD contract | TC-308 (and POST in TC-005 setup) | TC-005 |

> **TC-409** (set new default when one exists) shares the rule with **TC-102** and is assigned **API** (count above) as the authoritative check of whether the previous default is cleared; its E2E facet is observed through TC-007/TC-504.

---

## Decision Rationale (contested assignments)

1. **Validation messages 300–307 split, not all E2E.** The scenarios suggested "E2E + Component" for every required/range/comparison error. Component testing doesn't exist in this project, and putting all 8 at E2E would be an ice-cream cone. Resolution: the **server enforcement** of each rule → API (TC-301/302/303/305/306/307/308/310/311), and a **representative** inline-message E2E (TC-300 required, TC-101/304 range, TC-100 max>min). This keeps OXD-string coverage without 8 redundant browser tests.

2. **TC-002 filter → E2E, TC-106 scoping → API.** Same underlying `GET kpis?jobTitleId`, but they test different things: TC-002 verifies the **OXD custom dropdown** drives the query (only the browser can select a non-native dropdown — same reasoning as the candidate-list strategy TC-002–104), while TC-106 verifies the **server actually scopes** results to that `jobTitleId`. Both kept.

3. **Boundary acceptance (TC-107/402/403) → API primary, one E2E.** Min0/Max1 and Min99/Max100 are data-acceptance facts → cheap, deterministic at API (TC-402/403). TC-107 is retained at E2E once to prove the **full save→list-display** of an accepted default scale.

4. **TC-103 / TC-505 stay E2E.** Delete-protection for review-linked KPIs manifests as a **rendered Actions cell with no Delete icon** — a UI affordance, not just an API 4xx. Kept at E2E. (If a delete-attempt API path exists it can be added later as defense-in-depth, but the observed signal is UI-only.)

5. **TC-400 max-length → API primary.** Frontend may or may not cap the textarea; the backend `422` is authoritative and is also where the **actual N** (flagged for verification) gets discovered. UI over-limit message is a secondary companion.

6. **TC-404 decimal & TC-109 same-title uniqueness → API (verify).** Both are flagged "verify real behavior" in the scenarios. The contract layer is where the true server response is captured unambiguously.

---

## Anti-Patterns

### Flagged in the source scenarios (corrected here)
- **Input validation suggested at E2E + Component** (TC-100/101, TC-300–307, TC-400, TC-404, TC-410, TC-502, TC-406): pushed the rule enforcement **down to API**, kept only representative inline-message E2E. Component layer doesn't exist in this project.
- **"E2E + API" dual suggestions** (TC-005/007/008/010, TC-102/105/106/108/109, TC-405/409): resolved each to a single **primary** layer for the count, with explicit defense-in-depth mapping above — avoids double-counting and clarifies ownership.

### In existing test suites (reference)
- The existing tests carry **no API-layer KPI/performance coverage at all** (`tests/api/` has only `pim-employees.spec.ts`). This strategy adds the missing 24-test performance API base — the same gap that the assign-leave strategy called out for balance/auth rules.
- **Domain-skill documentation is wrong** (`business-rules.md:91,94`, `user-flows.md:82,157` weight rule). Generated tests must **not** assert any weight field or `Total weight should be 100`. The skill files should be corrected to match Open Source reality.
- Reusable patterns to carry over (no anti-pattern): `getRecordCount()` parsing "(N) Records Found", `waitUntilTableLoaderDissapear()`, and `selectFromGroup()` for OXD dropdowns (from `VacanciesListPage`/`CandidatesListPage`); `orangehrmAdminApi.loginAsAdmin()` + unauthenticated `playwright.request.newContext()` for API auth/CSRF tests (from `tests/api/pim-employees.spec.ts`).

---

## Backend / Source References

- KPI list/create: `GET /api/v2/performance/kpis?jobTitleId`, `POST /api/v2/performance/kpis { title, jobTitleId, minRating, maxRating, isDefault }` — `api-reference.md:95-96`.
- Update/delete: `PUT/DELETE /api/v2/performance/kpis/{id}` (per scenarios header).
- UI selectors: `ui-selectors.md:216-220` — Configure KPIs (`getByLabel('Key Performance Indicator')`, `.oxd-checkbox-input` for Make-Default).
- Role/menu rules: `business-rules.md:13-15` — Performance is Admin-only for configuration; ESS/Supervisor scoped to own/subordinate reviews.
- Validation strings (live-captured, scenarios §"Validation messages"): `Required`, `Should be a number between 0-100`, `Maximum Rating should be greater than Minimum Rating`.
- Auth pattern: unauthenticated `expect([401,403])`, admin via `loginAsAdmin()` — `tests/api/pim-employees.spec.ts:21-41`.

---

## Items still flagged for verification during generation
(Carried from scenarios — assert the **actual** product response when implementing, don't assume.)
- TC-102 / TC-409 — single default per job title vs multiple "Yes" allowed.
- TC-103 / TC-505 — exact delete-protection trigger (review-linked).
- TC-109 — same-title-same-jobTitle uniqueness response.
- TC-400 — actual max title length N.
- TC-404 — decimal rating handling (accept / round / reject).
