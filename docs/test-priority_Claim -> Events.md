# Test Priority — Claim → Events

**Input:** `docs/test-strategy_Claim -> Events.md` (E2E-assigned scenarios)
**Scope:** Priority labels (P0–P3) for the **E2E** scenarios only; API-only scenarios (TC-104, TC-201, TC-302, TC-303, TC-400, TC-402, TC-403) are out of scope here.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Add active event (name + description) | Core create flow; without it the feature has no value. No workaround. |
| TC-006 | Delete event via confirm dialog | Destructive data-integrity flow; must confirm correct record removed. |
| TC-100 | Duplicate name → "Already exists" | Data-integrity rule; duplicate master data corrupts claim reporting. |
| TC-101 | Required name → "Required" | Prevents invalid/empty master data entering the system. |
| TC-200 | ESS cannot access Claim Configuration | Security/authorization; config must be admin-only. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-004 | Edit event name/description | Primary maintenance path; high admin reach. |
| TC-005 | Toggle status Active → Inactive | Controls downstream availability; common admin action. |
| TC-003 | Add inactive event | Status is a first-class field of the create flow. |
| TC-103 | Only active events selectable in Submit Claim | Major cross-module integration; the point of the status flag. |
| TC-202 | ESS direct Add/Edit URL blocked | Route-guard half of the security story. |
| TC-504 | Success toast on add/edit/delete | Primary user feedback for every mutation. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-002 | Add with required field only | Subset of TC-001; lower marginal coverage. |
| TC-007 | Cancel add returns without saving | Secondary navigation; workaround = navigate away. |
| TC-008 | New active event appears in Submit Claim | Overlaps TC-103; positive-only slice. |
| TC-203 | XSS escaped on display | Important but narrow; OXD escapes by default. |
| TC-300 | Whitespace-only name rejected | Edge of the required rule. |
| TC-301 | Duplicate add → no partial save | Reinforces TC-100 from the persistence angle. |
| TC-304 | Delete dialog Cancel keeps record | Safety of the destructive flow. |
| TC-500 | Empty list "No Records Found" | Common UI state. |
| TC-501 | Record count text | Common UI state. |
| TC-505 | Active/Inactive in Status column | Display correctness. |
| TC-503 | Delete dialog content | Confirmation copy. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-102 | Active default checked | Cosmetic default; low risk. |
| TC-401 | Unicode rendered verbatim | Rare input; nice-to-have. |
| TC-404 | Pagination with > 50 events | Rare scale; high seeding cost. |
| TC-502 | Inline Required appears/clears | Minor UX detail of TC-101. |

---

## Summary
- **P0:** 5 · **P1:** 6 · **P2:** 11 · **P3:** 4 (E2E total: 26 — includes the E2E side of dual-layer TC-100/101)
- **Generate-tests scope (P0 + P1):** TC-001, TC-006, TC-100, TC-101, TC-200, TC-004, TC-005, TC-003, TC-103, TC-202, TC-504 → **11 cases**.
