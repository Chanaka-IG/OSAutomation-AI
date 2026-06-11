# Test Priority — Organization Structure (E2E)

**Input**: `docs/test-strategy_Organization Structure.md`. Scope = the **E2E** scenarios only (API-layer cases are prioritised within their own contract suite and are out of scope for E2E generation). Priorities drive which tests the generator writes (P0 + P1 first).

---

## P0 — Release-blocking (core flow, data integrity, security, no workaround)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-001 | View the organization structure tree as Admin | If the tree won't render, the entire feature is dead — gates every other test. |
| TC-003 | Add a top-level sub-unit under the company root | The primary create flow; sub-units are FK targets for PIM/Leave/Performance. Core data-integrity path. |
| TC-005 | Edit a sub-unit's name (with description present) | The primary update flow; renaming an org unit is a core admin capability. |
| TC-006 | Delete a leaf sub-unit | The primary destroy flow; must work to manage structure. |
| TC-100 | Duplicate name rejected globally (no POST) | Data-integrity rule; a silent duplicate corrupts org reporting. No workaround. |
| TC-102 | Delete cascades to all descendants | High-risk data operation — wrong behaviour means orphaned or unexpectedly-surviving units. |
| TC-200 | ESS cannot access the structure page | Security/authorization — an ESS reaching admin org config is a compliance breach. |
| TC-301 | Editing a description-less unit fails silently (KNOWN BUG) | Data-integrity regression guard around a confirmed defect; silent data loss has no user-visible warning. |

## P1 — High impact (primary path, high reach, major integrations)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-002 | Edit toggle reveals Add + action controls | Gateway to every mutating action; high reach, primary path. |
| TC-004 | Add a child sub-unit under an existing node | Nesting is the defining capability of a *structure*; primary path. |
| TC-101 | Empty Name blocks save | Core validation guarding data integrity on the most-used form. |
| TC-103 | Root company node cannot be deleted | Prevents catastrophic, unrecoverable structure loss. |
| TC-300 | Duplicate name shows unique-name error in the dialog | Negative path of the primary create flow; high reach. |
| TC-500 | Edit OFF = read-only tree | Confirms the safety default; affects every admin who opens the page. |

## P2 — Moderate impact (secondary flows, edge cases on common paths, workaround exists)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-007 | Add with Name only (Unit Id + Description blank) | Common but lower-risk variation; partially covered by TC-003. |
| TC-202 | Name stores script payload inert (no stored XSS) | Important defensively, but the input path is admin-only (low reach), so moderate. |
| TC-302 | Cancel on Add discards input | Secondary dialog behaviour; low blast radius. |
| TC-303 | "No, Cancel" keeps the unit | Secondary dialog behaviour. |
| TC-401 | Name at 101 chars shows the length error | Edge case on a common field; backend also guards it. |
| TC-501 | Add dialog shows the contextual parent note | UX nicety on a primary flow; not data-impacting. |

## P3 — Low / cosmetic (rare edge cases, nice-to-have)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-400 | Name at the 100-char boundary accepted | Rare boundary; backend-mirrored. |
| TC-402 | Unit Id at 101 chars length error | Rare boundary on an optional field. |
| TC-403 | Whitespace-only Name treated as empty | Rare input; covered in spirit by TC-101. |
| TC-502 | Edit dialog pre-fills existing values | Implicitly exercised by TC-005; low standalone value. |
| TC-503 | Length error clears when Name shortened | Cosmetic live-validation polish. |

---

## Generation guidance
P0 (8) + P1 (6) = **14 E2E tests** → exceeds the 12-case threshold, so per the generate-tests rule the suite covers **P0 + P1 only** (no P2/P3). Several P0/P1 cases are naturally **folded** to keep the suite lean and fast:
- TC-001 folds into the suite's read-only baseline alongside TC-500.
- TC-002 is exercised as a precondition step within the Add/Edit/Delete tests, plus one explicit toggle assertion.
- TC-100 and TC-300 are the same guard from two entry points → combined into one duplicate-name test.
- TC-301 is the headline regression/bug test and stays standalone.
