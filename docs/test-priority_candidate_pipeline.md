# Test Priority: Candidate Pipeline

**Feature**: Recruitment → Candidate Pipeline (status transitions on candidate profile)
**Generated**: 2026-05-24

---

## Priority Matrix

### P0 — Release-blocking (must pass before every release)

| TC | Title | Layer | Reason |
|----|-------|-------|--------|
| TC-001 | Full pipeline APPLICATION_INITIATED → HIRED | E2E | Core business flow; entire recruitment funnel |
| TC-006 | Hire — auto-creates PIM Employee record | E2E | Critical side-effect; broken HIRE = data loss in PIM |
| TC-200 | ESS user cannot perform pipeline actions (E2E) | E2E | Security; role boundary must hold in UI |
| TC-201 | API pipeline action returns 403 for ESS session | API | Security; API must enforce role check independently |
| TC-202 | Unauthenticated API pipeline action returns 401 | API | Security; auth boundary at API layer |
| TC-300 | Cannot shortlist a candidate who is already rejected | E2E | Data integrity; terminal states must be irreversible |

### P1 — High impact (run on every PR to Recruitment module)

| TC | Title | Layer | Reason |
|----|-------|-------|--------|
| TC-002 | Shortlist a candidate | E2E | First transition; blocks all downstream stages |
| TC-003 | Schedule an interview | E2E | Second transition |
| TC-004 | Mark interview as passed | E2E | Third transition |
| TC-005 | Offer job to candidate | E2E | Fourth transition |
| TC-100 | Reject at SHORTLISTED stage | E2E | Reject branch available at every stage |
| TC-101 | Mark interview as failed | E2E | Negative interview outcome branch |
| TC-102 | Decline job offer | E2E | Negative offer outcome branch |
| TC-104 | Hired candidate profile is read-only | E2E | Post-terminal state enforcement |
| TC-301 | API action with invalid action name returns 422 | API | Input validation at API boundary |
| TC-302 | API action on candidate in wrong state returns error | API | State machine enforcement at API layer |

### P2 — Moderate (run on scheduled nightly)

| TC | Title | Layer | Reason |
|----|-------|-------|--------|
| TC-007 | Reject at APPLICATION_INITIATED stage | E2E | Reject branch at earliest stage; lower risk duplication of TC-100 |
| TC-400 | Pipeline action with a long note is accepted | E2E | Edge case; notes field boundary |
| TC-401 | Hired candidate appears in PIM list with correct name | E2E | PIM linkage verification (TC-006 covers creation; this checks searchability) |
| TC-500 | Status badge reflects current pipeline stage | E2E | UI correctness; non-blocking but user-facing |
| TC-501 | Action area shows correct buttons for JOB_OFFERED | E2E | UI state — both Hire and Decline must be visible |
| TC-502 | Interview Scheduled stage shows Pass and Fail options | E2E | UI state — both options must be visible |

### P3 — Low / cosmetic (run weekly or on-demand)

| TC | Title | Layer | Reason |
|----|-------|-------|--------|
| TC-103 | Action button label matches current stage (all 5 stages in one test) | E2E | Redundant with P1 individual stage tests; kept as a sanity sweep |
| TC-105 | Notes field present on pipeline action modals | E2E | Visual check; notes are optional — missing textarea is cosmetic |
| TC-106 | Hire dialog shows candidate name for confirmation | E2E | UX check; dialog content, not functionality |

---

## Implementation Order for Step 4

Generate tests in priority order: P0 first, then P1, then P2.
P3 tests are excluded from initial implementation (they duplicate P0/P1 coverage).

**Tests to implement**: TC-001, TC-006, TC-200, TC-201, TC-202, TC-300, TC-002, TC-003, TC-004, TC-005, TC-100, TC-101, TC-102, TC-104, TC-301, TC-302 + TC-400, TC-500, TC-501, TC-502

**Total**: 20 tests (P0: 6 + P1: 10 + P2: 4 selected)

TC-007, TC-401 are in P2 but similar enough to P0/P1 that they can be included — both TC-007 (reject at APPLICATION_INITIATED) and TC-401 (PIM searchability) add distinct coverage.

**Final count**: 22 tests
