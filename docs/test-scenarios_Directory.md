# Test Scenarios — Directory Module

> Target: OrangeHRM OS 5.8 — `/web/index.php/directory/viewDirectory`
> Source of truth: live exploration on `https://automationtest-os-kord.orangehrm.com` (2026-06-07) + `orangehrm-opensource-domain` skill.
>
> **Discovered behavior (grounding facts):**
> - Page: heading "Directory" (`h5` inside filter card, `h6` in topbar). Filters: **Employee Name** (autocomplete, placeholder `Type for hints...`), **Job Title** (`-- Select --` + 6 seeded titles: Business Analyst, HR Specialist, QA Engineer, Senior Software Engineer, Software Engineer, UI Engineer), **Location** (`-- Select --` + 3 seeded: Seattle — Headquarters, Sydney — Pacific Office, Toronto — Support Center). Buttons: **Reset**, **Search**.
> - Results: header span `(5) Records Found` / singular `(1) Record Found` / `No Records Found`; cards `.orangehrm-directory-card` (name header + profile picture `/pim/viewPhoto/empNumber/{n}`).
> - Card click → detail sidebar `.orangehrm-corporate-directory-sidebar` (back arrow `bi-arrow-right`, name, photo, job-title subtitle and location/sub-unit body **hidden when null**, telephone/envelope icon buttons, "Work Telephone" / "Work Email" rows — rendered only when values exist; data via `GET /api/v2/directory/employees/{empNumber}?model=detailed` → `contactInfo.workEmail`, `contactInfo.workTelephone`).
> - List API: `GET /api/v2/directory/employees?limit=14&offset=0[&empNumber=N][&jobTitleId=N][&locationId=N]` → `meta.total`. Hints API: `GET /api/v2/directory/employees?nameOrId=<text>`.
> - Name field is select-from-hints: free-typed unselected text + Search → field error **"Invalid"**, no request fired. Hint dropdown shows "No Records Found" when no match, "Searching...." while loading.
> - Errors: invalid `empNumber` (list or detail) → **422**; unauthenticated API → **401**; `POST`/`PUT` on directory endpoints → **405** (module is read-only).
> - ESS (`marcus.chen`) sees the Directory menu item and the **full** employee list with identical filters (corporate directory is org-wide by design).
> - Seeded env: 5 employees; **none currently has job title / location / sub-unit assigned** (`jobTitle.id = null` in API). Ruwan Kumara has `workEmail: ruwan@gmail.com`; Marcus Chen has no contact info. → Positive filter-match scenarios require seeding job details via `PUT /api/v2/pim/employees/{empNumber}/job-details` in test setup.

---

## Happy Path (TC-001 – TC-099)

### TC-001: Directory landing page lists all active employees
**Category**: Happy Path
**Preconditions**: Logged in as Admin; ≥1 employee exists
**Steps**:
1. Navigate to `/web/index.php/directory/viewDirectory`
**Expected Results**: Heading "Directory" visible; record-count span shows `(N) Records Found` matching API `meta.total`; one `.orangehrm-directory-card` per employee with full name (First Middle Last) and profile picture
**Business Rule**: Directory lists all non-terminated employees, org-wide
**Suggested Layer**: E2E

### TC-002: Search by employee name via hint selection
**Category**: Happy Path
**Preconditions**: Logged in; employee "Ruwan Kumara" exists
**Steps**:
1. Type partial name (e.g. `Ruw`) in Employee Name field
2. Select "Ruwan Kumara" from hints dropdown
3. Click Search
**Expected Results**: Request sent with `empNumber=<selected>`; results show exactly 1 card "Ruwan Kumara"; count shows `(1) Record Found` (singular)
**Business Rule**: Name filter resolves to empNumber of the selected hint, not free text
**Suggested Layer**: E2E

### TC-003: Filter by Job Title returns only matching employees
**Category**: Happy Path
**Preconditions**: Logged in; an employee has been assigned a job title (seed via PIM job-details API)
**Steps**:
1. Select the seeded job title from Job Title dropdown
2. Click Search
**Expected Results**: Only employees holding that job title are listed; count matches; API called with `jobTitleId=<id>`
**Business Rule**: Job Title filter maps to `jobTitleId` on employee job details
**Suggested Layer**: E2E

### TC-004: Filter by Location returns only matching employees
**Category**: Happy Path
**Preconditions**: Logged in; an employee has been assigned a location (seed via PIM job-details API)
**Steps**:
1. Select the seeded location from Location dropdown
2. Click Search
**Expected Results**: Only employees at that location listed; API called with `locationId=<id>`
**Business Rule**: Location filter maps to `locationId` on employee job details
**Suggested Layer**: E2E

