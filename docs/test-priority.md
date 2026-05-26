# Test Priority: PIM Reports (E2E Only)

**Input**: `docs/test-strategy.md`  
**Scope**: E2E tests only (26 scenarios)  
**Layer**: Playwright, `tests/pim/pim-reports.spec.ts`

---

## P0 — Release Blocking

Core business flows, security, and data integrity. A failure here blocks release.

| TC ID  | Title                                                         | Rationale                                                                                        |
|--------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| TC-003 | Add minimal report (Report Name only) → saves and appears in list | Core create flow. If add is broken, the entire Reports feature is unusable.                |
| TC-007 | View report data via document icon                            | Core read flow. Viewing report data is the primary purpose of the feature.                       |
| TC-100 | Save without Report Name shows "Required" error               | Required field not enforced → users can create nameless reports, breaking list rendering.        |
| TC-201 | Unauthenticated access to reports list redirects to login     | Auth guard failure = PII data (employee reports) exposed without login. Security release blocker. |
| TC-200 | ESS user cannot access PIM Reports                            | Role bypass = ESS can see all employee data. Compliance and security release blocker.            |

**P0 Count: 5**

---

## P1 — High Business Impact

Primary feature paths and major integrations. High user reach; failures significantly degrade the feature.

| TC ID  | Title                                                         | Rationale                                                                                        |
|--------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| TC-001 | Navigate to PIM Reports via top menu                          | Navigation entry point — if the menu link is broken, no user can reach Reports.                 |
| TC-002 | Default PIM Sample Report exists on fresh install             | Default report is a core product expectation; regression here is immediately visible to all users.|
| TC-005 | Add report with one Display Field (group → field → Add)       | Display Fields are the primary value of custom reports. Must work correctly.                    |
| TC-006 | Add full report (Selection Criteria + Include + Display Fields) | Full form save — validates all three sections together.                                         |
| TC-008 | Edit existing report name                                     | Update flow — users regularly rename and refine reports.                                        |
| TC-009 | Delete a user-created report                                  | List management — builds up stale reports without delete.                                       |
| TC-101 | Selection Criteria not committed without Add click            | Non-obvious two-step UX — if silently broken, users think they've filtered but haven't.         |
| TC-102 | Display Field not committed without Add click                 | Same two-step UX. Silent data loss in report configuration.                                     |
| TC-300 | Cancel returns to list without saving                         | Cancel must not persist data. A broken Cancel creates phantom reports.                          |
| TC-402 | Duplicate report name shows error                             | Without this, two reports with the same name cause list confusion.                              |

**P1 Count: 10**

---

## P2 — Moderate Impact

Secondary flows and edge cases on common paths. A workaround exists or user reach is moderate.

| TC ID  | Title                                                         | Rationale                                                                                        |
|--------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| TC-004 | Add report with one Selection Criteria (Add icon flow)        | Valid path but covered implicitly by TC-006; lower standalone priority.                         |
| TC-010 | Search by name returns matching report                        | Search is a convenience feature; workaround is manual scroll.                                   |
| TC-011 | Search with no match returns empty state                      | Empty state rendering — UX regression but not data integrity.                                   |
| TC-012 | Reset search restores full list                               | Reset UX — low risk regression.                                                                 |
| TC-103 | Include dropdown defaults to "Current Employees Only"         | Default value regression — visible but not blocking.                                            |
| TC-105 | Multiple selection criteria added and persisted               | Edge of primary flow; secondary use case.                                                       |
| TC-106 | Multiple display fields from different groups                 | Common usage pattern for advanced reports; high value but not blocking.                         |
| TC-107 | Remove display field via × button                             | Edit-in-place interaction; regression is a nuisance, not blocking.                             |
| TC-505 | View report shows heading + data rows                         | Detailed rendering assertion; partially covered by TC-007 (P0).                                |

**P2 Count: 9**

---

## P3 — Low / Cosmetic

Rare edge cases, cosmetic issues, or easily bypassed. Nice-to-have validations.

| TC ID  | Title                                                         | Rationale                                                                                        |
|--------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| TC-404 | XSS probe in Report Name does not execute                     | Security edge case — important but OrangeHRM's general XSS mitigation covers this globally.     |
| TC-302 | Display Field Add without selecting a field is a no-op        | Boundary of UX robustness; no data loss risk.                                                   |
| TC-303 | Selection Criteria Add without selecting is a no-op           | Same pattern as TC-302; cosmetic guard.                                                         |
| TC-503 | Add Report page heading is "Add Report"                       | Heading text assertion — cosmetic regression.                                                   |
| TC-504 | Edit Report page heading is "Edit Report" and pre-fills name  | Heading text assertion — cosmetic regression.                                                   |
| TC-506 | Loading spinner shows while list loads                        | Timing-sensitive UI state; flaky risk outweighs benefit.                                        |

**P3 Count: 6**

---

## Summary

| Priority | Count | Generate Tests? |
|----------|-------|-----------------|
| P0       | 5     | YES             |
| P1       | 10    | YES             |
| P2       | 9     | NO (future)     |
| P3       | 6     | NO              |
| **Total E2E** | **30** | **15 tests generated** |
