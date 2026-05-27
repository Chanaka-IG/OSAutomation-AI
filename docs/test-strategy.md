# Test Strategy: Add Entitlements

> Feature: Leave → Entitlements → Add Entitlements
> Generated: 2026-05-26
> Source: docs/test-scenarios.md

---

## Distribution Table

| Layer     | Count | Focus                                          | Avg Time  |
|-----------|-------|------------------------------------------------|-----------|
| E2E       | 22    | Full user journeys, UI state, role access      | 15–30 s   |
| API       | 3     | Security enforcement, contract validation      | < 1 s     |
| Component | 0     | N/A (OXD components are third-party)           | —         |
| Unit      | 0     | No pure business logic in frontend             | —         |

**Total: 25 scenarios**

---

## Layer Assignments

### E2E Tests

| TC     | Title                                              | Rationale                                                                                       |
|--------|----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| TC-001 | Add entitlement to single employee (Individual)    | Full-stack journey: form fill → API call → DB write → toast feedback. Must verify end-to-end.  |
| TC-002 | Bulk Assign by Sub Unit                            | Multi-step flow: toggle mode → filter → save → modal → confirm → verify affected employees.    |
| TC-003 | Bulk Assign by Location                            | Same bulk flow pattern with different filter dimension.                                         |
| TC-004 | Bulk Assign by Job Title                           | Same bulk flow; different filter. Keeps modal confirmation verified across filter types.         |
| TC-005 | Entitlement reflects in employee leave balance     | Cross-page verification: Add → navigate to Employee Entitlements → assert balance. Needs E2E.  |
| TC-006 | Add entitlement with decimal days                  | Decimal precision involves DB storage and UI display — needs full stack verification.           |
| TC-100 | Without entitlement, balance is 0.00               | Business rule verification via UI read; requires navigation to entitlements list.               |
| TC-101 | Leave Period auto-populates with current period    | UI default state — rendered by Vue component binding. E2E is appropriate.                       |
| TC-102 | Bulk confirm modal shows employee count            | Involves API query for employee count + Vue modal rendering. Needs E2E.                         |
| TC-103 | Entitlement is per employee per leave type/period  | Duplicate-entry behavior must be observed through the full save cycle.                          |
| TC-104 | Cancel on bulk modal aborts save                   | Interaction test: modal dismiss → verify no API call committed. E2E with network assertion.     |
| TC-200 | ESS user cannot access Add Entitlements page       | Role-based UI rendering + redirect behavior. E2E verifies both menu and direct URL access.     |
| TC-202 | Admin cannot select non-existent leave type        | OXD dropdown enforces options client-side. Component-level; E2E confirms it in context.         |
| TC-300 | Submit with no employee selected                   | Required field validation (client-side on OXD). Pushed down rationale below. *(see note)*      |
| TC-301 | Submit with no leave type selected                 | Required field validation — OXD input-group error message. *(see note)*                        |
| TC-302 | Submit with entitlement = 0                        | Boundary + validation. *(see note)*                                                             |
| TC-303 | Submit with negative entitlement                   | Boundary validation. *(see note)*                                                               |
| TC-304 | Submit with non-numeric entitlement                | Type validation rendered by OXD. *(see note)*                                                   |
| TC-307 | Submit all fields blank                            | All-required-fields smoke test; single E2E covers the whole form.                               |
| TC-400 | Entitlement = 1 day                                | Boundary value; confirmed by DB persistence + UI read-back. Needs E2E.                         |
| TC-401 | Entitlement = 365 days                             | Upper boundary; needs DB save + display verification.                                           |
| TC-500 | Toggle Individual/Multiple mode changes fields     | Vue reactive form field visibility. E2E confirms the toggle works in real browser.              |
| TC-501 | Leave Period dropdown lists available periods      | Dropdown options sourced from API; E2E verifies the full cycle.                                 |
| TC-502 | Employee autocomplete filters correctly            | OXD autocomplete + API `/pim/employees` call. E2E verifies dropdown behavior.                  |
| TC-503 | Success toast appears                              | OXD toast component + reactive state. E2E confirms full success flow.                          |

> **Note on TC-300–304 (validation at E2E):** These ARE input validation tests, which the test pyramid normally pushes to unit/API. However, in OrangeHRM/OXD, required-field and type validation is implemented in Vue component validators and rendered by the OXD input-group error message — there is no separate unit-testable function exposed. The backend also validates these and returns 400 (covered by TC-201 API test). The E2E tests here catch regressions in the Vue-layer validation and are fast (single-page, no navigation) — acceptable as a pragmatic tradeoff.

---

### API Tests

| TC     | Title                                        | Rationale                                                                                 | Endpoint                              |
|--------|----------------------------------------------|-------------------------------------------------------------------------------------------|---------------------------------------|
| TC-201 | ESS user cannot call Add Entitlement API     | Security rule must be enforced at the API layer independently of the UI. Pure API test.  | `POST /api/v2/leave/leave-entitlements` |
| TC-305 | Bulk assign with no filter (all employees)   | Confirming behavior boundary — API contract for empty filter payload.                    | Bulk assign API endpoint              |
| TC-306 | Bulk assign matching 0 employees             | Edge state in API response when filter returns empty set. API contract test.              | Bulk assign API endpoint              |

---

### Downgraded / Deferred Scenarios

| TC     | Original Layer | Decision | Reason |
|--------|---------------|----------|--------|
| TC-402 | E2E           | Deferred | Past leave period assignment is a historical data-entry edge case. Low risk; can be manual. |
| TC-403 | E2E           | Deferred | Decimal precision beyond 0.5 is cosmetic; TC-006 covers the fractional path. |
| TC-404 | E2E           | Deferred | Combined filter (AND logic) is best verified via API payload inspection, not yet in scope. |
| TC-504 | E2E           | Deferred | Post-save form reset is a UX polish item; not a functional regression risk. |
| TC-505 | E2E           | Deferred | Modal dismiss is covered by TC-104; duplicate not needed. |

---

## Anti-Patterns Flagged

1. **TC-300–304 at E2E** — acknowledged tradeoff above. Acceptable given OXD encapsulation.
2. **TC-201 at API only** — UI-layer security (TC-200) AND API-layer security (TC-201) both needed for defense-in-depth. Not a pyramid violation — intentional multi-layer coverage.
3. No pure unit tests — consistent with OrangeHRM's architecture (business logic is in PHP/Symfony backend, not in the Vue frontend).

---

## Defense-in-Depth Matrix

| Business Rule             | E2E | API | Unit |
|--------------------------|-----|-----|------|
| ESS cannot add entitlement | TC-200 | TC-201 | — |
| Required fields enforced  | TC-300/301/307 | (400 on bad payload) | — |
| Positive value only       | TC-302/303 | — | — |
| Bulk confirm before commit | TC-102/TC-104 | — | — |
