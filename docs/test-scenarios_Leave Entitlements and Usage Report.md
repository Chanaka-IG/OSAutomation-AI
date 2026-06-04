# Test Scenarios — Leave Entitlements and Usage Report

> Feature: **Leave → Reports → Leave Entitlements and Usage Report**
> Discovered against the live instance (`automationtest-os-kord.orangehrm.com`, OrangeHRM OS 5.8) and cross-checked with the OrangeHRM Help Portal + `orangehrm-opensource-domain` skill.

## Feature Map (discovered behavior)

The feature has **three entry points** under `Leave → Reports`:

| Entry point | Route | Roles | "Generate For" | Result rows |
|---|---|---|---|---|
| **Leave Entitlements and Usage Report** | `/web/index.php/leave/viewLeaveBalanceReport` | Admin, Supervisor | `Leave Type` (default) \| `Employee` radios | one row per **employee** (Leave Type mode) **or** one row per **leave type** (Employee mode) |
| **My Leave Entitlements and Usage Report** | `/web/index.php/leave/viewMyLeaveBalanceReport` | All (ESS/self) | none — auto-generates for the logged-in user | one row per **entitled leave type** |

### Criteria fields (Admin report)
- **Generate For**: radio `Leave Type` (value `leave_type_leave_entitlements_and_usage`) / `Employee` (value `employee_leave_entitlements_and_usage`).
- **Leave Type mode**: `Leave Type` dropdown (default `Annual Leave`), `Leave Period*` (required, default current period e.g. `2026-01-01 - 2026-12-31`), `Location`, `Sub Unit`, `Job Title`, `Include Past Employees` checkbox.
- **Employee mode**: `Employee Name*` autocomplete (required), `Leave Period*` (required).
- Action button: **Generate** (not "View"). After generation a `(N) Records Found` count, a `revo-grid` results table, a column-config toggle, and an Export-to-CSV control appear.

### Result columns
- **Leave Type mode** → `Employee`, `Leave Entitlements (Days)`, `Leave Pending Approval (Days)`, `Leave Scheduled (Days)`, `Leave Taken (Days)`, `Leave Balance (Days)`.
- **Employee mode** & **My report** → `Leave Type`, `Leave Entitlements (Days)`, `Leave Pending Approval (Days)`, `Leave Scheduled (Days)`, `Leave Taken (Days)`, `Leave Balance (Days)`.
- Numeric cells are **drill-down links**: Entitlements → `/leave/viewLeaveEntitlements?...`; Pending/Scheduled/Taken → `/leave/viewLeaveList?...&status={1|2|3}`.

### Backing APIs
- Headers: `GET /api/v2/leave/reports?name=<reportName>`
- Data: `GET /api/v2/leave/reports/data?limit=50&offset=0&name=<reportName>&fromDate=&toDate=[&leaveTypeId=][&empNumber=][&includeEmployees=onlyCurrent|currentAndPast]&_dateFormattingEnabled=true`
- Report names: `leave_type_leave_entitlements_and_usage`, `employee_leave_entitlements_and_usage`, `my_leave_entitlements_and_usage`.

### Key business rule (assertion anchor)
`Leave Balance = Entitlement − (Pending Approval + Scheduled + Taken)` — Pending Approval is escrowed at submission (domain `business-rules.md §4`). The report's `balanceDays` must equal the leave-balance API value for the same emp/type/period.

---

## Happy Path (TC-001–099)

### TC-001: Admin generates the report by Leave Type
**Category**: Happy Path
**Preconditions**: Logged in as Admin; at least one employee has an Annual Leave entitlement in the current period.
**Steps**:
1. Go to `Leave → Reports → Leave Entitlements and Usage Report`.
2. Keep `Generate For = Leave Type`; pick `Leave Type = Annual Leave`; keep the default Leave Period.
3. Click **Generate**.
**Expected Results**: `(N) Records Found` shows; a results grid renders one row per current employee with columns Employee / Entitlements / Pending Approval / Scheduled / Taken / Balance.
**Business Rule**: Leave Type report lists every (current) employee's usage for the chosen type.
**Suggested Layer**: E2E

