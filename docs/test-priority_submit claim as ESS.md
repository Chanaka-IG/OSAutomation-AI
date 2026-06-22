# Test Priority — Submit Claim as ESS

**Input:** `docs/test-strategy_submit claim as ESS.md` (E2E-assigned scenarios)
**Scope:** Priority labels for the **E2E** scenarios. API-only scenarios (TC-201 API half, TC-202, TC-302, TC-402) are out of scope here.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-005 | End-to-end: create → add expense → submit → verify in My Claims | The core business journey; if it breaks, ESS cannot claim expenses. Covers TC-001/002/003/004/103/105/500 in one path. |
| TC-300 | Create requires Event & Currency | Prevents invalid claim requests; first gate of the flow. |
| TC-301 | Add Expense requires Type/Date/Amount | Prevents malformed expense line items. |
| TC-200 | ESS cannot access admin Assign Claim | Security/authorization. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-100 | Only active events in the Event dropdown | Drives correct claim creation; high reach. |
| TC-101 | Only active expense types in the Expense Type dropdown | Same, for expense lines. |
| TC-102 | Total Amount sums the expenses | Money correctness — high impact. |
| TC-104 | ESS can cancel a claim | Primary alternate path for the employee. |
| TC-504 | Success toast on create / add-expense | Primary feedback for each mutation. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-103 | Submitted claim is read-only | Important, but asserted within the P0 journey. |
| TC-400 | Decimal amount preserved | Correctness detail of TC-102. |
| TC-401 | Remarks optional | Common variation of create. |
| TC-303 | Cancel on create form discards | Secondary navigation. |
| TC-500 | New claim empty expenses ("No Records Found", Total 0.00) | UI state (within P0 journey too). |
| TC-501 | Summary fields read-only | UI correctness. |
| TC-503 | My Claims filter narrows the grid | Common list interaction. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-502 | Inline expense form Cancel/Save + validation lifecycle | Minor UX detail of TC-301. |
| TC-105 | Reference Id generated | Asserted within the P0 journey; not standalone-worthy. |

---

## Summary
- **P0:** 4 · **P1:** 5 · **P2:** 7 · **P3:** 2 (E2E total: 18)
- **Generate-tests scope (P0 + P1 = 9, < 12 → include P2):** P0(4) + P1(5) + P2(7) = **16 cases**, consolidated into fewer self-contained tests (the P0 journey absorbs several UI-state IDs).
- **Claim-residue budget:** the generated suite creates a small fixed number of permanent claim requests per run (≈ happy-path 1 + cancel 1 + one seeded Initiated fixture reused for read-only checks). Documented in the strategy.
