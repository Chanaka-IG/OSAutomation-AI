# Test Scenarios — Claim → Employee Claims

**Feature:** Claim → Employee Claims (Admin-only searchable list of **all** employee claim requests, with filters, sorting, and drill-down to claim detail)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8) — page explored live via Playwright MCP on 2026-06-20.

**Route (Admin):** Employee Claims list `/web/index.php/claim/viewAssignClaim` (page heading **"Employee Claims"**) · claim detail `/claim/assignClaim/id/{id}` (via **View Details**)
**Search API:** `GET /api/v2/claim/employees/requests?limit=50&offset=0&includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC` (+ filter params: `referenceId`, `claimEventId`, `status`, `empNumber`/`name`, `fromDate`, `toDate`)
**Supporting API:** `GET /api/v2/claim/events?limit=0&status=true` (populates the Event Name dropdown — active events only)

**Filters present:** Employee Name (autocomplete "Type for hints…") · Reference Id (text) · Event Name (dropdown, active events only) · Status (dropdown) · From Date · To Date · Include (dropdown) · **Reset** / **Search** buttons.
**Status dropdown options:** `-- Select --`, Initiated, Submitted, Approved, Rejected, Cancelled, Paid.
**Include options:** Current Employees Only *(default, `onlyCurrent`)*, Current and Past Employees *(`currentAndPast`)*, Past Employees Only *(`onlyPast`)*.
**Results grid columns:** Reference Id · Employee Name · Event Name · Description · Currency · Submitted Date · Amount · Status · Actions (**View Details**). Header shows **"(N) Records Found"**.

**Constraint:** claim requests cannot be deleted (`DELETE` → 405) — permanent. This suite is read-only against pre-seeded claims; no new permanent data is required for most scenarios.

---

## Happy Path (TC-001–099)

### TC-001: Employee Claims list loads with all current-employee claims by default
**Category**: Happy Path
**Preconditions**: Admin login; at least one claim request exists.
**Steps**: 1) Claim → Employee Claims (`/claim/viewAssignClaim`). 2) Observe the default grid.
**Expected Results**: Heading **"Employee Claims"**; grid renders rows; "(N) Records Found" shown; default `GET …/employees/requests?includeEmployees=onlyCurrent&sortField=claimRequest.referenceId&sortOrder=DESC` returns 200.
**Business Rule**: Admin can view all employee claim requests.
**Suggested Layer**: E2E

### TC-002: Search by Reference Id returns the matching claim
**Category**: Happy Path
**Preconditions**: A claim with a known Reference Id exists.
**Steps**: 1) Enter the Reference Id. 2) Search.
**Expected Results**: Exactly the matching row is listed; "(1) Records Found".
**Business Rule**: Reference Id uniquely identifies a claim.
**Suggested Layer**: E2E

### TC-003: Search by Employee Name returns that employee's claims
**Category**: Happy Path
**Preconditions**: An employee with ≥1 claim exists.
**Steps**: 1) Type the employee name, select the autocomplete hint. 2) Search.
**Expected Results**: Every row's Employee Name equals the chosen employee; count matches that employee's claim total.
**Suggested Layer**: E2E

### TC-004: Filter by Event Name returns only claims for that event
**Category**: Happy Path
**Steps**: 1) Open Event Name dropdown, pick an event. 2) Search.
**Expected Results**: Every row's Event Name equals the chosen event.
**Suggested Layer**: E2E

### TC-005: Filter by Status returns only claims in that state
**Category**: Happy Path
**Steps**: 1) Status = Submitted (or any seeded status). 2) Search.
**Expected Results**: Every row's Status badge equals the selected status; API sends `status=<code>`.
**Suggested Layer**: E2E / API

### TC-006: Filter by submitted-date range (From/To Date)
**Category**: Happy Path
**Preconditions**: A claim with a known Submitted Date exists.
**Steps**: 1) Set From Date and To Date spanning that claim. 2) Search.
**Expected Results**: Only claims whose Submitted Date is within [From, To] are listed.
**Suggested Layer**: E2E