### TC-002: Admin generates the report by Employee
**Category**: Happy Path
**Preconditions**: Logged in as Admin; a target employee exists.
**Steps**:
1. Open the report; choose `Generate For = Employee`.
2. In `Employee Name`, type and select the target employee.
3. Click **Generate**.
**Expected Results**: Grid renders one row per leave type for that employee; first column is `Leave Type`.
**Business Rule**: Employee report lists all leave types for a single employee.
**Suggested Layer**: E2E

### TC-003: Report values match the seeded entitlement/usage
**Category**: Happy Path
**Preconditions**: A dedicated employee with a known Annual entitlement (e.g. 10) and a known pending request (e.g. 1 day).
**Steps**: Generate the Employee report for that employee.
**Expected Results**: The Annual Leave row shows Entitlement = 10.00, Pending Approval = 1.00, Balance = 9.00.
**Business Rule**: `Balance = Entitlement − (Pending + Scheduled + Taken)`.
**Suggested Layer**: E2E (value) / API (computation)

### TC-004: ESS opens "My Leave Entitlements and Usage Report" (auto-generated)
**Category**: Happy Path
**Preconditions**: Logged in as an ESS user with ≥1 entitled leave type.
**Steps**: Go to `Leave → Reports → My Leave Entitlements and Usage Report`.
**Expected Results**: Report auto-renders without any criteria; one row per entitled leave type; `meta.employee` is the logged-in user.
**Business Rule**: My report is implicitly scoped to the logged-in employee.
**Suggested Layer**: E2E

### TC-005: Export the generated report to CSV
**Category**: Happy Path
**Preconditions**: A report has been generated.
**Steps**: Click the **Export** (CSV) control.
**Expected Results**: A CSV download is triggered containing the same columns/rows as the grid.
**Business Rule**: Report supports CSV export.
**Suggested Layer**: E2E

### TC-006: Drill-down from an Entitlement cell
**Category**: Happy Path
**Preconditions**: Generated report with a non-zero entitlement cell.
**Steps**: Click the value under `Leave Entitlements (Days)`.
**Expected Results**: Navigates to `/leave/viewLeaveEntitlements?empNumber=&leaveTypeId=&fromDate=&toDate=` for that row.
**Business Rule**: Numeric cells deep-link to the underlying records.
**Suggested Layer**: E2E

### TC-007: Drill-down from a Pending/Scheduled/Taken cell
**Category**: Happy Path
**Preconditions**: Generated report.
**Steps**: Click the value under `Leave Pending Approval (Days)`.
**Expected Results**: Navigates to `/leave/viewLeaveList?...&status=1` (status=2 for Scheduled, 3 for Taken).
**Business Rule**: Status cells deep-link to the filtered Leave List.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Balance equals entitlement minus all usage
**Category**: Business Rule
**Preconditions**: Employee with entitlement E, pending P, scheduled S, taken T.
**Steps**: Generate the report; read the Balance cell.
**Expected Results**: `Balance = E − (P + S + T)` for each row.
**Business Rule**: `business-rules.md §4`.
**Suggested Layer**: API / E2E

### TC-101: Pending Approval is held in escrow (reduces balance before approval)
**Category**: Business Rule
**Preconditions**: Employee with entitlement and one pending (un-approved) request.
**Steps**: Generate; compare Pending and Balance.
**Expected Results**: Pending > 0 and Balance is already reduced by the pending amount.
**Business Rule**: Escrow at submission.
**Suggested Layer**: API / E2E

### TC-102: Report grid matches the report-data API
**Category**: Business Rule
**Preconditions**: Admin session.
**Steps**: Generate the Leave Type report; capture `GET /api/v2/leave/reports/data?...`.
**Expected Results**: Grid row count and per-cell values equal the API `data[]`; `meta.total` matches `(N) Records Found`.
**Business Rule**: UI is a faithful projection of the report API.
**Suggested Layer**: API

### TC-103: Leave Type mode lists one row per current employee
**Category**: Business Rule
**Preconditions**: Known count of current employees.
**Steps**: Generate by Leave Type without Include Past Employees.
**Expected Results**: Row count equals the number of current employees; terminated employees absent.
**Business Rule**: Default scope = current employees.
**Suggested Layer**: E2E / API

