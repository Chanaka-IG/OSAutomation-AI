# Test Priority — Directory Module (E2E scenarios)

> Input: `docs/test-strategy_Directory.md` — E2E-layer scenarios only (20).
> Priority drives generation order: `generate-tests` implements **P0 + P1 only**; P2/P3 remain documented backlog.

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Landing page lists all active employees with count + cards | Core render path of the module — if this fails the module is unusable for every user; no workaround |
| TC-002 | Search by employee name via hint selection (incl. singular "(1) Record Found") | The primary purpose of a directory is finding a person; core business flow |
| TC-200 | Unauthenticated access redirects to login | Security/compliance — employee data must not render without a session |
| TC-202 | ESS user has full directory read access (incl. Directory menu item) | Highest user reach (every employee uses ESS); also validates role gating works as designed |
| TC-300 | Free-typed unselected name blocks search with "Invalid" | Data-integrity of search semantics — without it search silently misleads (appears to search free text but doesn't); request never fires so only this layer catches it |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-003 | Job Title filter returns only matching employees | Primary filter path; needs seeded job details — most realistic regression risk after release |
| TC-004 | Location filter returns only matching employees | Same primary filter path |
| TC-006 | Card click opens detail panel with work contact info | The "contact a colleague" payoff of the directory — second-most-used journey |
| TC-007 | Reset clears filters and restores full list | Primary recovery path users hit constantly |
| TC-101 | Name hints show matching employees while typing (+ TC-403 case-insensitive) | Gateway to TC-002 — broken hints = broken search |
| TC-301 | No-match search shows "No Records Found" empty state | Common user outcome; misleading empty state has high support cost |
| TC-500 | Default state — placeholders, "-- Select --", populated grid | Cheap guard asserting the page contract every run |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-008 | Back arrow closes detail panel | Secondary interaction; workaround = navigate away/re-enter |
| TC-102 | Job Title dropdown options match Admin config | Config-to-UI plumbing; failure visible but filter itself covered by TC-003 |
| TC-103 | Location dropdown options match Admin config | Same as TC-102 |
| TC-105 | Card hides subtitle/body when job data null | Conditional render polish; data still reachable via detail panel |
| TC-106 | Contact rows render only for populated fields | Conditional render; wrong-but-harmless display risk |
| TC-304 | Hint dropdown shows "No Records Found" on no match | Edge of TC-101; empty hint state |
| TC-404 | Search with all filters empty reloads full list | Edge of common path; Reset (TC-007) covers the recovery story |
| TC-502 | Detail panel switches content between cards | Secondary stateful interaction |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-401 | Card name renders First + Middle + Last | Cosmetic text composition; data correctness covered at API (TC-107) |

## Contested calls
- **TC-300 at P0, not P2**: looks like a minor validation, but the field *silently ignores* free text — a regression here makes Search appear to filter while returning everything, i.e. wrong results with no error. That's a correctness failure of the core flow, so it rides with P0.
- **TC-202 at P0, not P1**: directory is one of only 8 ESS menu items; an ESS regression locks out ~all non-admin users. Reach trumps the "it's just read-only" instinct.
- **TC-500 at P1, not P3**: individually cosmetic assertions, but as the suite's opening smoke test it fails fast and cheap on any page-level breakage — high diagnostic value per millisecond.
- **TC-101 at P1, not P0**: TC-002 already exercises hints end-to-end; TC-101 isolates the hint list itself for debuggability. Defense-in-depth, not release-blocking on its own.

## Generation scope
- **Implement now (P0+P1): 12 E2E tests** → TC-001, TC-002, TC-200, TC-202, TC-300, TC-003, TC-004, TC-006, TC-007, TC-101(+403), TC-301, TC-500
- **Backlog (P2): 8** | **Backlog (P3): 1**
- API-layer scenarios (9) are out of scope for this E2E priority list; see strategy doc.
