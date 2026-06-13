# Test Priority — PIM → Custom Fields

**Input**: `docs/test-strategy_PIM -> Custom fields.md` (E2E scenarios)
Scope: prioritizes the **E2E** scenarios. P0 + P1 (+ P2, since P0+P1 < 12) are generated in Step 4.

---

## P0 — Release-blocking (core flow, security, data integrity)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-001 | Add a Text custom field; toast; listed; counter decrements | The primary purpose of the screen — no workaround if broken. Folds TC-500 (layout) + TC-103 (counter) + TC-503 (save→list). |
| TC-002 | Add a Drop Down field with options | The second core creation path; Drop Down is half the feature. Folds TC-501 (conditional options). |
| TC-200 | ESS blocked (no menu; Credential Required; no Add/Save) | Authorization — a regression exposes instance config to non-admins. |

## P1 — High impact (primary paths, major behaviors, integrations)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-100 | Duplicate Field Name → inline "Already exists", save blocked | Core uniqueness/data-integrity guard; high reach. |
| TC-004 | Created field renders on its target Screen | The feature's real-world payoff (cross-module). |
| TC-300 | Empty save → three "Required" | Mandatory-field enforcement; common path. |
| TC-101 | Drop Down requires options ("Required") | Guards an incomplete Drop Down definition; primary Drop Down path. |

## P2 — Moderate (secondary flows, common-path edges)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-202 | XSS payload in Field Name stored inert | Important but the field is admin-entered (lower exposure than public input). |
| TC-302 | Drop Down→Text hides/clears options | Conditional-field correctness; deliberate sequence. |
| TC-301 | Partial (name only) → Required | Edge of the required rule already covered by TC-300. |
| TC-103 | Remaining counter create/delete | Folded into TC-001; standalone is moderate. |
| TC-402 | Option trimming / trailing comma | Parsing edge. |
| TC-502/503 | Empty list; Cancel discards | UI states (partly folded). |

## P3 — Low / rare edge cases

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-400 | Maximum-length Field Name | Rare boundary. |
| TC-401 | Single-option Drop Down | Rare boundary. |
| TC-403 | Same name on a different Screen | Rare; clarifies uniqueness scope, low frequency. |

---

## Summary
- **P0 (release-blocking)**: 3 — TC-001, TC-002, TC-200
- **P1 (high impact)**: 4 — TC-100, TC-004, TC-300, TC-101
- **P2 (moderate)**: 6 — TC-202, TC-302, TC-301, TC-103, TC-402, TC-50x
- **P3 (low/cosmetic)**: 3 — TC-400, TC-401, TC-403

**To be generated in Step 4**: P0 + P1 = **7** (< 12) → so P0 + P1 + P2 are generated.