### TC-104: Employee mode lists one row per leave type
**Category**: Business Rule
**Preconditions**: Instance has K leave types.
**Steps**: Generate by Employee for any employee.
**Expected Results**: One row per leave type the employee can be reported on; first column = leave type name.
**Business Rule**: Employee report is keyed by leave type.
**Suggested Layer**: E2E / API

### TC-105: Sub Unit filter narrows the Leave Type report
**Category**: Business Rule
**Preconditions**: Employees split across sub units.
**Steps**: Generate by Leave Type with `Sub Unit` set to a unit containing only the test employee(s).
**Expected Results**: Only employees in that sub unit appear.
**Business Rule**: Location/Sub Unit/Job Title are server-side filters.
**Suggested Layer**: E2E / API

### TC-106: Job Title filter narrows the Leave Type report
**Category**: Business Rule
**Preconditions**: Employees with distinct job titles.
**Steps**: Generate by Leave Type filtered to one job title.
**Expected Results**: Only employees with that job title appear.
**Business Rule**: Job Title is a server-side filter.
**Suggested Layer**: E2E / API

### TC-107: Location filter narrows the Leave Type report
**Category**: Business Rule
**Preconditions**: Employees in distinct locations.
**Steps**: Generate filtered to one location.
**Expected Results**: Only employees in that location appear.
**Business Rule**: Location is a server-side filter.
**Suggested Layer**: API

### TC-108: Include Past Employees adds terminated staff
**Category**: Business Rule
**Preconditions**: At least one terminated employee with historical entitlement.
**Steps**: Generate by Leave Type, tick `Include Past Employees`.
**Expected Results**: The report query uses `includeEmployees=currentAndPast`; the terminated employee row appears.
**Business Rule**: Terminated employees are retained as FK references and surface only when included.
**Suggested Layer**: E2E / API

### TC-109: Leave Period selection changes the reported window
**Category**: Business Rule
**Preconditions**: Employee with entitlements in two different leave periods.
**Steps**: Generate for the current period, then re-generate for the previous period.
**Expected Results**: Entitlement/usage values differ per period; the data API `fromDate/toDate` reflect the chosen period.
**Business Rule**: Report is scoped to a leave period; user can navigate Previous/Current/Next period.
**Suggested Layer**: E2E / API

### TC-110: My report is scoped to the logged-in employee only
**Category**: Business Rule
**Preconditions**: Two ESS users with different entitlements.
**Steps**: As user A, open My report; capture `meta.employee`.
**Expected Results**: `meta.employee.empNumber` equals user A; user B's data never appears; the data query carries no `empNumber` override (server resolves self).
**Business Rule**: Self-scoping.
**Suggested Layer**: E2E / API

### TC-111: Net balance can be negative when overdrawn
**Category**: Business Rule
**Preconditions**: Employee whose taken/scheduled exceeds entitlement.
**Steps**: Generate the report.
**Expected Results**: Balance cell shows a negative value (overdrawn) rather than clamping to 0.
**Business Rule**: Net Balance = Available − Total Overdrawn (Help Portal).
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-201: Unauthenticated access to the Admin report redirects to login
**Category**: Security
**Preconditions**: No session.
**Steps**: Navigate directly to `/web/index.php/leave/viewLeaveBalanceReport`.
**Expected Results**: Redirect to `/auth/login` (`?next=` preserved).
**Business Rule**: Deep links require auth.
**Suggested Layer**: E2E

### TC-202: Unauthenticated access to the My report redirects to login
**Category**: Security
**Preconditions**: No session.
**Steps**: Navigate to `/web/index.php/leave/viewMyLeaveBalanceReport`.
**Expected Results**: Redirect to `/auth/login`.
**Business Rule**: Deep links require auth.
**Suggested Layer**: E2E

### TC-203: ESS user cannot reach the Admin (all-employee) report
**Category**: Security
**Preconditions**: Logged in as ESS.
**Steps**: Navigate to `/web/index.php/leave/viewLeaveBalanceReport`.
**Expected Results**: No report criteria render / redirected / forbidden — ESS sees only the My report. The menu does not expose the Admin report to ESS.
**Business Rule**: ESS sees only their own data.
**Suggested Layer**: E2E

