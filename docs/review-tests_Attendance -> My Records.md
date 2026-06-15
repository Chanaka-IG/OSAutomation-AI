# Test Review — Attendance → My Records

> Reviewer: Lead QA Automation (code review). Checklist: `playwright-best-practices` skill.
> Files reviewed:
> - `tests/attendance/my-records.spec.ts` (primary)
> - `src/pages/attendance/MyAttendanceRecordsPage.ts` (extended this pipeline)
> - `src/api/orangehrmOSAPI/AttendanceApi.ts` (`getRecordsByDate` added)
> - `test-data/time/frontend/attendance.ts`
>
> Status at review time: **12/12 passing** (`--project=chromium`). TC-003 required one self-healing fix
> (viewport-responsive column labels → assert data values instead).

---

## File: `tests/attendance/my-records.spec.ts`

### What's Good
- **One test per prioritized scenario** (TC-ATT-MR-001/002/005/201/203 P0; 003/004/006/200/202/300/500 P1) — 1:1 reporting, no folding (the shape `generate-tests` mandates).
- **All data setup is in hooks, not test bodies** — the seeded describe's `beforeEach` resets state, captures `seedDate`, and seeds a unique cycle via `AttendanceApi`. This directly applies the correction from the previous pipeline's review (`[[`review-tests_Attendance -> Punch-In-Out`]]`).
- **Timezone-safe data strategy**: records are seeded at current server time and the filter uses the API-derived `seedDate` (UTC date) — not the browser's local "today" — so the suite can't break on a runner in a different timezone. The fragile path (seeding an explicit past date) was correctly avoided after the live `400 "Provided Date And Time Invalid"` finding.
- **Assertions compare UI to the contract**: TC-004/005 fetch `meta.sum.label` / `meta.total` and assert the rendered values match — proving fidelity, not just presence.
- **Unique notes** (`MR in <ts>`) identify seeded rows; empty-state uses a **far-past date** (`2015-06-14`) that's always empty — no dependence on cleanup (records can't be deleted with default config).
- No `waitForTimeout`; loaders handled via BasePage helpers. Imports from the fixtures barrel. Locators live in the page object (one minor exception below).
- ESS access modeled correctly as **positive** (My Records is self-service), unlike the admin screens.

### Issues Found

**[IMPORTANT] TC-ATT-MR-005 — `tableRows.toHaveCount(total)` is fragile against the 50-row page limit (line ~145)**
```ts
expect(await myAttendanceRecordsPage.recordsFoundCount()).toBe(total);
await expect(myAttendanceRecordsPage.tableRows).toHaveCount(total);
```
`total` is `meta.total`, but the grid/API page size is `limit=50`. Records accumulate on "today" across runs
(no cleanup is possible), so once today exceeds 50, `meta.total` (e.g. 60) will diverge from the rendered
card count (50) and this test will flake. The `(N) Records Found` counter (`recordsFoundCount`) tracks
`meta.total` and is the reliable equality; the rendered-row assertion should be bounded.
**Fix:** keep `recordsFoundCount() === total`, and change the row assertion to tolerate the cap, e.g.
`expect(rowCount).toBe(Math.min(total, 50))` — or assert the seeded `inNote` row is present and
`rowCount` ≤ 50. (best-practices §11 "Shared state between tests" / flakiness from unbounded data.)

**[SUGGESTION] Raw locator with a hardcoded string in the test body — TC-201 (line ~63)**
```ts
await expect(page.getByText('Employee Name', { exact: true })).toHaveCount(0);
```
Best-practices §2 "Locators should be always defined in the page class". Move this to a
`MyAttendanceRecordsPage.employeeNameLabel` locator (sourced from test data) and assert on it.

**[SUGGESTION] Redundant `loginAsAdmin()` inside TC-004/005 bodies**
The seeded `beforeEach` already establishes the admin API session; the in-test `orangehrmAdminApi.loginAsAdmin()`
is a near-no-op ("session already active"). Harmless, but the `AttendanceApi` read could use the session from
the hook (or a small fixture) to keep the body focused on assertions.

**[SUGGESTION] TC-001 does not assert the default date equals *today***
It asserts a valid `yyyy-mm-dd` value, which is robust but weaker than the scenario ("defaults to today").
A timezone-safe strengthening: compare the field to the browser-local date via
`page.evaluate(() => new Date().toLocaleDateString('en-CA'))`. Optional — current assertion is intentionally tz-safe.

---

## File: `src/pages/attendance/MyAttendanceRecordsPage.ts`

### What's Good
- Clean extension: `filterToggle` keys off the caret icon, `openFilter()` is **idempotent** (checks `dateInput` visibility before toggling), and `viewDate`/`clearDateAndView` encapsulate the filter interaction — no route/locator knowledge leaks into the spec.
- `recordsFoundText` anchors on the `(N)` regex so it never collides with the empty-state span.
- No assertions in the page object (framework rule).

### Issues Found
- **[SUGGESTION]** `dateError` (`.oxd-input-field-error-message`) could match multiple nodes if the form grows; use `.first()` in the assertion or scope it to the date group. Only one field exists today, so not currently a defect.

---

## File: `src/api/orangehrmOSAPI/AttendanceApi.ts`

### What's Good
- `getRecordsByDate` returns `{ data, total, sumLabel }` — exactly the contract the UI renders, enabling the fidelity assertions in TC-004/005. Throws on non-OK with status. Uses the shared `JSON_HEADERS`.

### Issues Found
- **[SUGGESTION]** `data: unknown[]` is untyped; a `MyRecordRow` type would let tests read a specific record's duration for a stronger TC-004 (assert the exact row's duration rather than only the day sum). Low priority.

---

## Domain Cross-Check
- Date-filter route, the `records?limit=50&offset=0&date=` contract, `meta.total`/`meta.sum.label` mapping,
  self-scope (no employee selector), the empty state + Info toast, required-date validation, and the absence
  of edit/delete affordances under default config were all **verified live** (2026-06-14). The server-side
  rejection of past/future punches (`canUserChangeCurrentTime=false`) is consistent with the punch feature's
  business rules. Assertions trace to observed behaviour — nothing invented.

---

## Score: **9 / 10**
A robust, well-isolated, scenario-aligned suite that correctly internalized the prior pipeline's review
feedback (setup in hooks, no hardcoded literals into the page layer). One material flakiness risk
(TC-005 row-count vs the 50-row limit) and a few minor cleanups.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** TC-005: bound the rendered-row assertion to the 50-row page limit; keep the `(N)`-counter equality.
2. **[SUGGESTION]** Move the `Employee Name` label check into a `MyAttendanceRecordsPage` locator.
3. **[SUGGESTION]** Drop the redundant in-test `loginAsAdmin()` in TC-004/005.
4. **[SUGGESTION]** Use `dateError.first()` for the required-validation assertion.