### TC-007: Combined filters narrow results (Employee + Status)
**Category**: Happy Path
**Steps**: 1) Select Employee Name and Status together. 2) Search.
**Expected Results**: Results satisfy both predicates (AND semantics).
**Suggested Layer**: E2E

### TC-008: View Details opens the claim detail page
**Category**: Happy Path
**Steps**: 1) On any row click **View Details**.
**Expected Results**: Navigates to `/claim/assignClaim/id/{id}`; detail shows the same Reference Id, employee, event, and expenses.
**Suggested Layer**: E2E

### TC-009: Reset clears all filters and restores the full list
**Category**: Happy Path
**Steps**: 1) Apply several filters + Search. 2) Click **Reset**.
**Expected Results**: All fields cleared (Include returns to "Current Employees Only"); full default list re-loads.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Event Name dropdown lists only ACTIVE events
**Category**: Business Rule
**Preconditions**: One active and one inactive event exist.
**Steps**: 1) Open the Event Name dropdown.
**Expected Results**: Active event present; inactive event absent. Backed by `GET /api/v2/claim/events?status=true`.
**Business Rule**: Only active events are selectable as filters.
**Suggested Layer**: E2E / API

### TC-101: Status dropdown offers exactly the six lifecycle states
**Category**: Business Rule
**Steps**: 1) Open the Status dropdown.
**Expected Results**: Options are exactly `-- Select --`, Initiated, Submitted, Approved, Rejected, Cancelled, Paid.
**Suggested Layer**: E2E

### TC-102: Include defaults to "Current Employees Only"
**Category**: Business Rule
**Steps**: 1) Load the page. 2) Inspect the Include dropdown.
**Expected Results**: Default selection "Current Employees Only"; default request uses `includeEmployees=onlyCurrent`.
**Suggested Layer**: E2E / API

### TC-103: Include = "Current and Past Employees" widens the result set
**Category**: Business Rule
**Preconditions**: At least one terminated employee has a claim.
**Steps**: 1) Include = "Current and Past Employees". 2) Search.
**Expected Results**: Result set ≥ the onlyCurrent set; terminated employees' claims now appear; API `includeEmployees=currentAndPast`.
**Suggested Layer**: API

### TC-104: Include = "Past Employees Only" returns only terminated employees' claims
**Category**: Business Rule
**Steps**: 1) Include = "Past Employees Only". 2) Search.
**Expected Results**: No current-employee claims listed; API `includeEmployees=onlyPast`.
**Suggested Layer**: API

### TC-105: Default sort is Reference Id descending (newest first)
**Category**: Business Rule
**Steps**: 1) Load list. 2) Read the Reference Id column top-to-bottom.
**Expected Results**: Reference Ids are in descending order; API `sortField=claimRequest.referenceId&sortOrder=DESC`.
**Suggested Layer**: E2E / API

### TC-106: "(N) Records Found" matches the result total
**Category**: Business Rule
**Steps**: 1) Apply a filter that returns a known number of claims.
**Expected Results**: The "(N) Records Found" header equals the API `meta.total`.
**Suggested Layer**: E2E

### TC-107: Each row's Status reflects the claim's current lifecycle state
**Category**: Business Rule
**Preconditions**: Seeded claims in Initiated, Submitted, and Paid states.
**Steps**: 1) Inspect the Status column.
**Expected Results**: Status badges match the persisted state for each Reference Id.
**Suggested Layer**: E2E

---

## Security (TC-200–299)

### TC-200: ESS user cannot open the Employee Claims page
**Category**: Security
**Preconditions**: ESS (non-admin) login.
**Steps**: 1) Navigate directly to `/claim/viewAssignClaim`.
**Expected Results**: Access denied / redirect away (no admin-wide claim list). ESS only sees their own claims via My Claims.
**Business Rule**: Employee Claims is an Admin-scoped view.
**Suggested Layer**: E2E

### TC-201: "Employee Claims" is absent from the ESS Claim menu
**Category**: Security
**Steps**: 1) As ESS open the Claim module top menu.
**Expected Results**: Menu shows only Submit Claim / My Claims (+ Configuration hidden); no Employee Claims / Assign Claim entry.
**Suggested Layer**: E2E

