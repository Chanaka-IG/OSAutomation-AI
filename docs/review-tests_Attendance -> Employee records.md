# Test Review — Attendance → Employee Records

> Reviewer: Lead QA Automation (code review). Checklist: `playwright-best-practices` skill.
> Files reviewed:
> - `tests/attendance/employee-records.spec.ts` (primary)
> - `src/pages/attendance/EmployeeAttendanceRecordsPage.ts` (new)
> - `src/api/orangehrmOSAPI/AttendanceApi.ts` (`getEmployeeSummary` added)
> - `test-data/time/frontend/attendance.ts`
>
> Status at review time: **13/13 passing** (`--project=chromium`). TC-003 needed one self-healing fix
> (concatenated row text → the duration regex's leading `\b` had no boundary; anchors dropped).

---

## File: `tests/attendance/employee-records.spec.ts`

### What's Good
- **One test per prioritized scenario** (TC-ATT-ER-001/004/006/200/203 P0; 002/005/007/003/201/202/300/302 P1) — clean 1:1 reporting, no folding.
- **Setup in hooks**: the detail describe seeds via `AttendanceApi` in `beforeEach`; summary tests rely on stable master-data employees. No data creation in test bodies.
- **Navigation coverage is genuinely E2E**: row-View and filter-View both assert the resulting `?employeeId=<N>&date=` URL *and* that the detail grid renders — the heart of this feature.
- **Bounded counts**: TC-007 asserts `recordsFoundCount() === total` and `tableRows = Math.min(total, 50)` — the 50-row-limit lesson from `[[`review-fixes_Attendance -> My Records`]]` was carried forward.
- **Viewport-independent data assertions**: detail row checks use data values + `/\d+\.\d{2}/`, not responsive per-cell labels (lesson from the My Records pipeline).
- Unique notes identify seeded rows; empty detail uses the far-past `emptyDate`. ESS denial uses `auth.essTestUser` and asserts "Credential Required" + zero rows. No `waitForTimeout`. Imports from the fixtures barrel.

### Issues Found

**[IMPORTANT] Master-data identifiers hardcoded in the spec — `RUWAN`/`MARCUS` (lines ~28–29)**
```ts
const RUWAN = { empNumber: 1, name: 'Ruwan Kumara' };
const MARCUS = { empNumber: 2, query: 'Marcus', option: 'Marcus James Chen', summaryName: 'Marcus Chen' };
```
Best-practices §"Pass data to Page class from test body": data should come from test-data files, not literals
in the spec. These employee names/empNumbers are master data and belong in `test-data/time/frontend/attendance.ts`
(e.g. `attendance.employees.ruwan` / `.marcus`), so a roster change is a one-line edit and other Attendance
suites can share them. **Fix:** move the constants into test data and import them.

**[SUGGESTION] `employeeId` coupling in URL assertions — TC-004/005 (lines ~97, ~107)**
```ts
await expect(page).toHaveURL(/[?&]employeeId=1&date=/);
await expect(page).toHaveURL(/[?&]employeeId=2&date=/);
```
The literal `1`/`2` duplicate `RUWAN.empNumber`/`MARCUS.empNumber`. Build the pattern from the constant
(`new RegExp(\`[?&]employeeId=${RUWAN.empNumber}&date=\`)`) so it can't drift from the data.

**[SUGGESTION] `filterViewButton` assumes a single `<form>`**
```ts
this.filterViewButton = page.locator('form').getByRole('button', { name: 'View' });
```
Correct today (the filter is the only form), but scoping to the filter panel container would be more robust if
the page ever adds a second form. Verified working live.

**[SUGGESTION] TC-002 is a weak proof of date filtering**
It filters to `emptyDate` and asserts the roster still lists Ruwan — which is true for *any* date (the summary
always lists all employees). It exercises the filter round-trip but doesn't prove the date drove the result.
Consider asserting a per-employee total that differs between two dates, or simply accept it as a smoke check of
the filter control (documented).

---

## File: `src/pages/attendance/EmployeeAttendanceRecordsPage.ts`

### What's Good
- Models both surfaces cleanly: `gotoSummary`/`gotoDetail`, `filterByDate`, `selectEmployeeAndView`, `viewEmployeeRow`, `rowViewButton(name)` — route/locator knowledge stays in the POM.
- `openFilter()` is idempotent; `recordsFoundText` anchors on the `(N)` regex (no empty-state collision). No assertions in the page object.

### Issues Found
- **[SUGGESTION]** `dateError` (`.oxd-input-field-error-message`) may match multiple nodes if the filter grows; the test already uses `.first()`, so not a current defect.

---

## File: `src/api/orangehrmOSAPI/AttendanceApi.ts`

### What's Good
- `getEmployeeSummary(date)` returns `{ data, total }` mirroring the `meta.total` the UI renders — enabling the bounded count assertion in TC-007. Throws on non-OK; uses shared `JSON_HEADERS`.

### Issues Found
- **[SUGGESTION]** `data: unknown[]` is untyped; an `EmployeeSummaryRow` type would let a future test assert a specific employee's `sum.label`. Low priority.

---

## Domain Cross-Check
- Summary `employees/summary?date=` (per-employee `sum`, `meta.total` = employee count), detail
  `employees/{n}/records?date=`, the `?employeeId&date` deep-link, admin-only access (ESS "Credential
  Required"), required-date validation, and the no-edit/delete affordance under default config were all
  **verified live** (2026-06-14) and are consistent with the My Records / Punch-In/Out findings. No invented behaviour.

---

## Score: **9 / 10**
A thorough, well-isolated suite that reuses the Attendance framework and the accumulated lessons (bounded
counts, viewport-safe assertions, hooks-based seeding). Main cleanup: lift the hardcoded employee
identifiers into test data and derive the URL patterns from them.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Move `RUWAN`/`MARCUS` master-data identifiers into `test-data/time/frontend/attendance.ts`.
2. **[SUGGESTION]** Derive the TC-004/005 `employeeId` URL patterns from the (now test-data) constants.
3. **[SUGGESTION]** Scope `filterViewButton` to the filter panel rather than `form`.
