# Test Strategy — Claim → Assign Claim

**Input:** `docs/test-scenarios_Claim -> Assign Claim.md` (26 scenarios)
**Goal:** Lowest adequate layer per scenario. Like the ESS submit flow, this is a **stateful admin UI journey** (assign → add expenses → submit), so it is E2E-heavy; authorization is pushed to API.

> **Hard constraint (same as ESS submit):** claim requests cannot be deleted (`DELETE` → 405). The suite uses **persistent shared config fixtures** (reuses the `ESS Submit Claim E2E *` events + expense types via `createIfAbsent`, never deleted) and **minimizes claim creation** (one full happy-path assign + one seeded Initiated assigned claim reused read-only). Residue is inherent and documented.
>
> **Workflow quirk:** an admin's Submit on an assigned claim auto-advances the status (observed "Paid"), because admin holds approve/pay rights. Tests assert the claim *left* Initiated and is listed, **not** an exact terminal status.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure logic | — |
| API | 1 | Authorization (ESS cannot assign) | ~fast |
| Component | 0 | Generic OXD forms/autocomplete | — |
| E2E | 17 | Assign journey, autocomplete, dropdowns, validation, employee attribution, list | ~moderate |

---

## Layer Assignments

### API / Integration
| ID | Why API |
|----|---------|
| TC-201 | ESS POST to `/claim/employees/{n}/requests` → 403 (authorization contract) |

### E2E (Playwright)
| ID | Why E2E |
|----|---------|
| TC-001..005 | Multi-page assign journey |
| TC-100, TC-101, TC-104 | Dropdown / autocomplete wiring |
| TC-102, TC-103, TC-105 | Total, employee attribution, reference id — visible on detail |
| TC-200 | ESS route guard |
| TC-300, TC-301, TC-302 | Required-field + employee-not-free-text wiring |
| TC-400, TC-401 | Decimal total + optional remarks |
| TC-500..503 | Empty state, read-only summary, list filter, toasts |

---

## Decision Rationale (contested)
- **E2E-heavy is correct:** the value is the cross-page assign journey and employee attribution; little backend logic to isolate below E2E. Authorization is pushed to API (TC-201).
- **No exact post-submit status assertion:** admin Submit auto-advances (Paid); asserting it would couple the test to workflow config. Assert "left Initiated" + listed instead.
- **TC-101/301/501 reuse one seeded Initiated assigned claim** (created via API as admin) rather than each creating its own — limits permanent residue.
- **No Unit/Component:** generic OXD; total computed server-side.

## Anti-Patterns Checked
- No existing assign-claim spec.
- Authorization at API (not only E2E).
- Claim creation minimized given the no-delete constraint.
