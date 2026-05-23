# Test Strategy: Add Vacancies — OrangeHRM Open Source

> **Input**: `docs/test-scenarios.md` (50 scenarios, TC-001 to TC-510)
> **Feature**: Recruitment → Vacancies → Add Vacancy
> **Generated**: 2026-05-23
> **Framework**: Playwright (TypeScript) — `tests/recruitment/`

---

## 1. Distribution Summary

| Layer | Count | Primary Focus | Est. Time / Test | Total Est. |
|-------|------:|---------------|-----------------|-----------|
| **E2E** | 27 | Full user flows, OXD interactions, UI state, rendering | 15–30 s | ~12 min |
| **API** | 23 | Contracts, auth/CSRF, FK validation, boundary values | 1–3 s | ~1 min |
| **Component** | 0 | No isolated Vue component tests warranted here | — | — |
| **Unit** | 0 | No pure functions outside ORM/framework code | — | — |
| **Total** | **50** | | | **~13 min** |

> 3 scenarios are tested at **both E2E and API** (defense-in-depth for critical rules).
> Merge: TC-507 is identical to TC-310 — implement once, referenced twice.

---

## 2. Layer Assignments

### 2a. E2E Tests (Playwright, `tests/recruitment/add-vacancy.spec.ts`)

These require a real browser because they verify OXD component behavior, multi-page navigation, or visual rendering that the API alone cannot prove.

| TC | Title | Rationale |
|----|-------|-----------|
| TC-001 | Add vacancy — required fields only | Full save flow: navigate → fill → OXD dropdown/autocomplete → toast → list verify |
| TC-002 | Add vacancy — all fields (description, isPublished, status) | All optional fields, toggle states, verify list row attributes |
| TC-007 | Created vacancy appears in Candidate filter | Cross-page FK reference visible in OXD dropdown — must be E2E |
| TC-100 | Job Title is a constrained OXD dropdown | Verifying the control is a non-free-text OXD select, not a text input |
| TC-101 | Hiring Manager autocomplete shows only employees | OXD autocomplete suggestion behavior (`oxd-autocomplete-dropdown`) |
| TC-102 | Terminated employee excluded from autocomplete | Combines API seed + E2E observation of autocomplete suggestions |
| TC-105 | Published vacancy visible on public job site | Requires browser navigation to the public page |
| TC-106 | Closed vacancy absent from Candidate Vacancy dropdown | OXD dropdown filter on Add Candidate form |
| TC-200 | ESS user — Recruitment menu not visible | Menu item presence/absence assertion in browser DOM |
| TC-201 | ESS user — direct URL /recruitment/viewVacancies blocked | Browser navigation test, verify no Add button or data rendered |
| TC-205 | XSS probe in Vacancy Name — no script executes | Must run in a real browser context; dialog-fired assertion pattern (matches `add-employee.spec.ts:421`) |
| TC-300 | Submit empty form — all required fields show "Required" | All four inline errors visible simultaneously |
| TC-301 | Save without Vacancy Name | Single field inline error |
| TC-302 | Save without Job Title | Single field inline error |
| TC-303 | Save without Hiring Manager | Single field inline error |
| TC-304 | Positions = 0 — inline validation visible | Client-side range check displayed in OXD; TC-305 covers the same rule at API |
| TC-310 | Cancel returns to list; no record created | UX navigation, record count unchanged *(TC-507 is a duplicate — do not implement separately)* |
| TC-311 | Autocomplete — "No Records Found" for unmatched string | OXD autocomplete empty-state rendering |
| TC-405 | Special characters in Vacancy Name render correctly | Server round-trip + DOM rendering; not testable at API alone |
| TC-406 | Leading/trailing whitespace — observe trim behavior | Rendered value in list vs. raw input; OXD behavior |
| TC-408 | Job Title dropdown empty when no Job Titles exist | OXD empty dropdown state |
| TC-409 | Hiring Manager autocomplete empty when no employees | OXD empty autocomplete state |
| TC-500 | Vacancies list — empty state "No Records Found" | Table empty-state DOM node |
| TC-502 | Inline "Required" error fires on blur (not just Save) | OXD real-time re-validation event |
| TC-503 | Job Title dropdown lists all existing job titles | OXD option count vs. seeded data |
| TC-504 | Hiring Manager autocomplete filters as user types | OXD suggestion list narrows on each keystroke |
| TC-509 | Record count increments after save | `(N) Records Found` assertion before/after |

