# Test Strategy — Submit Claim as ESS

**Input:** `docs/test-scenarios_submit claim as ESS.md` (31 scenarios)
**Goal:** Lowest adequate layer per scenario. This feature is a **multi-step, stateful UI journey** (create → add expenses → submit), so it is E2E-heavy by nature — but contract/authorization checks are pushed to API.

> **Hard constraint:** claim requests cannot be deleted (`DELETE /api/v2/claim/requests` → 405). Every test that creates/submits a claim leaves a permanent record. The suite therefore (a) uses **persistent shared config fixtures** (event + expense types via `createIfAbsent`, never deleted) and (b) **minimizes claim creation** — the happy path is exercised once end-to-end, read-only checks reuse a single seeded Initiated claim, and only the cancel test creates an extra one. This residue is inherent to the feature and is documented, not silently incurred.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure logic (total is a server aggregate) | — |
| API | 4 | Authorization & self-scoping, contract edges | ~fast |
| Component | 0 | Generic OXD form/dialog; covered in E2E | — |
| E2E | 23 | The create→expense→submit journey, dropdowns, validation, My Claims, cancel, read-only | ~moderate |

---

## Layer Assignments

### API / Integration
| ID | Why API |
|----|---------|
| TC-201 | Self-scoping: `/claim/employees/requests` 403 for ESS (authorization contract) |
| TC-202 | Acting on a non-owned claim id → forbidden/not-found |
| TC-302 | Invalid amount contract (also surfaced in UI) |
| TC-402 | Zero-expense submit behavior — cheapest to characterize via API `PUT action` |

### E2E (Playwright)
| ID | Why E2E |
|----|---------|
| TC-001..005 | The core journey is inherently multi-page/full-stack |
| TC-100, TC-101 | Dropdown wiring (active-only) is a UI concern |
| TC-102, TC-103, TC-105 | Total aggregation, post-submit lock, reference id — visible on the detail page |
| TC-104 | Cancel transition through the UI |
| TC-200 | ESS route guard for Assign Claim |
| TC-201 | E2E half: My Claims renders only own rows |
| TC-300, TC-301 | Required-field wiring on create + expense forms |
| TC-303 | Cancel-create navigation |
| TC-400, TC-401 | Decimal amount + optional remarks through the UI |
| TC-500..504 | Empty state, read-only summary, inline form, filter, toasts |

---

## Decision Rationale (contested)
- **E2E-heavy is correct here, not an ice-cream cone:** the value of "submit claim as ESS" is the cross-page journey and state transitions; there is little backend logic to isolate below E2E. Authorization and a couple of contract edges are still pushed to API.
- **TC-101 (active expense types) stays E2E** even though it needs a claim: the dropdown only exists inside the claim detail; it reuses the single seeded Initiated claim rather than creating its own.
- **TC-402 (zero-expense submit) → API:** avoids creating an extra permanent claim through the UI just to characterize a branch.
- **No Unit/Component:** the Total is computed server-side; the forms are generic OXD.

## Anti-Patterns Checked
- No existing claim-submission spec — nothing to unwind.
- Authorization/self-scoping pushed to API (not only E2E).
- Claim creation deliberately minimized given the no-delete constraint (avoids unbounded residue growth — a test-hygiene anti-pattern).
