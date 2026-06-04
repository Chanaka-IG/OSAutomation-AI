# Test Priority — Leave Entitlements and Usage Report

> Input: `docs/test-strategy_Leave Entitlements and Usage Report.md`.
> Scope: **E2E scenarios only** (per skill). The 17 E2E-assigned cases are prioritised P0–P3 by business impact, failure risk, and user reach. API/Component cases are out of scope for this priority pass.
> Consumed by `generate-tests` — which writes **P0 + P1 only**.

## E2E scenarios under consideration
TC-001, TC-002, TC-004, TC-005, TC-006, TC-007, TC-201, TC-202, TC-203, TC-301, TC-302, TC-303, TC-404, TC-405, TC-501, TC-502, TC-503, TC-504, TC-505, TC-506, TC-507.

---

## P0 — Release-blocking
Core report-generation flow, primary self-service path, and access control. If any fail, the feature is unusable or unsafe to ship.

| ID | Scenario | Rationale |
|---|---|---|
| TC-001 | Admin generates report by **Leave Type** | The primary purpose of the feature. If Generate doesn't produce a grid, the report is broken. No workaround. Highest reach (admins/HR). |
| TC-002 | Admin generates report by **Employee** | The second core generation mode; one of the two reasons the page exists. No workaround. |
| TC-004 | ESS opens **My Leave Entitlements and Usage Report** | Primary self-service path with the widest user reach (every employee). Auto-generation must work. |
| TC-201 | Unauthenticated Admin report → login redirect | Security/compliance: report exposes every employee's leave data. A leak here is release-blocking. |
| TC-203 | ESS **cannot** reach the Admin (all-employee) report | Security/data-isolation: an ESS reaching all employees' balances is a confidentiality breach. |
| TC-503 | Result grid shows the **documented columns** | The report's value is the data it shows; wrong/missing columns make the generated report meaningless. Guards the core contract end-to-end. |

## P1 — High impact
High-reach primary-path behaviors and key validations; not strictly release-blocking but a poor experience if broken.

| ID | Scenario | Rationale |
|---|---|---|
| TC-202 | Unauthenticated My report → login redirect | Auth guard on the high-traffic self report. Same protection as TC-201 but lower data-exposure (self only), so P1. |
| TC-301 | Employee mode requires Employee Name | Primary guardrail for Employee mode; prevents a confusing empty/incorrect generate. High reach on the Admin path. |
| TC-501 | Leave Type criteria controls render | If the criteria panel is broken, generation can't be configured — high impact, but adjacent to TC-001 which would also catch a total failure. |
| TC-502 | Employee criteria controls render (Name + Period only) | Confirms the Employee-mode field set; underpins TC-002/TC-301. |
| TC-504 | Empty result → "No Records" state | Common path (filters that match nothing); a broken empty-state reads as an app error to users. |
| TC-506 | My report renders with no criteria/employee selector | Confirms the self-scoped UX for the widest audience; complements TC-004. |

## P2 — Moderate impact
Secondary flows, edge interactions, and validations with workarounds or narrower reach.

| ID | Scenario | Rationale |
|---|---|---|
| TC-005 | Export to CSV | Useful secondary action; data is still viewable on-screen if export breaks (workaround exists). |
| TC-006 | Drill-down from Entitlement cell | Convenience navigation; the same screen is reachable via the Leave menu (workaround). |
| TC-007 | Drill-down from status cell | As above — convenience deep link. |
| TC-302 | Leave Period required | Period defaults to the current period, so a user rarely hits this; lower likelihood. |
| TC-303 | Invalid (unresolved) employee name | Edge of the Employee-mode autocomplete; users normally pick a hint. |
| TC-404 | Default Leave Period = current period | Sensible-default check; low failure risk, moderate value. |
| TC-405 | Generate-For toggle swaps criteria | UI smoke for mode switching; partially covered by TC-501/502. |
| TC-505 | Records-Found count only after Generate | On-demand-render detail; minor. |

## P3 — Low / cosmetic
Rare, easily bypassed, or nice-to-have.

| ID | Scenario | Rationale |
|---|---|---|
| TC-507 | Column-config toggle (configure displayed fields) | Power-user customization; rarely used, defaults are fine, easily bypassed. Cosmetic/nice-to-have. |

---

## Priority Summary

| Priority | Count | IDs |
|---|---|---|
| **P0** | 6 | TC-001, TC-002, TC-004, TC-201, TC-203, TC-503 |
| **P1** | 6 | TC-202, TC-301, TC-501, TC-502, TC-504, TC-506 |
| **P2** | 8 | TC-005, TC-006, TC-007, TC-302, TC-303, TC-404, TC-405, TC-505 |
| **P3** | 1 | TC-507 |
| **Total (E2E)** | 21 | |

➡️ **`generate-tests` will implement the 12 P0 + P1 cases.**
