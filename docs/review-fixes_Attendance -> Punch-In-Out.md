# Review Fixes — Attendance → Punch-In/Out

> Input: `docs/review-tests_Attendance -> Punch-In-Out.md`.
> Scope: all `[IMPORTANT]` issues + the two quick `[SUGGESTION]`s. Re-verified against a real browser.

## File: `tests/attendance/punch-in-out.spec.ts`

### Fixed Issues
1. **[IMPORTANT] State/data setup in the test body (TC-100).** Extracted the "already punched in"
   precondition into a nested `describe('When already punched in')` whose `beforeEach` seeds the open
   punch via `AttendanceApi.punchIn(...)`. The TC-100 body now contains only navigation + assertions.
   (best-practices §"Add data via APIs" — setup belongs in hooks.)
2. **[IMPORTANT] Hardcoded notes passed from the test body.** `'already-in'` → `attendance.samples.alreadyInNote`;
   the reset note `'reset'` → `attendance.samples.resetNote`. No string literals are now passed into the
   page/API layer from the spec (best-practices §"Pass data to Page class from test body").
3. **[SUGGESTION] Generic navigation in TC-101.** Replaced `punchPage.goto(routes.punchOut)` +
   raw loader wait with the new `punchPage.gotoPunchOut()` method — route knowledge now lives in the POM.

## File: `src/pages/attendance/PunchPage.ts`
4. **[SUGGESTION] Hardcoded admin-screen heading strings.** `attendanceConfigHeading` /
   `employeeRecordsHeading` now source their names from `attendance.headings.configuration` /
   `attendance.headings.employeeRecords`. Added `gotoPunchOut()`.

## File: `src/api/orangehrmOSAPI/AttendanceApi.ts`
5. **[IMPORTANT] Hardcoded reset note.** `ensurePunchedOut()` now uses `attendance.samples.resetNote`.

## File: `test-data/time/frontend/attendance.ts`
- Added `headings.configuration`, `headings.employeeRecords`, `samples.alreadyInNote`, `samples.resetNote`.

## Verification
- `npx playwright test tests/attendance/punch-in-out.spec.ts --config automation.config.ts --project=chromium`
  → **13 passed (4.0m)**. The reset/seed logs confirm the new note values (`PIO reset`, `PIO already-in`).

## Score Improvement: **8.5/10 → 9.5/10**
All `[IMPORTANT]` deviations resolved; both quick `[SUGGESTION]`s applied. Remaining `.locator('span').filter()`
counters are an accepted last-resort (no stable role/testid in OXD) and were documented, not defects.

## Summary of Changes
Setup moved to hooks, every literal sourced from test data, route knowledge encapsulated in the POM, and
admin-screen strings centralized — all without changing behaviour or coverage (still 13/13 P0+P1, one test
per scenario).
