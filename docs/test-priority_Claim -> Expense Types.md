# Test Priority — Claim → Expense Types

**Input:** `docs/test-strategy_Claim -> Expense Types.md` (E2E-assigned scenarios)
**Scope:** Priority labels for the **E2E** scenarios. API-only scenarios (TC-104, TC-201, TC-302, TC-303, TC-400, TC-402, TC-403) are out of scope here.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Add an active expense type | Core create flow; no workaround. |
| TC-006 | Delete a type via confirm dialog | Destructive data-integrity flow. |
| TC-100 | Duplicate name → "Already exists" | Data-integrity; duplicates corrupt claim reporting. |
| TC-101 | Required name → "Required" | Prevents empty master data. |
| TC-200 | ESS cannot access Expense Types config | Security/authorization; admin-only. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-004 | Edit name/description | Primary maintenance path. |
| TC-005 | Toggle status Active → Inactive | Controls downstream availability. |
| TC-003 | Add inactive type | Status is first-class on create. |
| TC-202 | ESS direct Add/Edit URL blocked | Route-guard half of security. |
| TC-504 | Success toast on add/edit/delete | Primary feedback per mutation. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-002 | Add with required field only | Subset of TC-001. |
| TC-007 | Cancel add returns without saving | Secondary navigation. |
| TC-203 | XSS escaped on display | Narrow but important; OXD escapes by default. |
| TC-300 | Whitespace-only name rejected | Edge of required rule. |
| TC-301 | Duplicate add → no partial save | Reinforces TC-100. |
| TC-304 | Delete dialog Cancel keeps record | Safety of destructive flow. |
| TC-500 | Empty list "No Records Found" | Common UI state. |
| TC-501 | Record count text | Common UI state. |
| TC-505 | Active/Inactive in Status column | Display correctness. |
| TC-503 | Delete dialog content | Confirmation copy. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-102 | Active default on | Cosmetic default. |
| TC-401 | Unicode rendered verbatim | Rare input. |
| TC-404 | Pagination with > 50 types | Rare scale; high seeding cost. |
| TC-502 | Inline Required appears/clears | Minor UX detail of TC-101. |
| TC-106 | Only active types selectable in claim expense dropdown | High setup cost (requires a created claim request) + un-cleanable residual data; status rule already covered at config level (TC-003/005/505). **Deferred from generation.** |

---

## Summary
- **P0:** 5 · **P1:** 5 · **P2:** 10 · **P3:** 5 (E2E total: 25 — includes E2E side of dual-layer TC-100/101)
- **Generate-tests scope (P0 + P1 = 10, < 12 → include P2):** P0(5) + P1(5) + P2(10) = **20 cases** (consolidated into fewer self-contained tests).
- **TC-106 excluded** with the documented rationale above.