### TC-204: ESS report-data API ignores a forged empNumber
**Category**: Security
**Preconditions**: ESS session for user A; another user B's empNumber.
**Steps**: Call `GET /api/v2/leave/reports/data?name=my_leave_entitlements_and_usage&empNumber=<B>...`.
**Expected Results**: Response returns user A's data only (or 403); never B's rows.
**Business Rule**: No cross-user data leak.
**Suggested Layer**: API

### TC-205: Supervisor report scope is limited to subordinates
**Category**: Security
**Preconditions**: Supervisor with a subset of subordinates.
**Steps**: As supervisor, generate the Leave Type report.
**Expected Results**: Only subordinate employees appear; non-subordinates are excluded.
**Business Rule**: Supervisor data scope.
**Suggested Layer**: API / E2E

---

## Negative / Error (TC-300–399)

### TC-301: Employee mode requires an Employee Name
**Category**: Negative
**Preconditions**: Admin; Employee mode selected.
**Steps**: Leave `Employee Name` blank; click **Generate**.
**Expected Results**: `Required` validation under Employee Name; no report generated.
**Business Rule**: Employee Name is mandatory in Employee mode.
**Suggested Layer**: E2E

### TC-302: Leave Period is required
**Category**: Negative
**Preconditions**: Admin; a state where Leave Period can be cleared.
**Steps**: Clear `Leave Period`; click **Generate**.
**Expected Results**: `Required` validation under Leave Period; no report generated.
**Business Rule**: Leave Period marked `*` required.
**Suggested Layer**: E2E

### TC-303: Invalid employee name (no hint selected) blocks generation
**Category**: Negative
**Preconditions**: Employee mode.
**Steps**: Type a non-existent name; do not pick a hint; click **Generate**.
**Expected Results**: `Invalid` field error; no report.
**Business Rule**: Autocomplete requires a resolved employee.
**Suggested Layer**: E2E

### TC-304: Filter combination with no matching employees yields an empty report
**Category**: Negative
**Preconditions**: Admin.
**Steps**: Generate by Leave Type with a Sub Unit/Job Title combination no employee satisfies.
**Expected Results**: `(0) Records Found` / No Records; empty grid; no error.
**Business Rule**: Empty result is valid, not an error.
**Suggested Layer**: E2E / API

### TC-305: Report-data API rejects an unauthenticated request
**Category**: Negative
**Preconditions**: No session / expired token.
**Steps**: Call `GET /api/v2/leave/reports/data?...`.
**Expected Results**: 401 Unauthorized (or redirect for cookie flow).
**Business Rule**: API requires auth.
**Suggested Layer**: API

---

## Edge Cases (TC-400–499)

### TC-401: Employee with no entitlement shows all-zero rows
**Category**: Edge Case
**Preconditions**: Employee with no entitlement in the period.
**Steps**: Generate the Employee report.
**Expected Results**: Each leave-type row shows `0.00` for all numeric columns; Balance `0.00`.
**Business Rule**: No entitlement ⇒ zero balance.
**Suggested Layer**: E2E / API

### TC-402: Fractional (half-day) usage renders to two decimals
**Category**: Edge Case
**Preconditions**: Employee with a half-day (0.5) request.
**Steps**: Generate.
**Expected Results**: Pending/Scheduled/Taken shows `0.50`; balance reflects the fraction; all values formatted `N.NN`.
**Business Rule**: Half-day leave supported (Partial Days).
**Suggested Layer**: E2E / API

### TC-403: Weekend/holiday-spanning request counts only working days
**Category**: Edge Case
**Preconditions**: A Fri→Mon request (weekend excluded → 2 days); a request over a seeded holiday.
**Steps**: Generate.
**Expected Results**: The usage column counts only working days (e.g. `2.00` for Fri→Mon), matching the Work Week.
**Business Rule**: `numberOfDays` excludes non-working days.
**Suggested Layer**: API

### TC-404: Default Leave Period equals the current leave period
**Category**: Edge Case
**Preconditions**: Admin on the report page.
**Steps**: Read the default `Leave Period`.
**Expected Results**: Defaults to current period (`YYYY-01-01 - YYYY-12-31`); the data query `fromDate/toDate` match.
**Business Rule**: Annual leave period default.
**Suggested Layer**: E2E

