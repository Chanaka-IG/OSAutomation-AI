# Test Strategy — PIM → Optional Fields

**Input**: `docs/test-scenarios_PIM -> Optional Fields.md` (20 scenarios)
**Feature**: PIM → Configuration → Optional Fields (`/pim/configurePim`)
**Backend**: `orangehrmPimPlugin` — `PIMConfigAPI` exposing `GET`/`PUT /api/v2/pim/optional-field` (boolean config: `pimShowDeprecatedFields`, `showSIN`, `showSSN`, `showTaxExemptions`).

This feature is a **singleton boolean-config screen** with strong cross-module side effects (toggles gate field/menu visibility in PIM employee records). There is **no unit or component test harness in this repo** (Playwright E2E + API helpers only). So:
- **API** is the right layer for the read/write contract, role enforcement, and payload validation — fast and not dependent on widget rendering.
- **E2E** is required for the toggle UX, persistence/hydration, the success toast, the ESS route guard, and especially the **downstream visibility** rules (only a real browser proves a field/menu actually appears in Personal Details).
- Critical rules (role enforcement, payload mapping) are covered at **both** layers for defense-in-depth.

> ⚠️ Shared-singleton caveat: every test that writes config mutates instance-wide state. The suite MUST snapshot the current config in `beforeAll` and restore it in `afterAll`, and avoid parallel writes (single worker / serial).

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure-logic module exposed; no unit harness in repo | — |
| Component | 0 | No component-test harness; toggle/render states covered via E2E | — |
| API | 6 | GET/PUT contract, payload↔state mapping, role enforcement, schema validation, idempotency | ~1 min |
| E2E | 14 | Toggle UX, save+toast, persistence/hydration, downstream field/menu visibility, ESS guard | ~5 min |
| **Total** | **20** | | |

Practical shape: **API-wide / E2E-dominant** (bottom layers empty by repo constraint). Dual-layer rules counted once at their primary layer below.

---

## Layer Assignments

### API / Integration (6)
| TC | Title | Why API |
|----|-------|---------|
| TC-103 | PUT payload reflects toggle states | Serialization contract — assert on the request body. |
| TC-104 | GET hydrates toggles | Read contract — assert the response shape/values. |
| TC-201 | ESS cannot GET/PUT config | Authorization is a backend rule; must be proven at the API, not only via hidden UI. |
| TC-302 | Malformed PUT rejected | Schema validation — only meaningful at the API. |
| TC-300 | Idempotent save | Confirm PUT with unchanged body returns 200 and leaves config intact. |
| TC-002 | Disable a field persists | Persisted boolean flip — verify via GET (paired with the E2E toggle flow). |

### E2E (14)
| TC | Title | Why E2E |
|----|-------|---------|
| TC-001 | Enable a field + save + toast | Core toggle→save→confirm journey. |
| TC-002 | Disable a field + save | Reversibility through the UI (state verified via API). |
| TC-003 | Enable all four + save | Multi-toggle single save. |
| TC-004 | Persistence across reload | Save → reload → hydrated state. |
| TC-100 | Show SSN → SSN field in Personal Details | Cross-module visibility; only a real DOM proves it. |
| TC-101 | Show Deprecated → Nick/Smoker/Military appear | Cross-module visibility. |
| TC-102 | Show US Tax Exemptions → menu appears | Cross-module menu visibility. |
| TC-200 | ESS blocked on the page | Route guard + menu absence rendering. |
| TC-300 | Idempotent save (UI) | Toast on no-change save (UI feedback). |
| TC-301 | Unsaved toggle not persisted | Reload-revert behavior. |
| TC-400 | Rapid double-save | Convergence/no error in the UI. |
| TC-401 | On→off→save nets off | Final-state-at-save semantics + no field appears. |
| TC-402 | SIN/SSN independent | Two-field visibility differentiation. |
| TC-500/501/502 | Layout, toggle reflect, hydration render | Initial render + switch widget behavior. |

> TC-500/501/502 are folded into one "page state" E2E during generation.

---

## Decision Rationale (contested)
- **Downstream visibility (TC-100/101/102)** can't be pushed below E2E: the assertion is "a field/menu is rendered in another module's page," which requires the real app. These are the highest-value tests of the feature's actual purpose.
- **Role enforcement (TC-200/201)** split: the *rule* is tested at the API (TC-201); the *user-facing guard* (Credential Required, no Save) at E2E (TC-200). Avoids the "authorization tested only through hidden UI" anti-pattern.
- **Payload/hydration (TC-103/104)** live at API because they are contracts; the equivalent UI behaviors (TC-001/004) cover the same ground from the user side.

## Anti-Patterns Avoided / Notes
- Not testing the boolean schema only at E2E — TC-302 lives at the API.
- No unit/component layer exists in the repo (framework-level gap, not feature-specific) — Unit/Component rows are "not applicable here," not "missed."
- **Determinism risk**: this is shared singleton state. Strategy mandates snapshot-in-`beforeAll` / restore-in-`afterAll` and single-worker serial execution to prevent cross-test interference and instance pollution.
