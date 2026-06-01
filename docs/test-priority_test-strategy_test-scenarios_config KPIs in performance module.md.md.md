# Test Priority: Configure KPIs (Performance Module) — E2E Scenarios

**Feature**: Performance → Configure → KPIs
**Input**: `docs/test-strategy_test-scenarios_config KPIs in performance module.md.md` (43 E2E scenarios)
**Scope**: E2E layer only (API/Component/Unit excluded — prioritized separately)
**Generated**: 2026-05-31

---

## Priority Distribution

| Priority | Count | Definition applied |
|----------|-------|--------------------|
| **P0** | 7 | Blocks release: core CRUD, Admin-only access enforcement, data integrity |
| **P1** | 13 | High-impact primary paths: filtering, default-scale, delete-protection, key validations, count integrity |
| **P2** | 14 | Secondary flows, common-path edge cases, workaround exists |
| **P3** | 9 | Cosmetic, rare edge cases, nice-to-have UI-state checks |
| **Total** | **43** | |

---

## P0 — Critical (Blocks Release)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-001 | List loads with correct columns/records | The feature's entry point. If the KPI list doesn't render, the entire screen is unusable — no workaround. Gates every other test. |
| TC-005 | Add a KPI with all valid fields | Core create flow — the primary reason the screen exists. KPIs feed performance reviews; failure blocks the whole performance-review setup. No workaround. |
| TC-010 | Delete a single KPI via row action | Core destructive CRUD with data-integrity impact. Must remove the right record and decrement the count correctly. |
| TC-201 | ESS direct-URL to searchKpi blocked | Security/compliance: server-side authorization, not just menu hiding. An ESS reaching KPI config is a real access-control breach. No workaround. |
| TC-203 | Unauthenticated → login redirect | Security baseline — every module page must require a session. A leak here is release-blocking. |
| TC-205 | Supervisor cannot configure KPIs | Security: supervisor ≠ admin for configuration. Privilege-boundary enforcement; compliance-relevant. |
| TC-008 | Edit an existing KPI's title | Core update CRUD. Editing is a primary maintenance path; broken save corrupts/loses configuration data. |

**Contested:** TC-008 (Edit) placed at **P0 not P1** — together with Add (TC-005) and Delete (TC-010) it completes the core CRUD triad; an admin who cannot correct a KPI title has no workaround and review scales stay wrong. TC-201/203/205 are all **P0** despite being "just" access checks because they are the security contract of an Admin-only screen — the highest-consequence failure class with no mitigation.

---

## P1 — High (Primary Feature Path, High Reach)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-002 | Filter KPIs by Job Title | Primary navigation aid on a 50+ record list; the OXD-dropdown→server-filter path is the main way admins find KPIs. High reach. |
| TC-003 | Reset clears the Job Title filter | Direct partner to TC-002; broken reset traps the admin in a filtered view. High-frequency. |
| TC-004 | Add button → form | Gateway to the entire create flow (TC-005). If navigation fails, Add is unreachable. |
| TC-006 | Add using default scale 0–100 | The most common add case (defaults left untouched); verifies the canonical happy path stores correctly. |
| TC-007 | Add as the default scale | Default-scale flag drives which scale reviews use — meaningful data-integrity impact on the review cycle. |
| TC-009 | Edit a KPI's Min/Max rating | Common maintenance edit; rating range feeds review scoring. High impact if mis-saved. |
| TC-011 | Bulk delete via checkboxes | Primary efficiency path for cleanup; destructive + data integrity (must delete exactly the selected rows). |
| TC-103 | KPI used by a review cannot be deleted | Referential-integrity guard — prevents orphaning review data. High-consequence rule; UI affordance (Edit-only) is the user-visible safeguard. |
| TC-104 | Job Title dropdown lists only real job titles | Prevents creating KPIs against invalid titles (data integrity at input). Primary form interaction. |
| TC-100 | Max must be greater than Min (inline message) | Guards an invalid rating scale reaching reviews; the most semantically important validation. |
| TC-101 | Ratings constrained 0–100 (inline message) | Core bound validation on a required field; high reach (every add/edit touches ratings). |
| TC-506 | "Records Found" count updates after add/delete | Cross-action integrity signal — a wrong count masks failed/duplicate writes. Reflects real data state. |
| TC-509 | Delete confirmation can be cancelled | Safety net on a destructive action with no undo; protects against accidental data loss. High user reach. |

**Contested:** TC-103 at **P1 not P0** — it protects review integrity, but it's an observed safeguard rather than a create/access core flow, and its API facet is covered separately; still high because data loss would be silent. TC-100/101 at **P1 not P0** — the *server* enforces these rules at API (release-gated there); the E2E facet validates the user-facing message, which is high-value but not the sole guard. TC-509 raised to **P1** (above other UI-state) because it is the only barrier between a click and irreversible deletion.

