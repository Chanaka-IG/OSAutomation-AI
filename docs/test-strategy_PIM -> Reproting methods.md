# Test Strategy — PIM → Reporting Methods

**Input**: `docs/test-scenarios_PIM -> Reproting methods.md` (19 scenarios)
**Feature**: PIM → Configuration → Reporting Methods (`/pim/viewReportingMethods`, `/pim/saveReportingMethod`)
**Backend**: `orangehrmPimPlugin` — `ReportingMethodAPI` (`GET`/`POST`/`DELETE /api/v2/pim/reporting-methods`) with unique-name validation.

A minimal **single-field CRUD** feature (just `name`) with unique-name validation and one cross-module effect (the method feeds the employee Report-to "Reporting Method" dropdown). Repo is Playwright **E2E + API helpers** only — no unit/component harness. So:
- **API** for the read/write/uniqueness contract and role enforcement.
- **E2E** for the form journey, inline validation, the toast, the ESS guard, the delete dialog, and the Report-to dropdown propagation.
- Uniqueness + role get **defense-in-depth** at both layers.

> ⚠️ Shared-state caveat: methods are instance-wide; the defaults **Direct/Indirect** must never be deleted. Tests clean up only the methods they create (resolve created names → ids → DELETE in `afterAll`). Single worker / serial.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure-logic module; no unit harness | — |
| Component | 0 | No component harness; rendering covered via E2E | — |
| API | 5 | List/create contract, name mapping, uniqueness, role enforcement | ~1 min |
| E2E | 14 | Form journey, validation, toast, delete dialog, Report-to propagation, ESS guard | ~5 min |
| **Total** | **19** | | |

Shape: **API-wide / E2E-dominant** (bottom layers empty by repo constraint).

---

## Layer Assignments

### API / Integration (5)
| TC | Title | Why API |
|----|-------|---------|
| TC-002 | Method retrievable via list API | Persistence/read contract. |
| TC-102 | name maps 1:1 in payload | Serialization contract — assert POST body. |
| TC-100 | Duplicate rejected | Server-side uniqueness (paired with E2E inline-error). |
| TC-201 | ESS cannot POST | Authorization is a backend rule. |
| TC-300 | Empty name rejected by server | Defense-in-depth with the E2E inline check. |

### E2E (14)
| TC | Title | Why E2E |
|----|-------|---------|
| TC-001 | Add method + toast + listed | Core create journey. |
| TC-003 | Method appears in Report-to dropdown | Cross-module propagation — needs the app. |
| TC-100 | Duplicate inline "Already exists" | Live validation feedback. |
| TC-101 | Case-insensitive duplicate | Live validation variant. |
| TC-200 | ESS blocked on page | Route guard + menu absence. |
| TC-202 | XSS inert | Real DOM proof. |
| TC-300 | Empty save → Required | Inline validation. |
| TC-301 | Whitespace name rejected | Trim/required. |
| TC-302 | Duplicate error clears on edit | Live re-validation. |
| TC-400 | Max-length name | UI length handling. |
| TC-401 | Unicode/spaces name | Render + normalization. |
| TC-402 | Delete removes + propagates | Delete dialog + dropdown removal. |
| TC-500/501 | Add layout; default methods listed | Initial render. |
| TC-502/503 | Cancel discards; delete dialog | UI states. |

> TC-500/501 and TC-502/503 fold into list/form-state and delete tests during generation.

---

## Decision Rationale (contested)
- **Report-to propagation (TC-003)** — can't go below E2E; the assertion is "the method is an option in another module's dropdown" (analogous to the job-title→vacancy propagation test).
- **Uniqueness/required/role** — the *rule* lives at the API; the *user-facing feedback* (inline message, blocked nav, Credential Required) at E2E. Avoids "validation only at E2E."

## Anti-Patterns Avoided / Notes
- Uniqueness/required not E2E-only — also at the API (TC-100/300).
- No unit/component layer in the repo (framework gap, not feature-specific).
- **Cleanup mandatory + protect defaults**: never delete Direct/Indirect; delete only created names in `afterAll`; single-worker serial.