### TC-005: Combined filters (name + job title + location) intersect
**Category**: Happy Path
**Preconditions**: Logged in; one employee seeded with known job title + location
**Steps**:
1. Select employee from name hints, matching job title, matching location
2. Click Search
**Expected Results**: Exactly that employee returned; changing any one filter to a non-matching value yields `No Records Found`
**Business Rule**: Filters are AND-combined
**Suggested Layer**: API

### TC-006: Employee card opens detail panel with contact info
**Category**: Happy Path
**Preconditions**: Logged in; employee with `workEmail` set exists (e.g. Ruwan Kumara — ruwan@gmail.com)
**Steps**:
1. Click the employee's directory card
**Expected Results**: Sidebar `.orangehrm-corporate-directory-sidebar` shows the employee name, photo, and a "Work Email" row with the email value; `GET /directory/employees/{empNumber}?model=detailed` fired
**Business Rule**: Detail model exposes `contactInfo.workEmail` / `workTelephone`
**Suggested Layer**: E2E

### TC-007: Reset clears filters and restores full list
**Category**: Happy Path
**Preconditions**: Logged in; a filter has been applied with results narrowed
**Steps**:
1. Apply Job Title filter, Search
2. Click Reset
**Expected Results**: Name field empty, both dropdowns back to `-- Select --`, full employee list and original record count restored (fresh unfiltered API call)
**Business Rule**: Reset re-queries without filter params
**Suggested Layer**: E2E

### TC-008: Detail panel closes via back arrow
**Category**: Happy Path
**Preconditions**: Detail panel open (TC-006)
**Steps**:
1. Click the `bi-arrow-right` back icon at top of sidebar card
**Expected Results**: Sidebar collapses back into the grid; card list still intact
**Business Rule**: Sidebar is a toggled view, no navigation
**Suggested Layer**: E2E

## Business Rules (TC-100 – TC-199)

### TC-100: Record-count label uses singular/plural grammar
**Category**: Business Rule
**Preconditions**: Logged in
**Steps**:
1. Search to produce exactly 1 result → observe label
2. Reset to produce N>1 results → observe label
**Expected Results**: `(1) Record Found` vs `(N) Records Found`
**Business Rule**: Discovered live: singular form at exactly 1 record
**Suggested Layer**: E2E (assert within TC-002/TC-001)

### TC-101: Name hints query uses nameOrId and shows matching employees
**Category**: Business Rule
**Preconditions**: Logged in
**Steps**:
1. Type ≥1 char of an existing name in Employee Name
**Expected Results**: `GET ?nameOrId=<typed>` fired; dropdown lists matching full names; selecting one fills the field
**Business Rule**: Hints come from the directory employees endpoint with `nameOrId`
**Suggested Layer**: E2E

### TC-102: Job Title dropdown reflects job titles configured in Admin
**Category**: Business Rule
**Preconditions**: Logged in; known seeded job titles
**Steps**:
1. Open Job Title dropdown
**Expected Results**: Options = `-- Select --` + the seeded titles (Business Analyst, HR Specialist, QA Engineer, Senior Software Engineer, Software Engineer, UI Engineer)
**Business Rule**: Dropdown is fed from Admin > Job > Job Titles
**Suggested Layer**: E2E

### TC-103: Location dropdown reflects locations configured in Admin
**Category**: Business Rule
**Preconditions**: Logged in; known seeded locations
**Steps**:
1. Open Location dropdown
**Expected Results**: Options = `-- Select --` + seeded locations (Seattle — Headquarters, Sydney — Pacific Office, Toronto — Support Center)
**Business Rule**: Dropdown is fed from Admin > Organization > Locations
**Suggested Layer**: E2E

### TC-104: Terminated employees are excluded from the directory
**Category**: Business Rule
**Preconditions**: Admin API session; a disposable employee created then terminated via PIM API
**Steps**:
1. Create employee via API; confirm present in `GET /directory/employees`
2. Terminate the employee via PIM API
3. Re-query directory list and `?nameOrId=` hints
**Expected Results**: Terminated employee no longer returned (list response carries `terminationId` and active list excludes terminated)
**Business Rule**: Directory is a roster of active staff
**Suggested Layer**: API