---

## P2 — Medium (Secondary Flows, Common-Path Edge Cases)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-012 | Sort by Job Title / KPI name | Convenience on the list; useful at scale but a workaround (filter/scroll) exists. |
| TC-013 | Pagination between pages | Needed beyond 50 records; moderate reach, workaround via filtering. |
| TC-014 | Cancel on Add returns without saving | Common interaction; low data risk (no write), but confirms no accidental create. |
| TC-015 | Select-all header checkbox | Bulk-action convenience; supports TC-011 but not itself a primary path. |
| TC-107 | Boundary ratings 0 and 100 accepted | Common-path boundary; ensures the default scale itself is accepted. Moderate impact. |
| TC-200 | ESS has no Configure KPIs menu | Defense-in-depth on access — the *enforcement* is already covered by TC-201 (direct URL). Menu-hiding is the softer, secondary control. |
| TC-206 | XSS payload in title escaped on render | Security-relevant, but a narrow injection vector behind an Admin-only form (low attacker reach); moderate not critical. |
| TC-300 | Empty title → inline `Required` | Representative required-field UI message; common error but server-enforced at API, so E2E is secondary. |
| TC-304 | Non-numeric rating → inline message | Client-only reactive validation; common typo path, moderate impact. |
| TC-401 | Unicode / special-char title | Realistic data (demo has apostrophes); render-fidelity matters but a corrupted title is cosmetic, not blocking. |
| TC-407 | Very long title display in table | Layout robustness on real long titles; moderate — affects readability, not function. |
| TC-408 | Add crosses a pagination boundary | Common-path edge (count hits 50→51); verifies paging recompute. Workaround: refresh. |
| TC-503 | Add form pre-fills Min 0 / Max 100 | Common UX expectation that speeds the happy path; mis-default is recoverable by typing. |
| TC-504 | Default-scale rows show "Yes" | Visible confirmation of the default flag (data covered at API); moderate informational value. |

**Contested:** TC-200 at **P2 not P0** — true authorization is enforced and tested at TC-201; the menu is a secondary, cosmetic-leaning control, so its failure alone isn't a breach. TC-206 at **P2 not P0** — XSS is normally P0, but the field is reachable only by an already-trusted Admin, sharply limiting reach and severity. TC-107 at **P2 not P1** — boundary acceptance is also asserted at API (TC-402/403); the E2E adds display confirmation only.

---

## P3 — Low (Cosmetic, Rare Edge, Nice-to-Have)

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-406 | Rating with leading zeros (`050`→`50`) | Rare input quirk; client normalization. Cosmetic, easily bypassed. |
| TC-410 | Whitespace-only title → `Required` after trim | Rare input; server trim covered at API (TC-405). Edge of an edge. |
| TC-500 | Loading shimmer before rows render | Transient cosmetic state; no functional consequence. |
| TC-501 | Empty state on no-match filter | Nice-to-have messaging; low frequency, no data impact. |
| TC-502 | Inline errors clear when input becomes valid | Reactive-validation polish; convenience only. |
| TC-505 | In-use KPI shows Edit only (no Delete) | Display facet of TC-103 (already P1); redundant safety signal at the UI. |
| TC-507 | Row checkbox reveals "Delete Selected" | Conditional-toolbar affordance supporting TC-011; minor UI state. |
| TC-508 | Heading text exactly correct | Pure cosmetic/page-identity assertion. |
| TC-510 | Save shows busy/disabled state (no double-submit) | Nice-to-have UX guard; double-submit risk is low and recoverable. |

**Contested:** TC-505 at **P3** — it overlaps TC-103 (P1, the actual protection rule); as a standalone display check it's a redundant nice-to-have. TC-510 kept at **P3 not P2** — double-submit is the only real risk, but it's an unlikely, recoverable event behind an Admin form; cosmetic-leaning.

---

## Notes for Test Generation

- **Generation order**: P0 → P1 → P2 → P3. P0s gate the suite (smoke-level); a P0 failure should fail the build.
- **Dependencies**: TC-004 (P1) is a precondition for TC-005 (P0); TC-001 (P0) gates list-dependent tests; TC-015/TC-507 support TC-011. Seed/setup KPIs via the admin API before destructive P0/P1 tests.
- **Security cluster** TC-201/203/205 (P0) should run early as an access-control smoke gate.
- Five scenarios carry verification flags from the strategy doc (TC-103, plus API TC-102/109/400/404) — when implementing the P1 TC-103, assert the *observed* delete-protection behavior rather than assuming.
