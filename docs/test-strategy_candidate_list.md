# Test Strategy: Candidate List & Filters

**Feature**: Recruitment → Candidates List (`/web/index.php/recruitment/viewCandidates`)
**Input**: `docs/test-scenarios.md`
**Generated**: 2026-05-24

---

## Test Pyramid Distribution

| Layer | Count | Focus | Avg Time |
|-------|-------|-------|----------|
| E2E | 22 | Full page navigation, OXD filter interactions, role-based access, table assertions | ~30s each |
| API | 2 | HTTP-level auth enforcement (ESS 403 on GET and DELETE) | ~2s each |
| Component | 0 | OXD design system tested by Vacancy/Candidate suites; no new components here | — |
| Unit | 0 | Filter logic is server-side PHP; no pure frontend functions to unit-test | — |

---

## Layer Assignments

### E2E Tests

| TC | Title | Rationale |
|----|-------|-----------|
| TC-001 | Page loads with records and correct columns | Full-stack: page render + DB read + Vue table render |
| TC-002 | Filter by Job Vacancy | OXD dropdown interaction + API call + table re-render — needs browser |
| TC-003 | Filter by Status | OXD dropdown + server-side filter — needs browser |
| TC-004 | Filter by Keywords | Text input + server filter — needs browser |
| TC-005 | Reset clears all filters | Multi-state UI interaction — needs browser |
| TC-006 | Add button navigates to Add Candidate | Navigation assertion — needs browser |
| TC-007 | Edit button navigates to candidate profile | Dynamic URL assert — needs browser |
| TC-100 | Date range filter | Two OXD date inputs + server filter — needs browser |
| TC-101 | Method of Application filter | OXD dropdown + server filter — needs browser |
| TC-102 | Vacancy dropdown shows only active vacancies | OXD dropdown option list assertion — needs browser |
| TC-103 | Status dropdown lists all pipeline statuses | OXD dropdown option enumeration — needs browser |
| TC-104 | Combined filters (Vacancy + Status) | Multi-param server query — needs browser |
| TC-105 | Record count reflects filtered results | UI state assertion — needs browser |
| TC-200 | Unauthenticated redirect | Full-stack: session middleware + redirect — needs browser |
| TC-201 | ESS user has no Recruitment menu item | Role-based UI rendering — needs browser |
| TC-202 | ESS user sees no Add/Edit/Delete controls | Role-based UI rendering — needs browser |
| TC-300 | No-match filter → "No Records Found" | Empty state UI — needs browser |
| TC-301 | No filters → all candidates returned | Default API query — needs browser |
| TC-400 | Special characters in candidate name display correctly | Encoding / Vue rendering — needs browser |
| TC-500 | Page title and heading correct | UI state — needs browser |
| TC-504 | Delete confirmation dialog | UI state — needs browser |
| TC-505 | Cancel delete → candidate remains | UI state + partial-flow — needs browser |
| TC-506 | Confirm delete → candidate removed | Destructive CRUD — needs browser |

### API Tests

| TC | Title | Rationale |
|----|-------|-----------|
| TC-203 | GET /recruitment/candidates returns 403 for ESS | Pure HTTP contract; no browser needed; bypasses OXD |
| TC-204 | DELETE /recruitment/candidates returns 403 for ESS | Pure HTTP contract |

### Deferred (not in E2E scope for this iteration)

| TC | Title | Reason |
|----|-------|--------|
| TC-401 | Boundary date inclusion | Brittle — depends on exact server date logic; not a user-visible regression risk |
| TC-402 | Pagination on large result set | Requires >50 candidate records; setup cost too high for this sprint |
| TC-403 | Candidate Name autocomplete | Autocomplete timing flakiness; covered by Add Candidate suite |
| TC-302 | From Date > To Date invalid range | OrangeHRM does not show a UI validation error (server returns empty result); covered by TC-300 |
| TC-501 | Column headers | Covered by TC-001 |
| TC-502 | Per-row Edit/Delete buttons | Covered by TC-007 and TC-504 |
| TC-503 | Record count updates | Covered by TC-105 |

---

## Decision Rationale

**TC-002–104 pushed to E2E (not API)**: The filter interactions involve OXD custom dropdowns — not native `<select>` elements. These cannot be exercised via raw API calls; the UI sends the filter params as query strings only after the browser-side Vue logic processes the dropdown selection. E2E is the only layer that can test the full user journey.

**TC-203 / TC-204 pushed to API (not E2E)**: HTTP status codes (403) are a server-side contract that doesn't require a rendered browser page. Asserting them at API layer is faster, more reliable, and more precise than navigating the OXD UI.

**TC-102 pushed to E2E (not API)**: Verifying that the *dropdown in the filter form* only shows active vacancies is a Vue component behavior that requires browser rendering. The API endpoint itself (`GET /recruitment/candidates?vacancyId=X`) accepts any ID — the filtering is done in the Vue component that populates the dropdown options.

---

## Anti-Patterns Found in Existing Tests (Reference)

- None critical found in `tests/recruitment/vacancies-list.spec.ts`. Patterns like `getRecordCount()` parsing "(N) Records Found" are reusable and will be carried into this suite via the new `CandidatesListPage` POM.

---

## References

- Domain skill: Recruitment → Candidates filter API — `GET /api/v2/recruitment/candidates?vacancyId, status, candidateName, keywords, methodOfApplication, fromDate, toDate`
- Existing pattern: `VacanciesListPage.ts` — `selectFromGroup()`, `getRecordCount()`, `waitUntilTableLoaderDissapear()`
- UI selectors: `ui-selectors.md` § Recruitment Module → Candidates List