### TC-105: Card subtitle/body render only when job data exists
**Category**: Business Rule
**Preconditions**: One employee with job title+location seeded; one without (e.g. fresh seed state)
**Steps**:
1. Load directory; inspect both cards
**Expected Results**: Card for employee without job data shows only name+photo (subtitle and geo body `display:none`); employee with job data shows job title subtitle and location/sub-unit lines
**Business Rule**: Null fields are hidden, not rendered empty
**Suggested Layer**: E2E

### TC-106: Detail panel contact rows render only for populated fields
**Category**: Business Rule
**Preconditions**: Ruwan (email only, no phone) and Marcus (neither) exist
**Steps**:
1. Open detail panel for each
**Expected Results**: Ruwan: "Work Email" row with value, no telephone value; Marcus: no contact rows/icon buttons visible
**Business Rule**: `contactInfo` nulls suppress the corresponding rows
**Suggested Layer**: E2E

### TC-107: Directory list API exposes only directory-safe fields
**Category**: Business Rule
**Preconditions**: Admin API session
**Steps**:
1. `GET /api/v2/directory/employees?limit=14&offset=0`
**Expected Results**: Items contain empNumber, names, terminationId, jobTitle, subunit, location — no salary, no national ID, no personal contact data
**Business Rule**: Directory exposes a restricted projection of employee data
**Suggested Layer**: API

## Security (TC-200 – TC-299)

### TC-200: Unauthenticated UI access redirects to login
**Category**: Security
**Preconditions**: No session (fresh context)
**Steps**:
1. Navigate directly to `/web/index.php/directory/viewDirectory`
**Expected Results**: Redirected to `/auth/login`; no directory data rendered
**Business Rule**: All web views require an authenticated session
**Suggested Layer**: E2E

### TC-201: Unauthenticated API request returns 401
**Category**: Security
**Preconditions**: No session cookie
**Steps**:
1. `GET /api/v2/directory/employees?limit=14&offset=0` without cookies
**Expected Results**: HTTP 401 (verified live)
**Business Rule**: API v2 requires session/OAuth
**Suggested Layer**: API

### TC-202: ESS user has full read access to the directory
**Category**: Security
**Preconditions**: ESS user (marcus.chen) logged in
**Steps**:
1. Open Directory from the side menu
2. Search by another employee's name
**Expected Results**: Directory menu visible; ALL employees listed (not just self); same 3 filters; detail panel of co-workers opens with their work contact info
**Business Rule**: Corporate directory is org-wide read for every role (verified live)
**Suggested Layer**: E2E

### TC-203: Directory API is read-only — write methods rejected
**Category**: Security
**Preconditions**: Authenticated session (any role)
**Steps**:
1. `POST /api/v2/directory/employees` with a JSON body
2. `PUT /api/v2/directory/employees/1` with a JSON body
**Expected Results**: HTTP 405 Method Not Allowed for both (verified live); no employee data altered
**Business Rule**: Directory module exposes GET only
**Suggested Layer**: API

## Negative / Error (TC-300 – TC-399)

### TC-300: Free-typed (unselected) employee name blocks search with "Invalid"
**Category**: Negative
**Preconditions**: Logged in
**Steps**:
1. Type text in Employee Name without selecting any hint (e.g. `zzz_nonexistent`)
2. Click Search
**Expected Results**: Field error "Invalid" below Employee Name; no list request fired; existing results unchanged
**Business Rule**: Autocomplete requires a selected hint (verified live)
**Suggested Layer**: E2E

### TC-301: Filter combination with no matches shows "No Records Found"
**Category**: Negative
**Preconditions**: Logged in; a job title with no employees assigned exists
**Steps**:
1. Select that Job Title, click Search
**Expected Results**: Count area shows `No Records Found`; zero cards rendered
**Business Rule**: Empty result set is a normal state, not an error (verified live)
**Suggested Layer**: E2E

### TC-302: List API with non-existent empNumber returns 422
**Category**: Negative
**Preconditions**: Authenticated API session
**Steps**:
1. `GET /api/v2/directory/employees?limit=14&offset=0&empNumber=999999`
**Expected Results**: HTTP 422 (verified live)
**Business Rule**: Invalid parameter values are rejected, not silently emptied
**Suggested Layer**: API

### TC-303: Detail API with non-existent empNumber returns 422
**Category**: Negative
**Preconditions**: Authenticated API session
**Steps**:
1. `GET /api/v2/directory/employees/9999?model=detailed`
**Expected Results**: HTTP 422 (verified live — RecordNotFound maps to 422 here, not 404)
**Business Rule**: Same validation path as list endpoint
**Suggested Layer**: API