> **TC-501 (Success toast)** — covered by TC-001. Do not add a separate test; the toast is always asserted in the save flow.
> **TC-505 (Loading spinner)** — covered by `BasePage.waitUntilTableLoaderDissapear()`. Assert this utility is called; do not add a standalone test.
> **TC-506 (Pagination)** — low-signal for "add vacancy" scope; belongs in a Vacancy List read test, not the add flow.
> **TC-507** — duplicate of TC-310.
> **TC-508 (Error clears on valid input)** — folded into TC-300 suite as an additional assertion step (no extra test needed).
> **TC-510 (Navigation flow)** — folded as a `beforeEach` navigation in TC-001.

---

### 2b. API Tests (Playwright `request` context, `tests/api/recruitment-vacancies.spec.ts`)

These test HTTP contracts, auth enforcement, FK validation, and boundary values. Faster and more reliable than E2E for server-side rules.

| TC | Title | Endpoint | Rationale |
|----|-------|----------|-----------|
| TC-003 | POST with status=Active persists correctly | `POST /recruitment/vacancies` | Data field persistence — no browser needed |
| TC-004 | POST with status=Closed persists correctly | `POST /recruitment/vacancies` | Same as TC-003 |
| TC-005 | POST with numOfPositions=50 persists | `POST /recruitment/vacancies` | Large value stored; verified via GET |
| TC-006 | POST API contract — all required fields | `POST /recruitment/vacancies` | Response envelope shape: `{ data: { id, name, ... } }` |
| TC-102† | Terminated employee rejected as hiringManagerId | `POST /recruitment/vacancies` | API returns 422; paired with E2E autocomplete check |
| TC-103† | Duplicate vacancy name → 422 "Already exists" | `POST /recruitment/vacancies` | Same uniqueness rule tested at API (defense-in-depth) |
| TC-104 | numOfPositions = 0 → 422 validation error | `POST /recruitment/vacancies` | Backend constraint; faster than E2E form fill |
| TC-107 | DELETE job-title blocked while vacancy references it | `DELETE /admin/job-titles` | FK integrity check, HTTP 422 |
| TC-202 | ESS session → POST vacancies → HTTP 403 | `POST /recruitment/vacancies` | Role enforcement on API, matches pattern in `pim-employees.spec.ts:21` |
| TC-203 | No session → GET vacancies → HTTP 401 | `GET /recruitment/vacancies` | Unauthenticated rejection |
| TC-204 | Missing X-CSRF-Token → 401 Invalid CSRF token | `POST /recruitment/vacancies` | CSRF enforcement on mutation |
| TC-206 | SQL injection string saved as literal / rejected | `POST /recruitment/vacancies` | Parameterized ORM; verify via GET response (no DB error) |
| TC-207 | CSRF token from session A rejected with session B | `POST /recruitment/vacancies` | Session-scoped CSRF binding |
| TC-305 | numOfPositions = -1 → 422 | `POST /recruitment/vacancies` | Negative integer constraint |
| TC-306 | Duplicate name via direct API → 422 | `POST /recruitment/vacancies` | Same as TC-103 but targeting the raw API path directly |
| TC-307 | Non-existent jobTitleId → 422/404 | `POST /recruitment/vacancies` | FK integrity |
| TC-308 | Non-existent hiringManagerId → 422/404 | `POST /recruitment/vacancies` | FK integrity |
| TC-309 | numOfPositions = "abc" (string) → 422 | `POST /recruitment/vacancies` | Type coercion / validation |
| TC-400 | Name at exact max length → 200 | `POST /recruitment/vacancies` | Boundary: accept |
| TC-401 | Name over max length → 422 | `POST /recruitment/vacancies` | Boundary: reject |
| TC-402 | numOfPositions = 1 (minimum) → 200 | `POST /recruitment/vacancies` | Boundary: accept |
| TC-403 | numOfPositions = 9999 (large) → 200 | `POST /recruitment/vacancies` | Boundary: accept (no documented cap) |
| TC-404 | Whitespace-only name → 422 "Required" | `POST /recruitment/vacancies` | Server-side trimming / required check |
| TC-407 | numOfPositions = 1.5 (decimal) → 422 | `POST /recruitment/vacancies` | Integer-only field |
| TC-410 | Description at max length → 200 | `POST /recruitment/vacancies` | Boundary: accept |
| TC-411 | POST without optional description field → 200 | `POST /recruitment/vacancies` | Optional field omission; `description: null` in response |

