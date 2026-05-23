# Test Priority: Add Vacancies — E2E Tests

> **Input**: `docs/test-strategy.md` — 27 E2E scenarios + TC-103 (defense-in-depth, confirmed E2E in strategy §2b†)
> **Total E2E tests prioritized**: 28
> **Feature**: Recruitment → Vacancies → Add Vacancy
> **Generated**: 2026-05-23

---

## Priority Summary

| Priority | Count | Meaning |
|----------|------:|---------|
| **P0** | 5 | Blocks release — core flow or security |
| **P1** | 12 | Primary feature path — high user reach |
| **P2** | 9 | Secondary flows and common-path edge cases |
| **P3** | 2 | Cosmetic / rare edge cases |
| **Total** | **28** | |

---

## P0 — Blocks Release

> These tests MUST pass before any release. A failure here means either the core feature is broken or a security/compliance boundary has been crossed. No workaround exists for the user.

| TC | Title | Rationale |
|----|-------|-----------|
| TC-001 | Add vacancy — required fields only (full save flow) | **Core business flow.** This is the fundamental act of creating a vacancy. If the save → toast → list-verify chain fails, the entire feature is broken. Every other scenario depends on this working. No workaround exists. |
| TC-007 | Created vacancy appears in the Candidate Vacancy dropdown | **Data integrity + pipeline integrity.** A vacancy that cannot be selected when adding a candidate is a dead vacancy — it severs the recruitment pipeline. The FK linkage between vacancy and candidate is the backbone of the Recruitment module. |
| TC-200 | ESS user — Recruitment menu is not visible | **Security / role enforcement.** ESS users must not have access to Recruitment. Visible menu items are a direct authorization boundary. A breach here exposes vacancy data and creation capabilities to unauthorized users. Directly maps to business-rules.md §2. |
| TC-201 | ESS user — direct URL `/recruitment/viewVacancies` is blocked | **Security / defense-in-depth.** Menu hiding alone is not sufficient — direct URL access must also be blocked. This is the second layer of the same authorization boundary. Together, TC-200 and TC-201 constitute the complete ESS access-control test. |
| TC-205 | XSS probe in Vacancy Name does not execute | **Security / compliance.** If user-supplied input is executed as a script in the browser, any admin viewing the Vacancies list is at risk of session hijacking. The test must run in a real Chromium context (dialog-fired assertion pattern, matching `add-employee.spec.ts:421`). OXD input must render the name as escaped text only. |

---

## P1 — High Business Impact

> These tests cover the primary feature path, high-reach interactions (every user creating a vacancy hits these), and data-quality rules that protect the integrity of the recruitment pipeline.

| TC | Title | Rationale |
|----|-------|-----------|
| TC-002 | Add vacancy — all fields including optional (description, isPublished, status) | **Primary feature coverage.** The optional fields (description, isPublished, status) are the fields that differentiate active published vacancies from draft/closed ones. The `isPublished` toggle controls job-site visibility — a feature HR teams use on every vacancy they publish. |
| TC-100 | Job Title is a constrained OXD dropdown (not free-text) | **Data quality on primary path.** Every vacancy creation begins with selecting a Job Title. If the control allows free-text input, invalid or inconsistent job titles enter the system, corrupting the FK relationship used by KPI assignments, reports, and the candidate pipeline. |
| TC-101 | Hiring Manager autocomplete shows only active employees | **Data quality on primary path.** The Hiring Manager field is used on every save. If the autocomplete surfaces non-employees or system users, the FK `hiringManagerId` can be set to an invalid employee, causing downstream failures when the hiring manager reviews candidates. |
| TC-102 | Terminated employee is excluded from the Hiring Manager autocomplete | **Business rule enforcement (browser layer).** Terminated employees must not appear as Hiring Manager options. The API layer (TC-102†) validates the POST; this E2E test validates that the **autocomplete never surfaces them** — so the bad assignment cannot even be attempted via the UI. Defense-in-depth with the API test. |
| TC-103 | Duplicate Vacancy Name — error toast shown, form does not navigate away | **Data integrity.** Vacancy names must be unique (domain model constraint). If duplicates are allowed, vacancy lists become ambiguous and candidate applications may be misrouted. This E2E test verifies the user-visible signal: the toast appears and the URL remains on the add form. The API layer (TC-306) verifies the 422 contract. |
| TC-106 | Closed vacancy is absent from the Candidate Vacancy dropdown | **Recruitment pipeline integrity.** A Closed vacancy is no longer accepting candidates. If it appears in the dropdown, an admin could accidentally assign a new candidate to a closed role — creating orphaned pipeline entries with no active hiring process behind them. |
| TC-300 | Submit empty form — all four required fields show "Required" inline | **Primary validation UX.** All users creating a vacancy will encounter required field validation at some point. This test verifies the complete required-field set fires simultaneously and the form stays put. It is the single most informative validation test for the feature. |
| TC-301 | Save without Vacancy Name — "Required" error on that field | **Required field — primary identifier.** Vacancy Name is the unique human-readable identifier of a vacancy record. Without it, nothing in the recruitment module (candidate lists, filters, pipeline views) is labeled. |
| TC-302 | Save without Job Title — "Required" error on that field | **Required field — FK anchor.** Job Title is mandatory per the domain model and drives KPI assignments and filtering. |
| TC-303 | Save without Hiring Manager — "Required" error on that field | **Required field — process owner.** The Hiring Manager is the person responsible for reviewing candidates. Without them, the vacancy has no accountable reviewer. |
| TC-310 | Cancel returns to Vacancies list; no record is created | **Data integrity + UX.** If Cancel silently creates a partial record, admins will find ghost vacancies that cannot be completed. The test asserts record count is unchanged — no record is left behind. This also confirms the navigation returns to the correct parent page. *(TC-507 is a duplicate of this test; implement once.)* |
| TC-504 | Hiring Manager autocomplete narrows as the user types | **Primary UX interaction — high frequency.** Every vacancy creation involves the autocomplete interaction. The OXD autocomplete must filter suggestions as the user types so they can find the right employee in large organizations. If filtering breaks, users cannot efficiently assign a Hiring Manager. |

