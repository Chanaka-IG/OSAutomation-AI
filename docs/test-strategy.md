# Test Strategy: PIM Reports

**Input**: `docs/test-scenarios.md`  
**Module**: PIM → Employee Reports  
**Framework**: Playwright + TypeScript (E2E), Playwright APIRequestContext (API)

---

## Distribution Table

| Layer      | Count | Focus                                          | Avg Time |
|------------|-------|------------------------------------------------|----------|
| E2E        | 26    | Full user flows, navigation, form interactions | 10–30s   |
| API        | 4     | Auth enforcement, idempotent CRUD contracts    | <2s      |
| Component  | 0     | OXD component logic covered by E2E             | –        |
| Unit       | 0     | No pure functions in PIM Reports feature       | –        |

**Total**: 30 test cases

---

## Layer Assignments

### E2E Tests (Playwright, `tests/pim/`)

| TC ID    | Title                                                            | Rationale                                                         |
|----------|------------------------------------------------------------------|-------------------------------------------------------------------|
| TC-001   | Navigate to PIM Reports via top menu                            | Full-stack nav flow — must verify menu wiring and URL routing     |
| TC-002   | Default PIM Sample Report exists                                | Data integrity check visible only via rendered UI                 |
| TC-003   | Add minimal report (name only)                                  | Core create happy path — submit form, verify toast + list         |
| TC-004   | Add report with one Selection Criteria                          | Verifies Add icon commit behaviour for criteria                   |
| TC-005   | Add report with one Display Field                               | Verifies group → field → Add icon flow                            |
| TC-006   | Add full report (all sections)                                  | Complete form happy path                                          |
| TC-007   | View report data via document icon                              | Multi-page flow: list → view → assert data rendered               |
| TC-008   | Edit existing report name                                       | Update flow with redirect and toast verification                  |
| TC-009   | Delete a user-created report                                    | Delete flow with count assertion                                  |
| TC-010   | Search by name returns matching report                          | Filter + search flow                                              |
| TC-011   | Search with no match returns empty state                        | Empty state UI assertion                                          |
| TC-012   | Reset search restores full list                                 | Reset interaction                                                 |
| TC-100   | Report Name is mandatory (save without name shows Required)     | Client-side validation — must see inline error in rendered DOM    |
| TC-101   | Selection Criteria not committed without Add click              | Non-obvious two-step UX — only verifiable via round-trip edit     |
| TC-102   | Display Field not committed without Add click                   | Same two-step UX pattern                                          |
| TC-103   | Include dropdown defaults to "Current Employees Only"           | Default state assertion on rendered OXD dropdown                  |
| TC-105   | Multiple selection criteria added and persisted                 | Repeated interaction pattern + edit round-trip                    |
| TC-106   | Multiple display fields from different groups                   | Cross-group field selection + report view column assertion        |
| TC-107   | Remove display field via × button                               | In-place DOM removal interaction                                  |
| TC-200   | ESS user cannot access PIM Reports                              | Role-based access — full login + nav required                     |
| TC-201   | Unauthenticated access to list redirects to login               | Session guard on server-rendered redirect                         |
| TC-300   | Save with blank Report Name shows "Required" error              | Required-field validation                                         |
| TC-301   | Cancel returns to list without saving                           | Navigation guard — no side effect                                 |
| TC-402   | Duplicate report name shows error                               | Unique constraint — surfaced as toast or inline error             |
| TC-404   | XSS probe in Report Name does not execute                       | Security — must observe rendered DOM and dialog events            |
| TC-505   | View report shows name heading + employee data rows             | Report output rendering — requires real browser DOM               |

### API Tests (Playwright APIRequestContext, `tests/api/`)

| TC ID    | Title                                                            | Rationale                                                         |
|----------|------------------------------------------------------------------|-------------------------------------------------------------------|
| TC-202   | Unauthenticated GET reports list returns 401/403                | HTTP contract — faster at API layer; no browser needed            |
| TC-203   | Unauthenticated GET view report returns 401/403                 | PII data guard — API layer is the right enforcement point         |
| TC-204   | ESS session cannot GET report list (403)                        | Cross-role API access — verifiable via status code alone          |
| TC-402-a | Duplicate report name via API POST returns 422 "Already exists" | Unique constraint — API contract test; faster than UI round-trip  |

---

## Decision Rationale for Contested Assignments

**TC-101 / TC-102 — "Add icon not clicked" → E2E (not API)**  
The two-step UX (select from dropdown, then click Add to commit) is a frontend Vue component state management behaviour. There is no API-level concept of "uncommitted selections" — the backend only sees the final POST payload. The correct test layer is E2E to verify that selections not confirmed via Add are silently dropped.

**TC-104 — "Include filter affects record count" → Dropped from E2E priority**  
This requires a terminated employee in the test environment. It is better covered as an API test against `GET /pim/employees?includeEmployees=onlyCurrent` vs `currentAndPast`. Excluded from the E2E layer to avoid environment dependency; added as a note for future API coverage.

**TC-108 — "Include Header checkbox" → Dropped to P3**  
The Include Header checkbox affects report visual output but does not change data integrity. Low business risk; cosmetic. Kept as P3 edge case.

**TC-400 / TC-401 — Character limit** → E2E (boundary)  
The exact max length for Report Name is not documented in the domain skill. Browser testing is required to discover the real limit via OXD input behaviour. Assigned E2E + noted for discovery.

---

## Anti-Patterns Identified in Existing Tests

None of the existing PIM tests (`add-employee.spec.ts`, `employee-list.spec.ts`) cover the Reports sub-page. No anti-patterns inherited. New tests must follow the established patterns:
- Import `test`, `expect` from `../../src/fixtures`
- Use `test.describe.configure({ mode: 'serial' })`
- Clean up created data in `afterAll`
- Use `loginPage.loginAs('admin')` in `beforeEach`
