# Test Strategy — Performance → Manage Reviews

**Input:** `docs/test-scenarios_Performance -> Manage Reviews.md` (46 scenarios — the source file's inventory line says "41" but the six categories sum to 46: Happy 7 · Business 11 · Security 5 · Negative 7 · Edge 7 · UI State 9).
**Goal:** Push every scenario to the lowest adequate layer. The source scenarios are almost all marked E2E ("ice-cream cone"); this strategy **rebalances toward a pyramid** by moving filter/query correctness, state-transition contracts, authorization, and boundary validation **down to API**, and reserving E2E for genuine cross-page journeys and UI state.

> **Backend grounding**
> - Verified-live REST contracts (2026-06-22): list `GET /api/v2/performance/manage/reviews`, create/update `POST|PUT /api/v2/performance/manage/reviews`, reviewer scoping `GET /api/v2/performance/supervisors?empNumber={n}`, employee autocomplete `GET /api/v2/pim/employees?nameOrId=`.
> - Row-level data scoping for reviews is enforced in the authorization layer: `AbstractUserRole::getAccessiblePerformanceReviewIds()` and the `case PerformanceReview::class` branch in `symfony/plugins/orangehrmCorePlugin/lib/authorization/userrole/AbstractUserRole.php:940,1070`. This is why ESS/foreign-reviewer access (TC-202, TC-203) is a **backend authorization contract → API layer**, not a UI concern.

> **Two hard preconditions carried from the scenario notes (drive fixture/seed design, not layer choice):**
> 1. A reviewee **must have a supervisor** before a review can be created (reviewer list is `…/supervisors?empNumber=`). Seeded demo employees (Marcus James Chen, Jacob Puntasa Oram) have none. **Reuse the existing performance-suite seeding pattern** (`tests/performance/myTarckers.spec.ts` `beforeAll`: `employees.createIfAbsent` → `users.createIfAbsent` → assign supervisor via API) so the reviewee↔supervisor edge exists deterministically.
> 2. The evaluation half (TC-004, TC-103, TC-203) needs a **real reviewer login** and crosses into *My Reviews*/*Employee Reviews* — out of this admin page but in-scope for the full lifecycle E2E.

---

## Distribution

| Layer | Count (primary) | Focus | Est. time |
|-------|-----------------|-------|-----------|
| Unit | 0 | No client-side pure logic exposed (date `end ≥ start`, status transitions, filtering are all server-side) | — |
| API / Integration | 23 | Filter/query correctness, state-transition & lock contracts, attribution, authorization, boundary validation | fast |
| Component | 0 | No Vue component-test harness in this repo (Playwright-only). Form-validation & dropdown-content tests that *would* be Component land at E2E — see Anti-Patterns | — |
| E2E (Playwright) | 23 | Create/activate/edit/delete journeys, full review lifecycle, route guards, form validation wiring, UI state | moderate |

**Defense-in-depth:** TC-100 and TC-103 are covered at **both** API (primary, contract) and E2E (secondary, UI) → 48 total test artifacts across 46 unique scenarios. Pyramid shape: 0 unit / 23 API / 23 E2E (wide-ish base at API, no ice-cream cone).

---

## Layer Assignments

### API / Integration (23)

| ID | Assertion | Endpoint / Why API |
|----|-----------|--------------------|
| TC-100 | Reviewer list = employee's supervisors only | `GET /performance/supervisors?empNumber={X}` returns exactly X's supervisors; non-supervisor → empty. Contract-level. *(also E2E)* |
| TC-101 | No-supervisor employee → empty reviewer list (creation blocker) | Same endpoint returns `[]` for an employee with no reporting-to; pushed down from E2E — the blocker is the empty API response, not the UI message |
| TC-102 | Save→Inactive, Activate→Activated initial state | `POST /performance/manage/reviews` response `statusId`; Save vs Activate payload flag |
| TC-103 | Completed review is locked | `PUT` to a Completed review rejected (4xx); lock is a backend invariant. *(also E2E read-only check)* |
| TC-104 | Attribution: `empNumber=X`, `reviewerEmpNumber=Y`, not the admin actor | Inspect created record via API |
| TC-105 | Default sort by `performanceReview.statusId` ASC | List query contract |
| TC-106 | Job Title filter | `?jobTitleId=` — query correctness belongs at API, not E2E |
| TC-107 | Review Status filter | `?statusId=` per state (Inactive/Activated/In Progress/Completed) |
| TC-108 | Reviewer filter | `?reviewerEmpNumber=` |
| TC-109 | Include current/past | `?includeEmployees=onlyCurrent` vs incl-past; terminated reviewee hidden/shown |
| TC-110 | From/To date scoping | `?fromDate&toDate` |
| TC-201 | ESS cannot create | `POST` with ESS token → 403 |
| TC-202 | ESS cannot list all reviews | `GET …/manage/reviews` ESS → 403 / scoped-empty (`getAccessiblePerformanceReviewIds`) |
| TC-203 | Non-assigned reviewer cannot evaluate | `PUT` foreign review → 403 (row-level scoping) |
| TC-204 | Unauth/missing-CSRF create rejected | `POST` no token → 401 |
| TC-302 | End date < start date rejected | `POST` with `reviewPeriodEnd < reviewPeriodStart` → 422 (server validation contract) |
| TC-400 | Single-day period (start=end) accepted | `POST` boundary → 200 |
| TC-401 | Due date before period start | `POST` → document accept/reject; boundary contract |
| TC-402 | Reviewee who is also a supervisor | Reviewer list still = own supervisors only (supervisors endpoint) |
| TC-403 | Self-review (employee==reviewer) | `POST` → document whether permitted |
| TC-404 | Multiple/overlapping reviews per employee | `POST` twice → both created (no overlap guard) |
| TC-405 | Year-spanning period + date filter interaction | `POST` + list `?fromDate&toDate` |
| TC-406 | Pagination 50/page | `?limit=50&offset=` advances correctly |

### E2E (Playwright) (23)

| ID | Assertion | Why E2E |
|----|-----------|---------|
| TC-001 | Create (Save) → Inactive, toast, list row | Multi-step Add journey + toast + list render |
| TC-002 | Create (Activate) → Activated | Add journey, alternate button |
| TC-003 | Activate an existing Inactive review from list | List → edit → state change in UI |
| TC-004 | **Full lifecycle**: Activated → reviewer evaluates → In Progress → Completed | Critical cross-role, cross-page full-stack flow (the one must-have E2E) |
| TC-005 | Created review searchable in list | Create → search round-trip |
| TC-006 | Edit period/due/reviewer → "Successfully Updated" | Edit journey |
| TC-007 | Delete from list → "Successfully Deleted" | Delete + confirm dialog + row removal |
| TC-100 | Reviewer autocomplete shows only supervisors / "No Records Found" | UI wiring of the supervisors endpoint *(API is primary)* |
| TC-103 | Completed review renders read-only (no Save/inputs) | UI lock surface *(API is primary)* |
| TC-200 | ESS route guard on `/searchPerformanceReview` & `/saveReview` | Menu/route access is a rendered-UI concern |
| TC-300 | Empty Save → 5× "Required" | Client-side form validation wiring |
| TC-301 | Unbound free-typed employee rejected | Autocomplete binding validation |
| TC-303 | Reviewer required after employee chosen | Form validation |
| TC-304 | Malformed date rejected | Date-picker/field validation |
| TC-305 | Activate with missing fields blocked | Form validation (Activate path) |
| TC-306 | Cancel discards, no record | Navigation + no-side-effect |
| TC-500 | Empty list "No Records Found" | Page empty-state (route-mock the list endpoint) |
| TC-501 | Filter panel collapse/expand | UI state toggle |
| TC-502 | Date filters default to current year; Include default | Rendered defaults |
| TC-503 | Review Status dropdown lists exactly 4 states | Dropdown content render |
| TC-504 | Add form `*` markers + "* Required" + Cancel/Save/Activate | Form rendering |
| TC-505 | Reset restores filter defaults | UI state reset |
| TC-506 / TC-507 / TC-508 | Toasts / status-column lifecycle / loader-resolves | Cross-cutting UI; **fold into other E2E** rather than standalone (see Consolidation) |

---

## Decision Rationale (contested assignments)

- **Filters TC-106–110 moved E2E → API.** The scenarios marked these E2E, but each is purely *query-param correctness* (`jobTitleId`, `statusId`, `reviewerEmpNumber`, `includeEmployees`, `fromDate/toDate`). Testing them through the browser is the "input/filter validation at E2E" anti-pattern. One E2E (TC-005) already proves the dropdown→search→grid wiring; the per-filter correctness lives at API where it's faster and less flaky. The UI dropdown *content* (TC-503) stays E2E.
- **TC-102 (Save vs Activate initial state) moved E2E → API.** The state machine is server-side; `POST` response `statusId` is the authoritative check. TC-001/TC-002 already exercise the two buttons in the UI, so API is the right home for the state-assignment contract.
- **TC-101 (no-supervisor blocker) moved E2E → API.** The "blocker" is fundamentally the supervisors endpoint returning `[]`; asserting that at API is deterministic. The UI "No Records Found" presentation is already covered by TC-100's E2E half — no separate E2E needed.
- **TC-302 (end<start) moved E2E → API.** Date-order is a backend validation contract (422). Cheaper and more reliable at API. If the UI also blocks it client-side, that's incidental and covered by the TC-300-family form test.
- **Edge cases TC-400–406 moved E2E → API.** Boundary/uniqueness/pagination behaviors are data-shape questions answered by `POST`/list responses. Driving 50+ records or year-spanning dates through the browser is wasteful; API asserts them directly. (TC-404/TC-403/TC-401 are partly *characterization* tests — they document undefined behavior; API is the precise instrument for that.)
- **Security split: TC-200 E2E, TC-201–204 API.** Route/menu visibility (TC-200) is a rendered-UI guard → E2E. The actual authorization enforcement (403/401) is a backend contract backed by `getAccessiblePerformanceReviewIds()` → API. This is the textbook "error codes at API, not E2E" placement, and gives defense-in-depth across the menu and the endpoint.
- **TC-004 is the single mandatory full-stack E2E.** It's the only scenario that crosses Admin-create → reviewer-login → evaluate → complete across three pages and two roles; no lower layer can validate the lifecycle wiring. Keep exactly one such E2E; do not multiply.
- **TC-100 & TC-103 kept at both layers (defense-in-depth)** because each has a real backend invariant (supervisor scoping; completed-lock) AND a distinct UI surface (autocomplete options; read-only render) that can independently regress.
- **No Unit layer.** This feature exposes no client-side pure function — date comparison, status transitions, and filtering are all server-evaluated. Inventing a unit test here would test framework code, not the feature.

## Consolidation guidance (for `/generate-tests`)
- **One form-validation E2E** should cover TC-300, TC-301, TC-303, TC-304, TC-305 (all Add-form required/invalid variants) — they share the same page and fixtures.
- **One filter-panel E2E** should cover TC-501, TC-502, TC-503, TC-505 (expand → assert defaults & options → reset).
- **TC-506/507/508 are not standalone tests** — assert the toast inside TC-001/006/007, the status column inside TC-004, and the loader-wait as a shared helper convention (`waitForTableLoad`). Flagged so they aren't generated as thin redundant specs.
- **TC-500** route-mocks the list endpoint to `data:[]` (mirror `my-trackers` empty-state approach) so it doesn't depend on a truly empty instance.

## Anti-Patterns

**In the source scenarios (corrected here):**
- *Filter/query correctness at E2E* (TC-106–110, TC-302, TC-400–406, TC-102) — pushed to API.
- *Authorization codes at E2E* (TC-201–204 were UI-flavored) — pushed to API.
- *Thin redundant UI specs* (TC-506/507/508) — folded into journey tests.
- *Ice-cream cone*: source was ~95% E2E; rebalanced to 50/50 API/E2E with 0 wasted unit/component.

**In existing repo tests:**
- No Manage Reviews spec exists yet (`tests/performance/` has only `addKpis.spec.ts`, `myTarckers.spec.ts`) — greenfield, no legacy anti-patterns to unwind.
- `tests/performance/myTarckers.spec.ts` already models the correct **API-seed-then-UI-assert** pattern (seed employees/users/supervisor + tracker via `orangehrmAdminApi` fixtures in `beforeAll`, assert in UI). Reuse it for the supervisor-edge precondition rather than seeding through the browser.
- **Component gap (environmental, not a defect):** TC-300/301/303/304/305 (required-field validation) and TC-503/TC-504 (dropdown/form rendering) are *ideally* component tests, but the repo has no Vue component-test harness — only Playwright. They are assigned E2E as the lowest **available** adequate layer; if a component harness is later added, migrate these down.
