# Test Priority: Add Entitlements (E2E Only)

> Input: docs/test-strategy.md
> Scope: E2E tests only (22 scenarios)
> Layer: Playwright, tests/leave/leave-entitlements.spec.ts
> Generated: 2026-05-26

---

## P0 — Release Blocking

These tests cover core business flows with no workaround. A failure here means the feature is broken.

| TC     | Title                                              | Rationale                                                                                       |
|--------|----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| TC-001 | Add entitlement to single employee (Individual)    | The primary happy path for the entire feature. If this fails, no entitlement can be assigned at all — every leave request would fail with "Leave balance exceeded". Release blocker. |
| TC-002 | Bulk Assign by Sub Unit                            | The bulk assign flow is used by HR admins to push annual entitlements to entire departments. Failure here would require manual entry for every employee — operationally infeasible. |
| TC-200 | ESS user cannot access Add Entitlements page       | Security / compliance. If an ESS user can assign their own entitlements, it's a data integrity and compliance failure. No workaround. |
| TC-300 | Submit with no employee selected                   | Required field guard. If this validation is absent, malformed API calls can be submitted, causing backend errors or silent data corruption. |
| TC-301 | Submit with no leave type selected                 | Same as TC-300 — required field guard for leave type. Missing validation means null leave type in DB. |

---

## P1 — High Business Impact

These tests cover significant features with high user reach. Failures degrade the product materially.

| TC     | Title                                              | Rationale                                                                                       |
|--------|----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| TC-005 | Added entitlement reflects in employee leave balance | Cross-module integration: entitlement assigned → balance updated. If the balance doesn't reflect, employees cannot successfully apply leave. High reach. |
| TC-102 | Bulk confirm modal shows employee count            | Users need to confirm the scope of bulk changes. If the count is wrong, admins may unknowingly over- or under-assign entitlements. High business impact. |
| TC-104 | Cancel on bulk modal aborts save                   | If cancel doesn't actually abort the save, the admin loses control of the bulk operation. High data integrity risk. |
| TC-302 | Submit with entitlement = 0                        | If 0 is accepted as valid, employees are assigned 0 days, which has the same visible effect as no entitlement but silently looks "assigned". Confusing and impactful. |
| TC-303 | Submit with negative entitlement                   | Negative entitlement would produce a negative leave balance — likely causes calculation errors downstream in leave requests. Data integrity risk. |
| TC-307 | Submit all fields blank                            | All-required-fields smoke test. If the form submits with empty data, backend errors or null-pointer exceptions may follow. |
| TC-500 | Toggle Individual/Multiple mode changes fields     | If the toggle doesn't properly show/hide fields, admins see the wrong form — they may submit individual-mode data when trying to bulk assign, causing data issues. |

---

## P2 — Moderate Impact

Secondary flows, edge cases on common paths, or cases where a workaround exists.

| TC     | Title                                              | Rationale                                                                                       |
|--------|----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| TC-003 | Bulk Assign by Location                            | Same bulk flow as TC-002 but with a different filter dimension. TC-002 already validates the core bulk path; this adds coverage for Location filter specifically. Workaround: use Sub Unit filter. |
| TC-004 | Bulk Assign by Job Title                           | Similar to TC-003 — additional filter coverage. Workaround exists (use Sub Unit). |
| TC-006 | Add entitlement with decimal days (0.5)            | Fractional entitlement is valid but less common. If broken, workaround is integer days. |
| TC-100 | Without entitlement, balance is 0.00               | Validation of the default state (no entitlement = 0 balance). Important for understanding the system, but not a "feature" being exercised. |
| TC-101 | Leave Period auto-populates with current period    | UX convenience. If the auto-populate is broken, admin must manually select the period — annoying but not blocking. |
| TC-103 | Entitlement is per employee per leave type/period  | Duplicate-entry behavior. Important to define but a workaround (navigate to employee entitlements and edit) exists. |
| TC-304 | Submit with non-numeric entitlement                | Type validation. OXD input likely prevents typing non-numeric characters; this is a safety net. Low probability of user reaching this state. |
| TC-502 | Employee autocomplete filters correctly            | Autocomplete UX. A broken autocomplete still allows searching — just less convenient. Moderate impact. |
| TC-503 | Success toast appears                              | Feedback UX. If the toast is absent but the save succeeded, the only impact is the user is uncertain whether the save worked. |

---

## P3 — Low Impact / Cosmetic

Rare edge cases, cosmetic UI states, or scenarios with easy workarounds.

| TC     | Title                                              | Rationale                                                                                       |
|--------|----------------------------------------------------|-------------------------------------------------------------------------------------------------|
| TC-202 | Admin cannot select non-existent leave type        | OXD dropdown inherently prevents free-text input; this is defensive. Very unlikely regression. |
| TC-400 | Entitlement = 1 day (boundary)                     | Boundary value already covered by TC-001 (happy path accepts any positive integer). Minimal additional value. |
| TC-401 | Entitlement = 365 days (large value)               | Extreme upper boundary. No documented max constraint — likely works fine. Rare use case. |
| TC-501 | Leave Period dropdown lists available periods      | Read-only UI state check. If a period is missing from the dropdown, it's an admin config issue, not a code bug. Low automation value. |
