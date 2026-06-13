# Test Priority — PIM → Reporting Methods

**Input**: `docs/test-strategy_PIM -> Reproting methods.md` (E2E scenarios)
Scope: prioritizes the **E2E** scenarios. P0 + P1 (+ P2, since P0+P1 < 12) are generated in Step 4.

---

## P0 — Release-blocking (core flow, security, data integrity)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-001 | Add a reporting method; toast; listed | The primary purpose of the screen — no workaround if broken. Folds TC-500 (layout) + TC-502 (redirect). |
| TC-100 | Duplicate name → inline "Already exists", save blocked | Core uniqueness/data-integrity guard. |
| TC-200 | ESS blocked (no menu; Credential Required; no Add/Save) | Authorization — exposes instance config to non-admins if broken. |

## P1 — High impact (primary paths, major behaviors, integrations)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-003 | Created method appears in the Report-to dropdown | The feature's real-world payoff (cross-module integration). |
| TC-300 | Empty save → "Required" | Mandatory-field enforcement; common path. |
| TC-302 | Duplicate error clears when name is edited | Supports the primary create path after a common mistake. |
| TC-502 | Cancel returns to list without creating | Primary escape path; broad reach. |

## P2 — Moderate (secondary flows, common-path edges)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-202 | XSS payload in Name stored inert | Important, but admin-entered (lower exposure). |
| TC-101 | Case-insensitive duplicate | Edge of the uniqueness rule. |
| TC-301 | Whitespace-only name rejected | Edge of the required rule (covered by TC-300 too). |
| TC-402 | Delete removes + dialog | Delete flow on the (non-default) created method. |
| TC-501/503 | Default methods listed; delete dialog copy | UI states (partly folded). |

## P3 — Low / rare edge cases

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-400 | Maximum-length name | Rare boundary. |
| TC-401 | Unicode / surrounding-space name | Rare; normalization nicety. |

---

## Summary
- **P0 (release-blocking)**: 3 — TC-001, TC-100, TC-200
- **P1 (high impact)**: 4 — TC-003, TC-300, TC-302, TC-502
- **P2 (moderate)**: 5 — TC-202, TC-101, TC-301, TC-402, TC-50x
- **P3 (low/cosmetic)**: 2 — TC-400, TC-401

**To be generated in Step 4**: P0 + P1 = **7** (< 12) → so P0 + P1 + P2 are generated.
