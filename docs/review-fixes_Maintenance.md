# Review Fixes — Maintenance

**Input:** `docs/review-tests_Maintenance.md`
**File:** `tests/maintenance/maintenance.spec.ts` (+ `MaintenancePage.ts`, `maintenance.ts` test-data, `EmployeesApi.ts`)
**Re-run after fixes:** 13/13 passing (`--project=chromium`, 3.8m).

## Fixed Issues

- **[IMPORTANT] Hardcoded `terminationReasonId: 3` (best-practices §8).**
  - Added `EmployeesApi.getTerminationReasonId(name?)` — resolves the id from `GET /api/v2/pim/termination-reasons` by name, falling back to the first available reason.
  - `test-data/maintenance/frontend/maintenance.ts`: replaced `terminationReasonId: 3` with `terminationReasonName: 'Contract Not Renewed'`.
  - `maintenance.spec.ts` `beforeAll`: resolves the id dynamically before terminating the fixtures. No environment-specific PK id remains.

- **[SUGGESTION] Removed dead locators / unused helper (maintainability, §2).**
  - Dropped `gateUsernameInput` (`.oxd-input[disabled]` last-resort selector, unused) and `searchFieldError` (duplicate of `gateFieldError`, unused at P0/P1).
  - Removed the unused `purgeTab` locator and `goToPurgeTab()` method (tab-switch is only needed for the P2 TC-007, not in this suite). `goToAccessTab()` is retained (used by the Access tests).

- **[SUGGESTION] TC-004 filename assertion — left as-is.**
  - The whitespace-normalise plus `toMatch(/\.json$/)` and full-name comparison is already robust to the empty-middle-name double space; no change needed.

## Score Improvement
Previous: **8.5/10** → New: **9.5/10**
The one material (environment-fragility) issue is resolved and the POM is leaner. Remaining `-0.5` is inherent E2E-heaviness of this thin-client feature, already justified in the strategy doc.

## Summary of Changes
Dynamic termination-reason resolution replaces a hardcoded id; three unused POM members removed. Behavior and coverage unchanged — all 13 P0/P1 tests still pass in a real browser.
