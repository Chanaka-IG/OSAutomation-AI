# Test Priority — Claim → Employee Claims

**Input:** `docs/test-strategy_Claim -> Employee Claims.md`
**Scope:** E2E-layer scenarios only (the priority that feeds `/generate-tests`). Pure-API-only scenarios — TC-103, TC-104, TC-202, TC-300, TC-302, TC-400, TC-402 — are out of scope here and belong to the API suite.
**Generation rule:** `/generate-tests` builds **P0 + P1** only.

---

## P0 — Release-blocking (core flow / security / data integrity)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-001 | Employee Claims list loads with all current-employee claims by default | If the page/default query is broken, the entire feature is unusable — no workaround. Core. |
| TC-002 | Search by Reference Id returns the matching claim | The primary lookup path admins use to find a specific claim. Highest-reach search. |
| TC-008 | View Details opens the claim detail page | Drill-down to a claim is the page's main purpose beyond listing; broken navigation blocks claim handling. |
| TC-200 | ESS user cannot open the Employee Claims page | Security: an ESS seeing all employees' claims is a data-exposure defect. No workaround. |
| TC-203 | Unauthenticated access redirects to login | Security/auth gate; protects the whole admin view. |

## P1 — High impact (primary feature path / high reach)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-003 | Search by Employee Name | Primary filter; the most common way to scope claims to one person. |
| TC-004 | Filter by Event Name | Primary filter; high admin usage for event-based reconciliation. |
| TC-005 | Filter by Status | Primary filter; admins routinely triage by lifecycle state (Submitted/Approved/Paid). |
| TC-009 | Reset clears all filters | Frequently used to return to the full list after filtering; broken reset traps the user in a stale view. |
| TC-106 | "(N) Records Found" matches the result total | Wrong counts erode trust in search results; high visibility. |
| TC-201 | "Employee Claims" hidden from ESS menu | Security-adjacent; confirms role-based menu gating beyond the route guard. |

## P2 — Moderate (secondary flows / edge of common paths)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-006 | Filter by submitted-date range | Useful but secondary; workaround is scanning the list. |
| TC-007 | Combined filters narrow results (Employee + Status) | Power-user path; individual filters already covered at P1. |
| TC-100 | Event dropdown lists only ACTIVE events (E2E spot-check) | Correctness rule; primary proof is at API, E2E is a confirmation. |
| TC-102 | Include defaults to "Current Employees Only" (E2E spot-check) | Sensible default; mis-default widens scope but is not release-blocking. |
| TC-105 | Default sort = Reference Id DESC (E2E spot-check) | Ordering convenience; semantics proven at API. |
| TC-501 | "No Records Found" empty state | Common path outcome; moderate impact if message missing. |
| TC-502 | "Records Found" count updates after search | Reflects live filtering; moderate UX impact. |

## P3 — Low / cosmetic (rare or easily bypassed)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-500 | Filter panel collapse/expand toggle | Cosmetic UI affordance; no data impact. |
| TC-503 | Loading state during search | Transient indicator; nice-to-have, easily bypassed. |

---

## Summary

| Priority | Count | Scenario IDs |
|----------|-------|--------------|
| **P0** | 5 | TC-001, TC-002, TC-008, TC-200, TC-203 |
| **P1** | 6 | TC-003, TC-004, TC-005, TC-009, TC-106, TC-201 |
| **P2** | 7 | TC-006, TC-007, TC-100, TC-102, TC-105, TC-501, TC-502 |
| **P3** | 2 | TC-500, TC-503 |
| **Total (E2E)** | 20 | |

**For generation (P0 + P1): 11 E2E tests.**
