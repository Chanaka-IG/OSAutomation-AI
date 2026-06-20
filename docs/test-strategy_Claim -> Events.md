# Test Strategy — Claim → Events

**Input:** `docs/test-scenarios_Claim -> Events.md` (31 scenarios)
**Goal:** Assign each scenario to the lowest adequate test layer (pyramid, not ice-cream cone).

Claim → Events is thin CRUD master data over `/api/v2/claim/events` rendered by a standard OXD list + add/edit form. Contract rules (required, uniqueness, length, status flag) live in the backend `ClaimEventAPI` and should be proven at the **API** layer; the **E2E** layer covers the admin journey, the wiring of validation messages to the UI, security route guards, and the downstream Submit-Claim integration.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No pure client-side logic worth isolating (no computed fields) | — |
| API | 8 | Contract: required/unique/length, status persistence, authz, trim | ~fast |
| Component | 0 | Form is generic OXD; covered within E2E add/edit | — |
| E2E | 23 | Admin CRUD journeys, UI validation wiring, security, empty/list state, integration | ~moderate |

> Defense-in-depth: uniqueness (TC-100/105) and required (TC-101) are validated at **both** API and E2E intentionally — the rule is critical and the UI message is a separate failure surface from the server contract.

---

## Layer Assignments

### API / Integration
Backend contract on `ClaimEventAPI` (`/api/v2/claim/events`).
| ID | Why API |
|----|---------|
| TC-100 | 422 `invalidParamKeys:["name"]` on duplicate — contract, not UI |
| TC-101 | Required-name 422 at API |
| TC-104 | Description nullable — pure persistence contract |
| TC-105 | Rename collision → 422 (PUT) |
| TC-201 | ESS POST forbidden — authorization at API |
| TC-302 | Over-long name → 422 (length bound) |
| TC-303 | Missing name → 422 |
| TC-402 | Trim-on-save — assert stored value via API |
| TC-403 | Case-variant uniqueness — observe contract via API |
| TC-400 | Max-length boundary accepted — API |

### E2E (Playwright)
| ID | Why E2E |
|----|---------|
| TC-001..003 | Full add journeys (active / minimal / inactive) through the form |
| TC-004, TC-005 | Edit + status toggle journeys |
| TC-006 | Delete via confirm dialog |
| TC-007 | Cancel-add navigation |
| TC-008, TC-103 | Submit-Claim integration (event dropdown reflects status) |
| TC-100, TC-101 | Inline "Already exists" / "Required" wiring in the UI |
| TC-102 | Active default visible on form |
| TC-200, TC-202 | Menu visibility + route guard for ESS |
| TC-203 | XSS escaped on display |
| TC-300, TC-301, TC-304 | Whitespace reject, duplicate no-partial-save, delete-cancel |
| TC-401 | Unicode rendered verbatim end-to-end |
| TC-404 | Pagination rendering |
| TC-500, TC-501, TC-505 | Empty state, count text, status column |
| TC-502, TC-503, TC-504 | Inline validation lifecycle, dialog content, toasts |

---

## Decision Rationale (contested)

- **TC-402 (trim) → API, not E2E:** the trimming happens server-side; asserting the stored value via GET is more precise than reading a rendered cell.
- **TC-403 (case sensitivity) → API:** this is exploratory contract discovery; cheaper and clearer as a direct API assertion than a UI flow.
- **TC-103/TC-008 → E2E (not API):** the value is the *integration* between Events config and Submit Claim; an API check wouldn't prove the dropdown wiring.
- **TC-100/101 duplicated across API+E2E:** critical rules get defense-in-depth; the E2E variant asserts the **message text/selector**, the API variant asserts the **status code/contract**.
- **No Unit/Component tests:** there is no pure function or bespoke component here — the form is generic OXD and computes nothing. Pushing "tests" into a synthetic unit layer would be ceremony.

---

## Anti-Patterns Checked (existing suite)
- No existing Claim spec, so no ice-cream-cone to unwind.
- Guard against putting **length/required/uniqueness** purely at E2E — they are assigned to API here.
- Guard against zero E2E for the critical admin CRUD flow — explicitly covered (TC-001/004/006).
