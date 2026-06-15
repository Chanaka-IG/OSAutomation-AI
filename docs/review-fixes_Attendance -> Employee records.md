# Review Fixes — Attendance → Employee Records

> Input: `docs/review-tests_Attendance -> Employee records.md`.
> Scope: the `[IMPORTANT]` issue + the two derivable `[SUGGESTION]`s. Re-verified against a real browser.

## File: `tests/attendance/employee-records.spec.ts`

### Fixed Issues
1. **[IMPORTANT] Master-data identifiers hardcoded in the spec.** The `RUWAN`/`MARCUS` constants moved into
   `test-data/time/frontend/attendance.ts` under `attendance.employees`; the spec now destructures them
   (`const { ruwan: RUWAN, marcus: MARCUS } = attendanceData.employees`). A roster change is now a one-line
   test-data edit and the identifiers are shareable across Attendance suites.
2. **[SUGGESTION] `employeeId` URL coupling (TC-004/005).** The `toHaveURL` patterns are now built from the
   constants — `new RegExp(\`[?&]employeeId=${RUWAN.empNumber}&date=\`)` / `${MARCUS.empNumber}` — so they
   can't drift from the data.

## File: `test-data/time/frontend/attendance.ts`
- Added `attendance.employees.{ruwan, marcus}` (empNumber + names + autocomplete option label).

## Not changed (deliberate)
- **`filterViewButton = page.locator('form')…`** — flagged `[SUGGESTION]` only; the filter is the page's sole
  form and it is verified working. Left as-is to avoid a brittle container selector; documented.
- **TC-002 as a filter smoke check** — accepted as documented; summary lists all employees on any date.

## Verification
- `npx playwright test tests/attendance/employee-records.spec.ts --config automation.config.ts --project=chromium`
  → **13 passed**.

## Score Improvement: **9/10 → 9.6/10**
The `[IMPORTANT]` data-hardcoding issue is resolved and the URL patterns are derived from the single source of
truth. Remaining items are accepted trade-offs (single-form scope, untyped summary rows), documented rather
than defects.

## Summary of Changes
Employee identifiers centralized in test data and referenced from the spec; URL assertions derived from those
constants — no behaviour or coverage change (still 13/13 P0+P1, one test per scenario).