### TC-202: ESS call to the admin list API is rejected or self-scoped
**Category**: Security
**Steps**: 1) As ESS, `GET /api/v2/claim/employees/requests`.
**Expected Results**: 403 Forbidden (or scoped strictly to self — never other employees' claims).
**Suggested Layer**: API

### TC-203: Unauthenticated access redirects to login
**Category**: Security
**Steps**: 1) Logged out, navigate to `/claim/viewAssignClaim`.
**Expected Results**: Redirect to `/auth/login`.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Search with a non-existent Reference Id yields no records
**Category**: Negative
**Steps**: 1) Reference Id = `999999999999999`. 2) Search.
**Expected Results**: "No Records Found"; empty grid; no error toast.
**Suggested Layer**: E2E

### TC-301: Employee with no claims returns an empty grid
**Category**: Negative
**Preconditions**: An employee known to have zero claims.
**Steps**: 1) Select that employee. 2) Search.
**Expected Results**: "No Records Found".
**Suggested Layer**: E2E

### TC-302: From Date later than To Date returns no results (no crash)
**Category**: Negative
**Steps**: 1) From Date = 2026-12-31, To Date = 2026-01-01. 2) Search.
**Expected Results**: Empty result set; page stays stable; no server error.
**Suggested Layer**: E2E

### TC-303: Employee Name typed without selecting a hint
**Category**: Negative
**Steps**: 1) Type a free-text name not matching any hint. 2) Search.
**Expected Results**: Graceful handling — either "Invalid" field state with no request, or empty results; no crash.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Pagination when results exceed the page size (50)
**Category**: Edge Case
**Preconditions**: > 50 claims exist (current env had 28 — may need seeding/lower bound check).
**Steps**: 1) Load the unfiltered list. 2) Page through.
**Expected Results**: Pager appears only when total > 50; `offset` advances by `limit`; no duplicate/missing rows across pages.
**Suggested Layer**: E2E / API

### TC-401: Date range is inclusive of its boundaries
**Category**: Edge Case
**Preconditions**: A claim submitted on date D.
**Steps**: 1) From Date = To Date = D. 2) Search.
**Expected Results**: The claim submitted on D is included (boundaries inclusive).
**Suggested Layer**: E2E

### TC-402: Special / injection-like characters in Reference Id are handled safely
**Category**: Edge Case
**Steps**: 1) Reference Id = `' OR 1=1 --`. 2) Search.
**Expected Results**: No records (or sanitized); no SQL error; no full-table dump.
**Suggested Layer**: E2E / API

### TC-403: Very long Reference Id input is handled gracefully
**Category**: Edge Case
**Steps**: 1) Paste a 300-char string into Reference Id. 2) Search.
**Expected Results**: No records / graceful truncation; no client or server error.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Filter panel collapse / expand toggle
**Category**: UI State
**Steps**: 1) Click the chevron next to "Employee Claims". 2) Toggle again.
**Expected Results**: Filter form hides on collapse and re-shows on expand; grid remains visible.
**Suggested Layer**: E2E

### TC-501: "No Records Found" empty state
**Category**: UI State
**Steps**: 1) Apply a filter that matches nothing.
**Expected Results**: Grid shows the empty-state message instead of rows; "(0) Records Found" (or no count row).
**Suggested Layer**: E2E

### TC-502: "Records Found" count updates after each search
**Category**: UI State
**Steps**: 1) Note count on default list. 2) Apply a narrowing filter + Search.
**Expected Results**: Count decreases to match the filtered total; updates live without full reload.
**Suggested Layer**: E2E

### TC-503: Loading state during search
**Category**: UI State
**Steps**: 1) Click Search and observe.
**Expected Results**: A spinner/loading indicator shows while the request is in flight; grid replaces it on resolve.
**Suggested Layer**: E2E

---

## Coverage Summary
- **Happy Path:** 9 (TC-001–009)
- **Business Rules:** 8 (TC-100–107)
- **Security:** 4 (TC-200–203)
- **Negative:** 4 (TC-300–303)
- **Edge Cases:** 4 (TC-400–403)
- **UI State:** 4 (TC-500–503)
- **Total:** 33