---

## P2 — Secondary Flows / Common-Path Edge Cases

> These tests cover behaviours that are important but affect narrower scenarios or have a workaround. They should run in CI but are not release-blockers on their own.

| TC | Title | Rationale |
|----|-------|-----------|
| TC-105 | Published vacancy is visible on the public job site | **Secondary feature — configuration-dependent.** The `isPublished` toggle only matters when a public job portal is configured. Important for companies using OrangeHRM's public job board, but a workaround exists (manual coordination). Priority rises if public recruitment is in scope for this sprint. |
| TC-304 | Positions = 0 — inline OXD range validation visible | **Edge case on a common field.** Users occasionally mistype `0`; the inline error must appear. The same constraint is also tested at API (TC-104), so a CI failure here is an indication of an OXD client-side regression rather than a server contract break. |
| TC-311 | Autocomplete shows "No Records Found" for an unmatched query | **OXD empty-state UX.** Users will type partial names that don't match any employee. Without a "No Records Found" signal, they may not realize their query failed and may submit with an empty field. Workaround: user clears the field and retries. |
| TC-405 | Special characters in Vacancy Name render correctly in the list | **Internationalization / rendering integrity.** Teams using accented characters (e.g. `C++ Developer & Architect — 2026`) must see their input preserved. If OXD encodes entities, the vacancy name appears garbled. Workaround: avoid special characters — but this is an unacceptable constraint for global teams. |
| TC-408 | Job Title dropdown shows empty state when no Job Titles exist | **System configuration edge case.** On a fresh install or after all Job Titles are deleted, the dropdown must degrade gracefully (show "No Options") rather than crash or show a JS error. Low user reach but important for first-time setup and clean-state tests. |
| TC-409 | Hiring Manager autocomplete shows empty state when no employees exist | **System configuration edge case.** Same as TC-408 but for the autocomplete. Low user reach; relevant for clean-install or edge-case teardown states. |
| TC-502 | Inline "Required" error fires on blur, not only on Save click | **UX quality.** OXD is expected to validate on blur (real-time feedback). If validation only fires on Save, users won't know they missed a field until they try to submit — increasing friction. Workaround: users click Save to discover errors. Not blocking but degrades the authoring experience. |
| TC-503 | Job Title dropdown lists all currently existing Job Titles | **Data completeness.** If some Job Titles are missing from the dropdown, users cannot create vacancies for those roles. Workaround: recreate the Job Title. Medium user impact; likely a caching or sort-order regression. |
| TC-509 | Record count in the list increments by 1 after a successful save | **Post-save state verification.** Confirms the vacancy is actually persisted and visible in the list — one step beyond the success toast. Workaround: manually navigate away and back to confirm. Useful as a regression catch for list-refresh bugs. |

---

## P3 — Cosmetic / Rare Edge Cases

> Low business impact; behaviour that is unlikely to affect users in practice or where the visual effect is the only consequence. Run in nightly suites; skip in fast PR pipelines.

| TC | Title | Rationale |
|----|-------|-----------|
| TC-406 | Leading/trailing whitespace is trimmed in the rendered Vacancy Name | **Cosmetic / input normalisation.** Whitespace-padded names are an unusual input. Whether the trim happens client-side or server-side does not affect functionality — the vacancy is created and usable either way. The uniqueness constraint behaviour with whitespace variants (e.g. `"Test"` vs. `" Test "`) is the only non-cosmetic concern, and that is covered at the API layer (TC-404). |
| TC-500 | Vacancies list shows "No Records Found" empty state | **Cosmetic UI state.** The empty-state node is a DOM element that renders when no vacancies exist. Its absence does not break any functionality — the table is simply blank. Relevant only on clean-install or after all vacancies are deleted; extremely low user reach in a production environment. |

---

## Implementation Order Recommendation

Implement tests in priority order to maximise early signal:

```
Sprint 1 (unblock release):   P0  →  TC-001, TC-007, TC-200, TC-201, TC-205
Sprint 2 (primary coverage):  P1  →  TC-002, TC-100–103, TC-106, TC-300–303, TC-310, TC-504
Sprint 3 (secondary/edges):   P2  →  TC-105, TC-304, TC-311, TC-405, TC-408, TC-409, TC-502, TC-503, TC-509
Sprint 4 (cosmetic):          P3  →  TC-406, TC-500
```
