# Test Priority — PIM → Optional Fields

**Input**: `docs/test-strategy_PIM -> Optional Fields.md` (E2E scenarios)
Scope: prioritizes the **E2E** scenarios. P0 + P1 are generated as automated tests in Step 4.

---

## P0 — Release-blocking (core flow, security, data integrity)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-001 | Enable a field, save, toast, persists | The primary purpose of the screen. If save/persist breaks, the feature is non-functional — no workaround. Folds TC-500 (layout) + TC-002's UI flip. |
| TC-100 | Show SSN → SSN field appears in Personal Details | The feature exists to control field visibility; this is its real-world effect and is data-integrity-adjacent (wrong gating hides/exposes PII fields). No workaround. |
| TC-200 | ESS blocked from the page (no menu, Credential Required, no Save) | Security/authorization — a regression exposes instance-wide config to non-admins. Release-blocking. |

## P1 — High impact (primary paths, major behaviors, integrations)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-004 | Saved state persists across reload (hydration) | Confirms read+write round-trip; high reach — every admin relies on correct hydration. |
| TC-101 | Show Deprecated Fields → Nick/Smoker/Military appear | Second major downstream gate; broad PIM impact. |
| TC-301 | Unsaved toggle change is not persisted | Protects against accidental/implicit config changes on a shared singleton — high blast radius if wrong. |
| TC-003 | Enable all four toggles in one save | Validates the combined save path used when configuring multiple fields at once. |

## P2 — Moderate (secondary flows, common-path edges)

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-102 | Show US Tax Exemptions → menu appears | Third downstream gate; less commonly used than SSN/deprecated. |
| TC-402 | SIN and SSN independent | Differentiation edge on a common path; SIN less used than SSN. |
| TC-401 | On→off→save nets to off | Final-state semantics; a deliberate sequence, workaround exists. |
| TC-300 | Idempotent no-change save | Useful guard; low user impact. |
| TC-500/501/502 | Layout, toggle reflects, hydration render | UI-state checks; mostly folded into TC-001/004. |

## P3 — Low / rare edge cases

| TC | Description | Rationale |
|----|-------------|-----------|
| TC-400 | Rapid double-save convergence | Rare timing edge; low real-world frequency. |

---

## Summary
- **P0 (release-blocking)**: 3 — TC-001, TC-100, TC-200
- **P1 (high impact)**: 4 — TC-004, TC-101, TC-301, TC-003
- **P2 (moderate)**: 5 (incl. folded 500/501/502) — TC-102, TC-402, TC-401, TC-300, TC-50x
- **P3 (low/cosmetic)**: 1 — TC-400

**To be generated in Step 4**: P0 + P1 = **7 scenarios** (< 12, so per the generate-tests rule P2 is also included → P0 + P1 + P2).