### TC-405: Switching Generate For resets the criteria panel
**Category**: Edge Case
**Preconditions**: Admin; Leave Type mode with values entered.
**Steps**: Toggle to `Employee`, then back to `Leave Type`.
**Expected Results**: The criteria panel swaps between the two field sets cleanly (Employee Name vs Leave Type/Location/Sub Unit/Job Title); no stale fields; no JS error.
**Business Rule**: Mode-conditional criteria.
**Suggested Layer**: E2E / Component

### TC-406: Large employee set paginates at 50 rows
**Category**: Edge Case
**Preconditions**: >50 current employees.
**Steps**: Generate by Leave Type.
**Expected Results**: Grid paginates (limit=50, offset increments); `(N) Records Found` reflects the true total.
**Business Rule**: Pagination defaults to 50.
**Suggested Layer**: API

---

## UI State (TC-500–599)

### TC-501: Admin report renders all criteria controls (Leave Type mode)
**Category**: UI State
**Preconditions**: Admin on the report page.
**Steps**: Inspect the criteria panel.
**Expected Results**: Generate-For radios, Leave Type, Leave Period*, Location, Sub Unit, Job Title, Include Past Employees, and **Generate** button all visible; no Employee Name field while in Leave Type mode.
**Business Rule**: Leave Type mode field set.
**Suggested Layer**: E2E

### TC-502: Employee mode shows Employee Name + Leave Period only
**Category**: UI State
**Preconditions**: Admin; Employee mode.
**Steps**: Inspect the criteria panel.
**Expected Results**: Employee Name autocomplete + Leave Period* visible; Location/Sub Unit/Job Title/Include-Past hidden.
**Business Rule**: Employee mode field set.
**Suggested Layer**: E2E

### TC-503: Results grid shows the documented column headers
**Category**: UI State
**Preconditions**: A generated report.
**Steps**: Read the grid headers.
**Expected Results**: Leave Type mode → `Employee, Leave Entitlements (Days), Leave Pending Approval (Days), Leave Scheduled (Days), Leave Taken (Days), Leave Balance (Days)`; Employee/My mode → leading column `Leave Type`, same numeric columns.
**Business Rule**: Documented report columns.
**Suggested Layer**: E2E

### TC-504: Empty result renders a "No Records Found" state
**Category**: UI State
**Preconditions**: A filter that returns nothing.
**Steps**: Generate.
**Expected Results**: `(0) Records Found` / No Records message; no grid rows; no spinner left hanging.
**Business Rule**: Empty-state handling.
**Suggested Layer**: E2E

### TC-505: Records-Found count appears only after Generate
**Category**: UI State
**Preconditions**: Fresh Admin report page (before Generate).
**Steps**: Observe before vs after clicking Generate.
**Expected Results**: No grid/`Records Found` before Generate; both appear after.
**Business Rule**: Report is generated on demand.
**Suggested Layer**: E2E

### TC-506: My report renders without any criteria/employee selector
**Category**: UI State
**Preconditions**: ESS on the My report page.
**Steps**: Inspect the page.
**Expected Results**: Report auto-renders; no Generate-For radios, no Employee Name field; only the results grid (and period/export controls).
**Business Rule**: Self-scoped auto report.
**Suggested Layer**: E2E

### TC-507: Column-config toggle lets the admin choose displayed fields
**Category**: UI State
**Preconditions**: Admin; generated report.
**Steps**: Open the column-config (toggle) control.
**Expected Results**: A configuration panel appears allowing up to 8 displayed fields (e.g. add Employee ID); applied config persists in the list.
**Business Rule**: Configurable list columns (Help Portal).
**Suggested Layer**: E2E

---

## Coverage Summary

| Lens | Count | IDs |
|---|---|---|
| Happy Path | 7 | TC-001–007 |
| Business Rules | 12 | TC-100–111 |
| Security | 5 | TC-201–205 |
| Negative | 5 | TC-301–305 |
| Edge Cases | 6 | TC-401–406 |
| UI State | 7 | TC-501–507 |
| **Total** | **42** | |
