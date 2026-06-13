# Test Priority — Add Work Shift

**Input**: `docs/test-strategy_Add work shift.md` (E2E scenarios only)
Scope: prioritizes the **E2E** scenarios. P0 + P1 are generated as automated tests in Step 4.

---

## P0 — Release-blocking (core flow, security, data integrity)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-001 | Add work shift with required field only; toast + redirect + listed row | The primary reason the feature exists. If this breaks, the feature is unusable — no workaround. Folds TC-504 (toast/redirect) and TC-500 (default state visible at start). |
| TC-300 | Empty Shift Name shows "Required" and blocks save | Required-field enforcement is data integrity; a regression here lets nameless/garbage records be created. No workaround. |
| TC-200 | ESS user: no Admin menu; Work Shift deep links blocked | Authorization. A failure exposes admin config to non-admins — security/compliance, release-blocking. |
| TC-202 | Script payload in Shift Name stored inert (no XSS) | Stored-XSS would execute for every admin viewing the list — security-critical, no workaround. |

## P1 — High impact (primary paths, major behaviors, integrations)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-002 | Add with custom working hours (duration reflects) | Setting non-default hours is the main configurable purpose of a shift; high reach. |
| TC-102 | Duration Per Day auto-recalculates on time change | The headline computed behavior users rely on; wrong duration corrupts every downstream shift. |
| TC-100 | Duplicate shift name → inline "Already exists", save blocked | Uniqueness is a core data-integrity rule; duplicates confuse all consumers. High impact, primary guard. |
| TC-003 | Add with one assigned employee (chip + persisted empNumber) | Employee assignment is the key integration of this feature with PIM. |
| TC-303 | Duplicate-name error clears when name is corrected | Directly supports the primary create path after a common user mistake. |
| TC-502 | Cancel returns to list without creating a record | Primary escape path; a failure (accidental save / stuck form) has broad reach. |

## P2 — Moderate (secondary flows, common-path edges, workaround exists)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-004 | Add with multiple assigned employees | Extension of TC-003; multi-select is less common than single. |
| TC-302 | From ≥ To → Duration 0.00 (UI) | Important guard but an unusual user action; workaround is to enter valid times. |
| TC-301 | Whitespace-only name rejected | Edge of the required-field rule already covered by TC-300. |
| TC-405 | Remove an assigned-employee chip before saving | Secondary autocomplete interaction. |
| TC-501 | Autocomplete hint list populates from query | Supports TC-003/004; UI affordance, medium reach. |
| TC-503 | Empty list "No Records Found" state | Cosmetic-adjacent state, but a real first-run experience. |
| TC-505 | Time picker popup structure (hour/min/AM-PM) | Widget detail; underpins TC-002 but rarely fails independently. |

## P3 — Low / rare edge cases

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-304 | Invalid time-picker entry constrained | Rare; widget normally prevents bad input. |
| TC-400 | Maximum-length Shift Name | Boundary; low real-world frequency. |
| TC-401 | 1-minute shift (sub-hour duration rounding) | Rare boundary; cosmetic precision. |
| TC-402 | Near-24h span (12:00 AM → 11:59 PM) | Rare boundary. |
| TC-403 | From == To → 0.00 | Duplicate of TC-302's flooring behavior; rare. |
| TC-404 | Unicode / surrounding-space name | Rare; normalization nicety. |

---

## Summary
- **P0 (release-blocking)**: 4 — TC-001, TC-300, TC-200, TC-202
- **P1 (high impact)**: 6 — TC-002, TC-102, TC-100, TC-003, TC-303, TC-502
- **P2 (moderate)**: 7 — TC-004, TC-302, TC-301, TC-405, TC-501, TC-503, TC-505
- **P3 (low/cosmetic)**: 6 — TC-304, TC-400, TC-401, TC-402, TC-403, TC-404

**To be generated in Step 4 (P0 + P1)**: 10 scenarios.