> † TC-102 and TC-103 are tested at both E2E and API. This is intentional defense-in-depth for the two highest-risk business rules (employee exclusion, name uniqueness).

---

## 3. Decision Rationale for Contested Assignments

These are scenarios where the original `Suggested Layer` in `test-scenarios.md` was changed:

### TC-003, TC-004, TC-005 — Moved from E2E → API
**Original suggestion**: E2E. **Decision**: API.

Verifying that a saved record has `status: true/false` or `numOfPositions: 50` is a persistence check. It requires calling `GET /recruitment/vacancies` and inspecting the JSON response — no browser interaction is needed. Running these at E2E adds 25–30 seconds each for zero additional confidence.

### TC-103 / TC-306 — Tested at Both Layers (Defense-in-Depth)
**TC-103 (E2E)**: Verifies the error **toast** and the **form stays on the same URL** — browser-only signals.
**TC-306 (API)**: Verifies the HTTP 422 status code and `"data.name": "Already exists"` body — API contract.
Both are needed: the E2E test confirms the user sees an error; the API test confirms the server returns a spec-compliant error response. A refactor of the toast could break TC-103 without affecting TC-306, and vice versa.

### TC-104 — Moved from E2E → API; TC-304 Stays E2E
The rule "numOfPositions ≥ 1" exists at two layers: client validation (TC-304, tested via OXD inline error visible in DOM) and server validation (TC-104, tested via HTTP 422). Both are tested. TC-104 is at API because the constraint is enforced server-side and the 422 body is the authoritative signal.

### TC-400, TC-401, TC-402, TC-403, TC-410 — Moved from E2E → API
All are pure boundary values on data fields. The OXD input field enforces `maxlength` as a DOM attribute, but the authoritative constraint lives in the backend PHP service. API tests are faster (< 2 s), deterministic, and test the actual guard rather than the HTML `maxlength` attribute. If a UI-level `maxlength` check is desired, add a single E2E assertion on the field's `maxlength` attribute in the TC-502 blur-validation test rather than separate test cases.

### TC-404 (Whitespace-only name) — API
Trimming logic lives in the PHP service layer. A browser test cannot distinguish between "client trim before submit" vs. "server trim after receive." The API test sends raw whitespace and asserts the server's response, which is the definitive behavior.

### TC-501 (Success toast) — Removed as standalone
Folded into TC-001. Playwright best practices doc states: "No assertions after every action" is an anti-pattern, and the inverse equally holds: duplicate assertion layers inflate test counts. The toast is a first-class assertion in every save test already.

### TC-507 — Removed (duplicate of TC-310)
Both scenarios: navigate to Add Vacancy → fill data → click Cancel → assert no record in list. One implementation covers both.

---

## 4. Anti-Patterns Found in Existing Tests

### 4a. `tests/recruitment/recruitment.spec.ts` — Critically Thin Coverage
The only test in this file is a route-load check:
```typescript
test('candidates route loads', async ({ recruitmentModulePage }) => {
  await recruitmentModulePage.openCandidates();
  await expect(recruitmentModulePage.page).toHaveURL(...);
});
```
**Problem**: No positive flows, no negative validation, no vacancy tests at all. The `RecruitmentModulePage` (`src/pages/recruitment/RecruitmentModulePage.ts:7`) only exposes `openCandidates()` — no vacancy navigation, no form methods. The new `add-vacancy.spec.ts` and a companion `AddVacancyPage` POM must fill this gap.

