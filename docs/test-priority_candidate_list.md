# Test Priority: Candidate List & Filters

**Input**: `docs/test-strategy.md`
**Generated**: 2026-05-24
**Scope**: E2E tests only (P0 + P1 will be generated in code)

---

## P0 — Release-Blocking (must pass before any release)

| TC | Title | Rationale |
|----|-------|-----------|
| TC-200 | Unauthenticated access redirects to login | Security gate — core auth enforcement. A broken redirect = data breach risk. |
| TC-201 | ESS user has no Recruitment menu item | Security / role access — ESS must never reach Recruitment. Release-blocking compliance. |
| TC-202 | ESS user sees no Add/Edit/Delete controls even via direct URL | Security — defense-in-depth. UI must not expose admin controls to ESS even on direct URL. |
| TC-001 | Candidates list page loads with records and correct columns | Core page load — if the list doesn't render, the entire Recruitment workflow is broken. |
| TC-506 | Confirm delete removes candidate from list | Data integrity — delete must actually work and update the UI. |
| TC-006 | Add button navigates to Add Candidate page | Core navigation — entry point to creating candidates. Broken = no new candidates possible. |
| TC-007 | Edit button navigates to candidate profile | Core navigation — entry point to managing pipeline. Broken = no candidate progression. |

---

## P1 — High Business Impact (primary feature paths that must work for users)

| TC | Title | Rationale |
|----|-------|-----------|
| TC-002 | Filter by Job Vacancy | Primary filter — recruiters use this daily to scope their pipeline view. |
| TC-003 | Filter by Status | Primary filter — pipeline stage tracking is the core Recruitment workflow. |
| TC-004 | Filter by Keywords | Common search path — used to find candidates tagged with specific skills. |
| TC-005 | Reset clears all filters | Usability — broken reset leaves filters stuck; forces page reload; high user reach. |
| TC-100 | Date range filter (From Date / To Date) | Operational reporting — recruiters filter by application date range regularly. |
| TC-102 | Vacancy dropdown shows only active vacancies | Data integrity — closed vacancies must not pollute the filter dropdown. |
| TC-104 | Combined filters (Vacancy + Status) narrow results correctly | Multi-criteria search — most real-world filter scenarios combine at least two filters. |
| TC-105 | Record count banner reflects filtered result count | Usability — recruiters rely on the count to know how many candidates match. |
| TC-300 | No-match filter shows "No Records Found" | Empty state — critical UX; broken = blank page with no feedback (users assume error). |
| TC-301 | No filters → all candidates returned | Default state — must show full list on page load / after reset. |
| TC-504 | Delete confirmation dialog appears | UX safety — confirmation prevents accidental deletion; absence = immediate data loss risk. |
| TC-505 | Cancel delete → candidate remains | Data integrity — cancelling must be a no-op; failure destroys data unexpectedly. |

---

## P2 — Moderate Impact (secondary flows; workaround exists)

| TC | Title | Rationale |
|----|-------|-----------|
| TC-101 | Method of Application filter | Secondary filter — less commonly used than Vacancy/Status; admin can work around. |
| TC-103 | Status dropdown lists all pipeline statuses | Completeness check; missing status option is annoying but not a blocker (can type in workaround). |
| TC-400 | Special characters display correctly in name | Edge case for unusual names; affects small subset of users. |
| TC-500 | Page title/heading correct | Cosmetic; doesn't affect functionality. |

---

## P3 — Low Impact (cosmetic / rare edge cases)

| TC | Title | Rationale |
|----|-------|-----------|
| (none from E2E scope) | | TC-402 (pagination), TC-401 (date boundary), TC-403 (autocomplete) are deferred entirely |

---

## Generation Plan

**Generate code for**: P0 (7 tests) + P1 (12 tests) = **19 E2E tests total**

Test file: `tests/recruitment/candidates-list.spec.ts`
Page object: `src/pages/recruitment/CandidatesListPage.ts`
Test data constants: suite-owned vacancies + candidates created in `beforeAll`, cleaned in `afterAll`
