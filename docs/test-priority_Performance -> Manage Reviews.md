# Test Priority — Performance → Manage Reviews

**Input:** `docs/test-strategy_Performance -> Manage Reviews.md` (E2E-assigned scenarios)
**Scope:** Priority for the **E2E** scenarios only (23). API-only scenarios (TC-101, TC-102, TC-104–110, TC-201–204, TC-302, TC-400–406) are out of scope here. TC-100 & TC-103 appear here for their **E2E half** (UI surface); their contract half lives at API. TC-506/507/508 were folded into journey tests by the strategy and are not standalone — noted under each absorbing case.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-004 | Full lifecycle: create → activate → reviewer evaluates → In Progress → Completed | The core business flow of the whole feature; cross-role, cross-page, no lower layer can validate it. If this breaks, performance reviews are non-functional and there is no workaround. |
| TC-001 | Admin creates a review (Save → Inactive) | Primary entry point — every review begins here. A create failure blocks the entire module. Absorbs the TC-506 success-toast check. |
| TC-200 | ESS cannot access the Manage Reviews admin page | Security/authorization. An ESS reaching the admin create/list page is a compliance defect exposing other employees' review data; no workaround. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-002 | Create + immediately Activate (→ Activated) | The Activate path is what makes a review visible/actionable to the reviewer — primary feature path, high reach. Slightly below TC-001 only because TC-001 establishes the create itself. |
| TC-003 | Activate an existing Inactive review from the list | The common real-world flow (create in batch, activate later). High impact on the reviewer pipeline; the only UI surface for the Inactive→Activated transition from the list. |
| TC-005 | Created review is searchable in the list | The list is how admins find and manage reviews; if create succeeds but the row never surfaces, the feature is effectively unusable. Absorbs TC-508 loader-wait. |
| TC-100 | Reviewer autocomplete shows only the employee's supervisors | Business-rule integrity at the UI: picking a wrong/arbitrary reviewer corrupts the evaluation assignment. Defense-in-depth over the API contract; high reach on the create form. |
| TC-103 | Completed review renders read-only | Data-integrity guardrail — a Completed review must not be re-edited. UI surface of a backend invariant; visible to both admin and reviewer. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-006 | Edit an Inactive review's period / due date / reviewer | Secondary flow; a workaround exists (delete + recreate). Still a common correction path → mid priority. Absorbs TC-506 update toast. |
| TC-007 | Delete a review from the list | Secondary/housekeeping flow with a workaround (leave Inactive). Matters for data hygiene and seed cleanup. Absorbs TC-506 delete toast. |
| TC-300 | Empty Save → 5× "Required" | Prevents malformed/incomplete reviews — meaningful guardrail, but lower-layer contracts also enforce and the user simply fills the fields. Anchor for the consolidated form-validation test. |
| TC-301 | Free-typed (unbound) employee rejected | Edge of the required-field rule; prevents a bad/orphan reviewee. Folds into the form-validation test. |
| TC-303 | Supervisor Reviewer required after employee chosen | Reinforces the mandatory-reviewer rule; common slip on the form. Folds into the form-validation test. |
| TC-305 | Activate with missing fields blocked | Ensures the Activate button enforces the same validation as Save; prevents activating an incomplete review. Folds into the form-validation test. |
| TC-500 | Empty list shows "No Records Found" | Common first-run / filtered-out state; route-mocked, cheap. Moderate user reach, no data risk. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-306 | Cancel discards the Add form (no record) | Low impact, easily bypassed; no-side-effect check. |
| TC-304 | Malformed date input rejected | Rare edge — the date picker normally prevents bad input; backend (API TC-302) is the real guard. |
| TC-501 | Filter panel collapse/expand | Cosmetic UI-state toggle. |
| TC-502 | Date filters default to current year + Include default | Rendered-default nicety; low risk if defaults drift. |
| TC-503 | Review Status dropdown lists exactly the four states | Static dropdown-content check; low impact. |
| TC-504 | Add form `*` markers + "* Required" + Cancel/Save/Activate buttons | Cosmetic form-rendering assertion. |
| TC-505 | Reset clears filters back to defaults | Convenience UI-state behavior; workaround = reload page. |

---

## Summary
- **P0:** 3 · **P1:** 5 · **P2:** 7 · **P3:** 7 (E2E total: 22 listed; TC-506/507/508 folded into the cases above → 25 source IDs covered).
- **Generate-tests scope (P0 + P1 = 8):** the must-build set. Consolidate where the strategy directs — TC-004 absorbs the lifecycle/status-column (TC-507); TC-001/005/006/007 absorb the toast checks (TC-506).
- **Recommended build order:** TC-004 → TC-001 → TC-200 → TC-002/003/005/100/103 → P2 form-validation cluster (TC-300/301/303/305) + TC-006/007/500 → P3 if budget remains.
- **Precondition reminder (from strategy):** every P0/P1 create/activate/lifecycle case needs a **reviewee with a supervisor** — seed via the existing `tests/performance/myTarckers.spec.ts` API pattern (employee + user + supervisor), and a **real reviewer login** for TC-004/TC-103.
