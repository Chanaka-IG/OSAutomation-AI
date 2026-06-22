# Test Priority — Claim → Assign Claim

**Input:** `docs/test-strategy_Claim -> Assign Claim.md` (E2E-assigned scenarios)
**Scope:** Priority for the **E2E** scenarios. API-only (TC-201) is out of scope here.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-005 | End-to-end: assign → add expense → submit → in Employee Claims | The core admin journey; absorbs TC-001/002/003/004/102/105/500. |
| TC-103 | Claim attributed to the chosen employee | The whole point of "assign"; wrong attribution is a data-integrity defect. |
| TC-300 | Assign requires Employee, Event, Currency | Prevents malformed/unattributed claims. |
| TC-200 | ESS cannot access Assign Claim | Security/authorization. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-100 | Only active events in Event dropdown | Correct claim creation. |
| TC-101 | Only active expense types in Expense Type dropdown | Correct expense lines. |
| TC-104 | Employee autocomplete returns matches | Core of the assign form. |
| TC-301 | Add Expense requires Type/Date/Amount | Prevents malformed expenses. |
| TC-503 | Success toast on assign / add-expense | Primary feedback. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-302 | Free-text (non-hint) employee not accepted | Edge of the required rule. |
| TC-400 | Decimal amount preserved in total | Money correctness detail. |
| TC-401 | Remarks optional | Common variation. |
| TC-500 | Empty expenses state | UI state (also within P0 journey). |
| TC-501 | Summary fields read-only | UI correctness. |
| TC-502 | Employee Claims filter narrows the grid | Common list interaction. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-105 | Reference Id generated | Asserted within the P0 journey. |

---

## Summary
- **P0:** 4 · **P1:** 5 · **P2:** 6 · **P3:** 1 (E2E total: 16)
- **Generate-tests scope (P0 + P1 = 9, < 12 → include P2):** P0(4) + P1(5) + P2(6) = **15 cases**, consolidated (the P0 journey absorbs several IDs).
- **Claim-residue budget:** ~2 permanent claims per run (happy-path assign + one seeded Initiated assigned claim reused read-only). Documented in the strategy.
