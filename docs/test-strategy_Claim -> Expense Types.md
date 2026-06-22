# Test Strategy — Claim → Expense Types

**Input:** `docs/test-scenarios_Claim -> Expense Types.md` (31 scenarios)
**Goal:** Assign each scenario to the lowest adequate test layer (pyramid, not ice-cream cone).

Claim → Expense Types is thin CRUD master data over `/api/v2/claim/expenses/types` rendered by a standard OXD list + add/edit form — the same shape as Claim → Events. Contract rules (required, uniqueness, length, status flag) live in the backend `ExpenseTypeAPI` and are proven at the **API** layer; the **E2E** layer covers the admin journey, validation-to-UI wiring, security guards, and list/empty state.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No pure client-side logic (no computed fields) | — |
| API | 8 | Contract: required/unique/length, status, authz, trim | ~fast |
| Component | 0 | Generic OXD form; covered within E2E add/edit | — |
| E2E | 23 | Admin CRUD journeys, UI validation wiring, security, empty/list state | ~moderate |

> Defense-in-depth: uniqueness (TC-100/105) and required (TC-101) validated at **both** API and E2E.

---

## Layer Assignments

### API / Integration (`ExpenseTypeAPI`, `/api/v2/claim/expenses/types`)
| ID | Why API |
|----|---------|
| TC-100 | Duplicate → 422 `invalidParamKeys:["name"]` |
| TC-101 | Required-name 422 |
| TC-104 | Description nullable — persistence |
| TC-105 | Rename collision → 422 (PUT) |
| TC-201 | ESS POST forbidden — authorization |
| TC-302 | Over-long name → 422 |
| TC-303 | Missing name → 422 |
| TC-400/402/403 | Max-length, trim, case-variant uniqueness — contract discovery |

### E2E (Playwright)
| ID | Why E2E |
|----|---------|
| TC-001..003 | Add journeys (active / minimal / inactive) |
| TC-004, TC-005 | Edit + status toggle |
| TC-006 | Delete via confirm dialog |
| TC-007 | Cancel-add navigation |
| TC-100, TC-101 | Inline "Already exists" / "Required" wiring |
| TC-102 | Active default visible |
| TC-200, TC-202 | Route guard for ESS |
| TC-203 | XSS escaped on display |
| TC-300, TC-301, TC-304 | Whitespace reject, duplicate no-partial-save, delete-cancel |
| TC-401 | Unicode rendered verbatim |
| TC-404 | Pagination rendering |
| TC-500, TC-501, TC-505 | Empty state, count text, status column |
| TC-502, TC-503, TC-504 | Inline validation lifecycle, dialog content, toasts |

### Deferred
| ID | Reason |
|----|--------|
| TC-106 | "Only active types selectable when adding a claim expense" is genuine E2E, but the Expense Type dropdown is reachable only after creating a **claim request** (Submit Claim → claim detail → Add Expense). That leaves persistent claim data that OS does not cleanly delete via API. The underlying status rule is already exercised at the config layer (TC-003/005/505). Rated **P3** and excluded from generation; see priority doc. |

---

## Decision Rationale (contested)
- **TC-106 deferred, not at E2E in the generated suite:** unlike Claim → Events (whose dropdown is directly on Submit Claim), the expense-type dropdown requires a created claim. The setup cost + un-cleanable residue outweigh the marginal coverage over the config-level status tests. Documented rather than silently dropped.
- **TC-402/403 → API:** trim and case-sensitivity are server contract; asserting stored values via GET is more precise than reading rendered cells.
- **TC-100/101 dual-layer:** critical rules get API (status code) + E2E (message text).
- **No Unit/Component:** no pure function or bespoke component; the form is generic OXD.

---

## Anti-Patterns Checked
- No existing Expense Types spec — no ice-cream-cone to unwind.
- Length/required/uniqueness assigned to API (not purely E2E).
- Critical admin CRUD has E2E coverage (TC-001/004/006).
