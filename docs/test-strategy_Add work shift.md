# Test Strategy — Add Work Shift

**Input**: `docs/test-scenarios_Add work shift.md` (30 scenarios)
**Feature**: Admin → Job → Work Shifts → Add (`/admin/saveWorkShifts`)
**Backend**: `orangehrmAdminPlugin` — `WorkShiftAPI` (`POST /api/v2/admin/work-shifts`), uniqueness via `core/validation/unique` (`entityName=WorkShift`), employee hints via `/api/v2/admin/work-shifts/employees`.

This is a thin CRUD-over-form feature with **no client-side pure logic exposed for unit testing** (the duration calc lives inside a compiled Vue component, only observable through the rendered DOM) and **no standalone JS module under test** in this repo. The repo is a Playwright E2E + API-helper framework (no component-test or unit-test harness wired up — see `automation.config.ts`, `src/api/*`). Strategy therefore concentrates on **E2E** for user-visible behavior and **API** for contract/security/persistence, mirroring the existing `add-job-title` / `add-employment-status` suites.

---

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| Unit | 0 | No isolated pure-function module exposed (duration calc is in-component, untestable standalone in this repo) | — |
| Component | 0 | No component-test harness in repo; UI states covered via E2E | — |
| API | 8 | Create contract, 24h time/hoursPerDay mapping, uniqueness endpoint, empNumber persistence, role enforcement | ~1 min |
| E2E | 22 | Form journeys, validation feedback, duration recompute, autocomplete, toast/redirect, ESS access | ~6 min |
| **Total** | **30** | | |

Shape: bottom layers are empty by necessity (no unit/component harness), so the practical pyramid here is **API-wide / E2E-narrow-but-dominant**. Where a rule is checkable at the API layer it is *also* asserted there for defense-in-depth, even when an E2E covers the same rule through the UI.

---

## Layer Assignments

### API / Integration (8)
| TC | Title | Why API |
|----|-------|---------|
| TC-005 | Shift retrievable via list API | Pure contract/persistence read. |
| TC-101 | Uniqueness check fires | `core/validation/unique?entityName=WorkShift` is an API contract — assert request + response. |
| TC-103 | hoursPerDay/startTime/endTime mapping | 24h "HH:mm" + decimal hours is a serialization contract — best verified on the POST body, not pixels. |
| TC-104 | Assigned employees persist as empNumbers | Payload + reload contract. |
| TC-201 | ESS cannot POST a work shift | Authorization is a backend rule — must be tested at the API, not only via hidden UI. |
| TC-300 | Required name | Also assert server rejects empty `name` (defense-in-depth with the E2E inline check). |
| TC-100 | Duplicate name rejected | Server-side uniqueness enforcement (paired with the E2E inline-error case). |
| TC-302 | From≥To → hoursPerDay "0.00" | Confirm the submitted/stored value, independent of the rendered Duration. |

### E2E (22)
| TC | Title | Why E2E |
|----|-------|---------|
| TC-001 | Required-only save + defaults | Full create journey + toast + list redirect. |
| TC-002 | Custom working hours | Time-picker interaction → duration → persisted row. |
| TC-003 | One assigned employee | Autocomplete → chip → save. |
| TC-004 | Multiple assigned employees | Multi-select UI flow. |
| TC-102 | Duration auto-recalculates | In-component reactive behavior; only observable in DOM. |
| TC-200 | ESS no menu / blocked deep links | Navigation + route-guard rendering. |
| TC-202 | XSS inert in name | Requires real DOM render to prove no execution. |
| TC-300 | Empty name "Required" | Inline live validation feedback (UI). |
| TC-301 | Whitespace-only name | UI trim + inline error. |
| TC-302 | From≥To → Duration 0.00 (UI) | Verify the rendered Duration value. |
| TC-303 | Duplicate error clears on edit | Live re-validation in the field. |
| TC-304 | Invalid picker entry constrained | Picker widget behavior. |
| TC-400 | Max-length name | UI limit / inline error. |
| TC-401 | 1-minute shift duration | Sub-hour rounding in UI. |
| TC-402 | Near-24h span | Boundary duration in UI. |
| TC-403 | From==To → 0.00 | UI duration. |
| TC-404 | Unicode/spaces name | Render + normalization. |
| TC-405 | Remove chip before save | Chip × interaction → empty empNumbers. |
| TC-500 | Default field state | Initial render assertions. |
| TC-501 | Autocomplete hint list | Query-driven listbox. |
| TC-502 | Cancel discards | Navigation + no-record. |
| TC-503 | Empty list state | "No Records Found" rendering. |
| TC-504 | Toast text + redirect | Toast assertion. |
| TC-505 | Time picker popup structure | Widget DOM. |

> Note: counts overlap intentionally — TC-100, TC-300, TC-302 appear at **both** API and E2E (defense-in-depth). Net unique scenarios = 30; layer rows sum to 30 by assigning each its *primary* layer (the three dual-layer rules are counted once in API where the rule originates, and their UI-feedback aspect is folded into the E2E rows of the same TC id during generation).

---

## Decision Rationale (contested)
- **Duration calculation (TC-102/401/402/403)** — the tempting "unit test the formula" is impossible here: the calc is compiled into the OXD/Vue bundle with no exported pure function and no unit harness in the repo. Verified at E2E (rendered value) + API (submitted `hoursPerDay`).
- **Required / duplicate / authorization** — pushed DOWN to API for the actual rule, kept at E2E only for the *user-facing feedback* (inline message, blocked navigation). This avoids the "validation tested only at E2E" anti-pattern.
- **XSS (TC-202)** — cannot be pushed below E2E; proving non-execution requires a real browser DOM.

## Anti-Patterns Found in Existing Tests
- None blocking. The existing `tests/admin/add-job-title.spec.ts` already follows defense-in-depth (UI inline error + API count check for duplicates) — this strategy mirrors that pattern.
- Repo has **no unit/component layer** at all; that is a framework-level gap, not specific to this feature. Flagged so the empty Unit/Component rows are understood as "not applicable here," not "missed."