### 4b. `tests/pim/add-employee.spec.ts:432` — Arbitrary Timeout in XSS Test
```typescript
await page.waitForTimeout(2_000);  // Anti-pattern per playwright-best-practices.md §11
```
**Problem**: Flaky on slow CI, wastes time on fast runs. The test should instead use `expect(dialogFired).toBe(false)` after an event listener — no sleep needed. The dialog listener is already wired at line 421; remove the sleep.
**Fix**: Replace with `await expect(page.locator('.oxd-toast--error')).not.toBeVisible({ timeout: 3_000 })` or simply assert `dialogFired` immediately (the listener fires synchronously).

### 4c. `tests/pim/add-employee.spec.ts` — Input Validation Tested Only at E2E
Required field validation (TC-PIM-AE-N02, N03, N04, N06–N09) is tested exclusively at E2E. For add-vacancy, this strategy moves the API-layer numeric constraint (`numOfPositions = 0/-1/decimal`) to API tests and keeps only the **inline OXD error display** at E2E — consistent with the test pyramid.

### 4d. `tests/api/pim-employees.spec.ts` — Missing Vacancy API Counterpart
The file establishes the pattern for API tests (no-session 401, admin session 200, filter, duplicate 422). No equivalent exists for `/recruitment/vacancies`. `tests/api/recruitment-vacancies.spec.ts` should mirror this structure using a `VacanciesApi` service class under `src/api/orangehrmOSAPI/VacanciesApi.ts`.

### 4e. `tests/leave/leave.spec.ts` — Route-Load-Only Pattern
Same issue as recruitment.spec.ts — a single route-load test with no feature coverage. Flag for the Leave test sprint; not in scope here.

---

## 5. File Map — Where to Implement

```
tests/
├── recruitment/
│   └── add-vacancy.spec.ts          ← NEW (27 E2E tests)
├── api/
│   └── recruitment-vacancies.spec.ts ← NEW (23 API tests)

src/
├── pages/recruitment/
│   ├── RecruitmentModulePage.ts      ← EXTEND: add openVacancies()
│   └── AddVacancyPage.ts             ← NEW POM (form interactions)
├── api/orangehrmOSAPI/
│   └── VacanciesApi.ts               ← NEW API helper (mirrors EmployeesApi pattern)
test-data/
└── frontend/
    └── recruitment.ts                ← EXTEND: add vacancy routes, test data constants
```

---

## 6. Prerequisite Data & Setup

Add a `beforeAll` hook in `add-vacancy.spec.ts` that ensures:
1. At least one **Job Title** exists (reuse `JobTitlesApi` from `src/api/orangehrmOSAPI/JobTitlesApi.ts`)
2. At least one **active Employee** exists to act as Hiring Manager (reuse `ensureEmployeeRecords`)
3. A **terminated Employee** exists for TC-102 (seed via `EmployeesApi` + termination endpoint)
4. A **pre-existing vacancy** named `"Duplicate Test Vacancy"` for TC-103/TC-306 uniqueness tests (seed via API in `beforeAll`, delete in `afterAll`)

Unique vacancy names in tests must use `Date.now()` suffix (matching the pattern in `add-employee.spec.ts:93`):
```typescript
const vacancyName = `Test Vacancy ${Date.now()}`;
```

---

## 7. Test Pyramid Check

```
          /\
         /E2E\       27 tests  ← Critical flows, OXD UI, rendering
        /------\
       / API   \     23 tests  ← Contracts, auth, constraints, boundaries
      /----------\
     / Component \ 0 tests    ← No isolated OXD component tests needed here
    /------------\
   /    Unit      \ 0 tests   ← PHP business logic not accessible via JS test runner
  /-----------------\
```

**Shape**: Pyramid ✓ (wide API base, narrower E2E peak). No ice-cream cone inversion.
