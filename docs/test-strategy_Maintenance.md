# Test Strategy — Maintenance

**Input:** `docs/test-scenarios_Maintenance.md` (32 scenarios)
**Feature:** Maintenance module — Administrator Access gate, Purge Employee Records, Access Records (Download Personal Data)
**Verified against:** OrangeHRM OS 5.8 (`automationtest-os-kord`), 2026-07-04

The Maintenance module is a thin Vue UI over a small set of endpoints. There is **no client-side business logic worth unit-testing** and **no isolated component** with meaningful internal state (the forms are stock OXD autocomplete + button). The value concentrates at two layers:

- **E2E** — the security gate and the two destructive/sensitive flows (purge, personal-data export) are full-stack journeys that only mean something end to end (session re-auth → server redirect → guarded sub-page → API mutation → UI reset). These must be exercised in a browser.
- **API** — authorization enforcement, the `onlyPast` vs `currentAndPast` query contracts, and purge irreversibility are backend guarantees best asserted directly against the endpoints (fast, deterministic, and not reliably observable through the UI alone).

---

## Distribution

| Layer     | Count | Focus                                                                 | Rel. time |
|-----------|-------|-----------------------------------------------------------------------|-----------|
| E2E       | 22    | Gate unlock/deny/re-prompt, purge journey + confirm dialog, download export, tab nav, UI states | High |
| API       | 8     | Authorization (403), `onlyPast`/`currentAndPast` contracts, purge eligibility + irreversibility | Low |
| Component | 0     | — (no isolated component with non-trivial state; OXD stock widgets)   | —         |
| Unit      | 0     | — (no pure client logic; all rules are server-side)                   | —         |

Pyramid note: this is a small feature surface with a genuinely thin client, so the mix is intentionally E2E-heavy — but every rule that *can* be pinned at the API layer (auth, query filter, irreversibility) is also covered there for defense-in-depth, rather than relying on E2E alone.

---

## Layer Assignments

### E2E (browser, full-stack)
| Scenario | Why E2E |
|----------|---------|
| TC-001 Unlock with correct password | Session re-auth → server redirect; only observable in-browser. |
| TC-002 Purge terminated employee (happy path) | Multi-step journey: search → select → confirm dialog → DELETE → UI reset. Core P0 flow. |
| TC-003 Selected Employee panel identity | Rendered state after resolve. |
| TC-004 Download personal data | File download triggered by form POST; browser-only. |
| TC-005 Access resolves selected employee | Rendered panel + Download affordance. |
| TC-006 Cancel on gate leaves module | Navigation behavior. |
| TC-007 Tab switching Purge/Access | Route + heading changes. |
| TC-100 Purge lists only past employees | UI-visible dropdown behavior (paired w/ API TC-204). |
| TC-101 Access lists current+past | UI-visible dropdown (paired w/ API). |
| TC-102 Correct vs wrong password | Full gate behavior. |
| TC-103 Gate re-prompts every entry | Cross-navigation session behavior — E2E only. |
| TC-104 Purge anonymizes (UI half) | Post-purge search returns nothing (API half asserts the 422). |
| TC-105 Username fixed to admin | Rendered disabled field. |
| TC-200 ESS has no menu / blocked URL | Role-based rendering + route guard. |
| TC-202 ESS blocked on Access URL | Route guard. |
| TC-203 Gate protects deep-links | Redirect-to-gate behavior. |
| TC-300 Empty password rejected | Gate validation UI. |
| TC-301 Wrong password alert | Gate error UI. |
| TC-302 Search with nothing selected | Field validation UI. |
| TC-305 Cancel on purge confirm aborts | Dialog behavior + no network mutation. |
| TC-501 Purge confirmation dialog content | Rendered copy. |
| TC-500/502/503/504/505 UI states | Rendered gate/panel/alert/empty states. |

(UI-state scenarios TC-500, TC-502, TC-503, TC-504, TC-505 fold into the flows above where practical rather than as standalone tests.)

### API (endpoint contract)
| Scenario | Endpoint / assertion |
|----------|----------------------|
| TC-201 ESS cannot purge | `DELETE /api/v2/maintenance/purge` as ESS → 403. |
| TC-204 `onlyPast` enforced server-side | `GET /pim/employees?...&includeEmployees=onlyPast` excludes active emp even by exact id. |
| TC-100 (contract half) | `onlyPast` query returns only terminated. |
| TC-101 (contract half) | `currentAndPast` query returns active employees. |
| TC-104 Purge irreversibility | After purge: name search empty; `GET /pim/employees/{n}` → 422. |
| TC-306 Purge of active employee rejected | `DELETE /api/v2/maintenance/purge` on active emp → 4xx. |
| (prereq) Terminate | `POST /api/v2/pim/employees/{n}/terminations` used to build fixtures. |
| (prereq) Create employee | `POST /api/v2/pim/employees` used to build fixtures. |

---

## Decision Rationale (contested assignments)

- **TC-100 / TC-101 split across E2E + API.** The *rule* (which employees are eligible) is a server contract → API. The *user-visible consequence* (dropdown contents) is what a QA cares about day-to-day → E2E. Both are cheap; keeping both gives defense-in-depth against a UI that filters correctly while the API doesn't (or vice-versa).
- **TC-104 purge irreversibility at API, not just E2E.** The UI only shows "the name no longer matches"; proving the record is actually gone (422 on direct GET) is a backend assertion. Do it at the API layer.
- **TC-103 re-prompt kept at E2E only.** It depends on navigating away and back within a live session — not expressible at the API layer.
- **Purge happy path (TC-002) stays E2E despite being expensive.** It is the module's reason to exist and the confirm-dialog + reset behavior is only real in a browser. Fixtures (create + terminate) are built via API to keep the test self-contained and fast up to the UI action.
- **No Unit/Component.** The client is stock OXD widgets with no branching logic; a component test would assert the framework, not our behavior. Pushing lower would test nothing meaningful.

---

## Anti-Patterns Checked (existing suites)

- No existing Maintenance tests to regress. Reviewed sibling suites (`tests/claim/events.spec.ts`, `tests/pim/*`) as the convention baseline.
- Guard against the classic ice-cream-cone here: resist asserting the `onlyPast`/`currentAndPast` *query contract* purely through the dropdown — it is pinned at the API layer (TC-204) so a UI-only refactor can't silently drop the server filter.
- Avoid E2E-testing "empty password required" as a backend concern — it is a gate-form UI behavior (TC-300), correctly at E2E.
