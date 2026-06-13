# Test Strategy — PIM → Custom Fields

**Input**: `docs/test-scenarios_PIM -> Custom fields.md` (24 scenarios)
**Feature**: PIM → Configuration → Custom Fields (`/pim/listCustomFields`, `/pim/saveCustomFields`)
**Backend**: `orangehrmPimPlugin` — `CustomFieldAPI` (`GET`/`POST`/`DELETE /api/v2/pim/custom-fields`), with a max-10 cap and unique field-name validation.

This is a **CRUD-over-form** feature with a hard cap (10), a conditional sub-field (Drop Down → options), unique-name validation, and a cross-module effect (the field renders on its target Screen in employee records). The repo is Playwright **E2E + API helpers** only — **no unit/component harness**. So:
- **API** for the read/write/contract concerns: list persistence, payload mapping (`fieldType`/`screen`/`extraData`), role enforcement, and the cap.
- **E2E** for the form journeys, conditional Select Options rendering, inline validation, the success toast, the ESS guard, and the on-screen rendering of a created field.
- Critical rules (uniqueness, cap, role) get **defense-in-depth** at both layers.

> ⚠️ Shared-state caveat: custom fields are instance-wide and capped at 10. Tests MUST clean up every field they create (resolve ids → DELETE in `afterAll`) so the cap and the empty-state remain stable. Single worker / serial.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure-logic module; no unit harness | — |
| Component | 0 | No component harness; conditional rendering covered via E2E | — |
| API | 7 | List/create contract, payload mapping, uniqueness, the 10-cap, role enforcement | ~1 min |
| E2E | 17 | Form journeys, conditional options, validation, toast, on-screen rendering, ESS guard | ~6 min |
| **Total** | **24** | | |

Shape: **API-wide / E2E-dominant** (bottom layers empty by repo constraint).

---

## Layer Assignments

### API / Integration (7)
| TC | Title | Why API |
|----|-------|---------|
| TC-003 | Field retrievable via list API | Pure persistence/read contract. |
| TC-104 | fieldType/screen/extraData mapping | Serialization contract — assert on POST body. |
| TC-102 | 10-field cap enforced | Best verified at the API (create to the cap, then expect rejection) without 10 slow UI flows. |
| TC-201 | ESS cannot POST | Authorization is a backend rule. |
| TC-100 | Duplicate name rejected | Server-side uniqueness (paired with the E2E inline-error case). |
| TC-300 | Required fields rejected by server | Defense-in-depth with the E2E inline check. |
| TC-403 | Uniqueness scope (global vs per-screen) | Determine via API attempts — cleaner than UI. |

### E2E (17)
| TC | Title | Why E2E |
|----|-------|---------|
| TC-001 | Add Text field + toast + listed | Core create journey. |
| TC-002 | Add Drop Down + options | Conditional field + save. |
| TC-004 | Field renders on its Screen | Cross-module rendering — needs the real app. |
| TC-100 | Duplicate name inline "Already exists" | Live validation feedback. |
| TC-101 | Drop Down requires options | Inline "Required" on the conditional field. |
| TC-103 | Remaining counter create/delete | UI counter behavior. |
| TC-200 | ESS blocked on page | Route guard + menu absence. |
| TC-202 | XSS inert | Real DOM proof of non-execution. |
| TC-300 | Empty save → 3 Required | Inline validation. |
| TC-301 | Partial (name only) → Required | Inline validation. |
| TC-302 | Drop Down→Text hides/clears options | Conditional rendering + save semantics. |
| TC-303 | Whitespace name rejected | Trim/required. |
| TC-400 | Max-length name | UI length handling. |
| TC-401 | Single-option Drop Down | Boundary. |
| TC-402 | Option trimming / trailing comma | Parsing edge. |
| TC-500/501 | Default layout; options conditional on Type | Initial render + conditional rendering. |
| TC-502/503 | Empty list; Cancel discards | UI states. |

> TC-500/501 fold into one "form state" E2E; TC-502/503 fold into list/cancel checks during generation.

---

## Decision Rationale (contested)
- **10-field cap (TC-102)** — pushed to API: creating 10 records via the UI is slow and brittle; the cap and the 11th-rejection are a backend rule. A lightweight E2E can still assert the Remaining=0 state.
- **On-screen rendering (TC-004)** — can't go below E2E; the assertion is "the field appears on the employee's Personal Details screen."
- **Uniqueness/required/role** — the *rule* lives at the API; the *user-facing feedback* (inline message, blocked nav, Credential Required) at E2E. Avoids "validation only at E2E."

## Anti-Patterns Avoided / Notes
- Field-name uniqueness and the cap are not E2E-only — TC-100/102/300 also live at the API.
- No unit/component layer in the repo (framework gap, not feature-specific).
- **Cleanup mandatory**: created fields count against the 10-cap and pollute the empty-state; resolve ids and DELETE in `afterAll`; single-worker serial to avoid cap races.