### TC-304: Name hints with no match show "No Records Found" in dropdown
**Category**: Negative
**Preconditions**: Logged in
**Steps**:
1. Type `zzz_nonexistent` in Employee Name; wait for hint query
**Expected Results**: Dropdown shows "No Records Found"; `?nameOrId=` returns empty `data` (verified live)
**Business Rule**: Hint search returns empty set gracefully
**Suggested Layer**: E2E

## Edge Cases (TC-400 – TC-499)

### TC-401: Full name renders as First + Middle + Last on the card
**Category**: Edge Case
**Preconditions**: Employee with middle name exists (Marcus **James** Chen)
**Steps**:
1. Load directory; read card header text
**Expected Results**: Card shows "Marcus James Chen" (middle name included); employees without middle name show no doubled spaces visible to users
**Business Rule**: Card header = firstName + middleName + lastName
**Suggested Layer**: E2E

### TC-402: Default page size is 14 — list beyond 14 employees paginates
**Category**: Edge Case
**Preconditions**: >14 active employees (seed via API if feasible; otherwise assert request `limit=14`)
**Steps**:
1. Load directory; observe `limit=14&offset=0` request
2. (With >14 employees) scroll/paginate to load the rest
**Expected Results**: First page capped at 14 cards; remaining employees reachable; `meta.total` reports the full count
**Business Rule**: Server-side paging with limit/offset
**Suggested Layer**: API (limit param contract); E2E optional when data volume permits

### TC-403: Hint search matches case-insensitively
**Category**: Edge Case
**Preconditions**: Employee "Ruwan Kumara" exists
**Steps**:
1. Type `ruw` (lowercase) in Employee Name
**Expected Results**: "Ruwan Kumara" hint still offered
**Business Rule**: nameOrId lookup is case-insensitive
**Suggested Layer**: E2E

### TC-404: Searching with all filters left empty reloads the full list
**Category**: Edge Case
**Preconditions**: Logged in, no filters set
**Steps**:
1. Click Search with every filter at default
**Expected Results**: No validation error; full list re-fetched and `(N) Records Found` unchanged
**Business Rule**: Empty filters are valid — equivalent to unfiltered query
**Suggested Layer**: E2E

## UI State (TC-500 – TC-599)

### TC-500: Default state — empty filters, dropdowns at "-- Select --", full grid
**Category**: UI State
**Preconditions**: Fresh navigation to directory
**Steps**:
1. Load page
**Expected Results**: Employee Name empty with placeholder `Type for hints...`; Job Title and Location show `-- Select --`; Reset and Search enabled; grid populated
**Business Rule**: Verified live default state
**Suggested Layer**: E2E

### TC-501: Hint dropdown shows loading then options while typing
**Category**: UI State
**Preconditions**: Logged in
**Steps**:
1. Type a matching prefix in Employee Name
**Expected Results**: Transient "Searching...." entry, then matching options replace it
**Business Rule**: OXD autocomplete async hint pattern
**Suggested Layer**: E2E (assert final options; loading state best-effort)

### TC-502: Detail panel state persists per selected card
**Category**: UI State
**Preconditions**: ≥2 employees
**Steps**:
1. Click employee A's card → panel shows A
2. Click employee B's card
**Expected Results**: Panel content switches to B (name, photo, contact rows); a fresh `?model=detailed` call per selection
**Business Rule**: Sidebar reflects the last clicked employee
**Suggested Layer**: E2E

### TC-503: Directory menu item present for both Admin and ESS side menus
**Category**: UI State
**Preconditions**: Admin and ESS sessions
**Steps**:
1. Inspect side menu in each session
**Expected Results**: "Directory" item present in both (Admin: full menu incl. Admin/PIM/...; ESS: Leave, Time, My Info, Performance, Dashboard, Directory, Claim, Buzz — verified live)
**Business Rule**: Directory is granted to all default roles
**Suggested Layer**: E2E (assert within role-based tests)

---

## Coverage Summary
| Lens | Scenarios |
|------|-----------|
| Happy Path | TC-001 – TC-008 (8) |
| Business Rules | TC-100 – TC-107 (8) |
| Security | TC-200 – TC-203 (4) |
| Negative | TC-300 – TC-304 (5) |
| Edge Cases | TC-401 – TC-404 (4) |
| UI State | TC-500 – TC-503 (4) |
| **Total** | **33** |

**Seeding note for implementers**: positive Job Title / Location filter matches (TC-003/004/005, TC-105) require assigning job details to an employee first — `PUT /api/v2/pim/employees/{empNumber}/job-details` with `jobTitleId` / `locationId`. Prefer a dedicated disposable employee (created+cleaned via API) over mutating the 5 seeded employees.
