# Test Scenarios: Candidate List & Filters

**Feature**: Recruitment → Candidates List (`/web/index.php/recruitment/viewCandidates`)
**Generated**: 2026-05-24

---

## Filter panel fields (from domain knowledge & UI selectors):
- **Job Vacancy** — OXD custom dropdown (active vacancies only)
- **Status** — OXD dropdown (APPLICATION_INITIATED, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEW_PASSED, INTERVIEW_FAILED, JOB_OFFERED, OFFER_DECLINED, HIRED, REJECTED)
- **Candidate Name** — OXD autocomplete (`getByLabel('Candidate Name')`)
- **Keywords** — text input (`getByLabel('Keywords')`)
- **From Date / To Date** — date range inputs (yyyy-mm-dd)
- **Method of Application** — dropdown (Manual / Online)
- **Search / Reset / Add** — action buttons

## Table columns (from domain knowledge):
- Candidate Name | Vacancy | Hiring Manager | Date of Application | Status | Actions (Edit/Delete)

---

## Happy Path Scenarios (TC-001–099)

### TC-001: Candidates list page loads with records and correct columns
**Category**: Happy Path
**Preconditions**: Admin is logged in; at least one candidate exists in the system
**Steps**:
1. Navigate to `/web/index.php/recruitment/viewCandidates`
2. Wait for the table loader to disappear
**Expected Results**: Page heading "Candidates" is visible; columns Candidate Name, Vacancy, Hiring Manager, Date of Application, Status, Actions are present; at least one row is shown; "(N) Records Found" banner visible
**Business Rule**: Any admin can see all candidates across all vacancies
**Suggested Layer**: E2E

### TC-002: Search by Job Vacancy returns only candidates for that vacancy
**Category**: Happy Path
**Preconditions**: Admin logged in; candidates seeded for two different vacancies (A and B)
**Steps**:
1. Navigate to Candidates list
2. Select Vacancy A in the "Job Vacancy" filter
3. Click Search
**Expected Results**: All returned rows contain Vacancy A in the Vacancy column; Vacancy B rows are absent
**Business Rule**: `GET /recruitment/candidates?vacancyId=<id>` filters by vacancyId
**Suggested Layer**: E2E

### TC-003: Search by Status returns only candidates with that status
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one candidate with status APPLICATION_INITIATED seeded
**Steps**:
1. Navigate to Candidates list
2. Select "Application Initiated" from Status dropdown
3. Click Search
**Expected Results**: All returned rows show "Application Initiated" in the Status column
**Business Rule**: Status filter maps to `status` query param on API
**Suggested Layer**: E2E

### TC-004: Search by Keywords returns matching candidates
**Category**: Happy Path
**Preconditions**: Admin logged in; candidate seeded with keyword "automation"
**Steps**:
1. Navigate to Candidates list
2. Enter "automation" in the Keywords input
3. Click Search
**Expected Results**: Results include the candidate tagged with "automation"; no unrelated candidates returned
**Business Rule**: Keywords are stored on candidate record and filtered server-side
**Suggested Layer**: E2E

### TC-005: Reset clears all filters and restores full list
**Category**: Happy Path
**Preconditions**: Admin logged in; candidates exist
**Steps**:
1. Navigate to Candidates list; note initial record count
2. Select a vacancy filter; click Search → filtered count shown
3. Click Reset
**Expected Results**: All filter inputs are cleared; record count returns to initial total
**Business Rule**: Reset reverts server-side query to default (no filters)
**Suggested Layer**: E2E

### TC-006: Add button navigates to Add Candidate page
**Category**: Happy Path
**Preconditions**: Admin logged in on Candidates list
**Steps**:
1. Navigate to Candidates list
2. Click the "Add" button
**Expected Results**: URL becomes `/web/index.php/recruitment/addCandidate`
**Business Rule**: Navigation from list → add form
**Suggested Layer**: E2E

### TC-007: Edit button navigates to candidate profile/edit page
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one candidate exists
**Steps**:
1. Navigate to Candidates list
2. Click the edit (pencil) button on the first candidate row
**Expected Results**: URL changes to `/web/index.php/recruitment/addCandidate/<id>` (candidate profile)
**Business Rule**: Edit navigates to candidate profile where status transitions happen
**Suggested Layer**: E2E

---

## Business Rule Scenarios (TC-100–199)

### TC-100: Date range filter — From Date to To Date returns candidates in range
**Category**: Business Rule
**Preconditions**: Admin logged in; two candidates seeded with different dateOfApplication values — one within range, one outside
**Steps**:
1. Navigate to Candidates list
2. Enter fromDate and toDate that include only Candidate A's application date
3. Click Search
**Expected Results**: Candidate A appears in results; Candidate B (outside range) does not
**Business Rule**: `fromDate` / `toDate` filter on `dateOfApplication`
**Suggested Layer**: E2E

### TC-101: Method of Application filter — Manual vs Online
**Category**: Business Rule
**Preconditions**: Admin logged in; candidates seeded via manual entry (method = 1 = Manual)
**Steps**:
1. Navigate to Candidates list
2. Select "Manual" from Method of Application dropdown
3. Click Search
**Expected Results**: Only manually-applied candidates are shown
**Business Rule**: `methodOfApplication` flag on candidate record
**Suggested Layer**: E2E

### TC-102: Vacancy dropdown only shows active (not closed) vacancies
**Category**: Business Rule
**Preconditions**: Admin logged in; one active vacancy and one closed vacancy exist
**Steps**:
1. Navigate to Candidates list
2. Open the "Job Vacancy" filter dropdown
**Expected Results**: Active vacancy appears in the dropdown options; closed vacancy does NOT appear
**Business Rule**: Vacancy dropdown on the filter form only lists `status=true` vacancies
**Suggested Layer**: E2E

### TC-103: Status dropdown lists all valid pipeline statuses
**Category**: Business Rule
**Preconditions**: Admin logged in on Candidates list
**Steps**:
1. Open the Status filter dropdown
**Expected Results**: Dropdown contains options for Application Initiated, Shortlisted, Interview Scheduled, Interview Passed, Interview Failed, Job Offered, Offer Declined, Hired, Rejected
**Business Rule**: Candidate pipeline states enumerated in domain model
**Suggested Layer**: E2E

### TC-104: Combined filters (Vacancy + Status) narrow results correctly
**Category**: Business Rule
**Preconditions**: Candidates seeded across different vacancies and statuses
**Steps**:
1. Navigate to Candidates list
2. Select Vacancy A and Status = Application Initiated
3. Click Search
**Expected Results**: Only candidates matching BOTH Vacancy A AND APPLICATION_INITIATED status appear
**Business Rule**: Multi-filter query is ANDed on the server side
**Suggested Layer**: E2E

### TC-105: Record count banner reflects the filtered results count
**Category**: Business Rule
**Preconditions**: Admin logged in; candidates exist
**Steps**:
1. Note count on page load
2. Apply Status = Shortlisted filter and search
**Expected Results**: "(N) Records Found" accurately counts the visible rows in the table
**Business Rule**: Count label tracks actual API result set
**Suggested Layer**: E2E

---

## Security Scenarios (TC-200–299)

### TC-200: Unauthenticated access redirects to login page
**Category**: Security
**Preconditions**: No active session
**Steps**:
1. Navigate directly to `/web/index.php/recruitment/viewCandidates`
**Expected Results**: Browser is redirected to `/web/index.php/auth/login`
**Business Rule**: All protected pages require authentication
**Suggested Layer**: E2E

### TC-201: ESS user has no Recruitment menu item
**Category**: Security
**Preconditions**: Logged in as ESS user
**Steps**:
1. Log in as ESS user
2. Inspect the left sidebar navigation
**Expected Results**: "Recruitment" is not visible in the side menu
**Business Rule**: ESS role does not have access to Recruitment module
**Suggested Layer**: E2E

### TC-202: ESS user accessing candidates URL directly sees no Add/Edit/Delete controls
**Category**: Security
**Preconditions**: Logged in as ESS user
**Steps**:
1. Log in as ESS user
2. Navigate directly to `/web/index.php/recruitment/viewCandidates`
**Expected Results**: No "Add" button; no edit/delete icons in any row
**Business Rule**: ESS must not be able to modify candidate records
**Suggested Layer**: E2E

### TC-203: API call GET /recruitment/candidates returns 403 for ESS session
**Category**: Security
**Preconditions**: ESS user session active
**Steps**:
1. Make API GET to `/web/index.php/api/v2/recruitment/candidates` with ESS session cookie
**Expected Results**: HTTP 403 response
**Business Rule**: API enforces role-based access control
**Suggested Layer**: API

### TC-204: DELETE candidate via API returns 403 for ESS session
**Category**: Security
**Preconditions**: ESS user session; a candidate exists
**Steps**:
1. Attempt DELETE `/api/v2/recruitment/candidates` with ESS session
**Expected Results**: HTTP 403 response; candidate record not deleted
**Business Rule**: Destructive operations restricted to Admin role
**Suggested Layer**: API

---

## Negative / Error Scenarios (TC-300–399)

### TC-300: No-match filter combination shows "No Records Found" empty state
**Category**: Negative
**Preconditions**: Admin logged in; candidates exist but none match the impossible combination
**Steps**:
1. Navigate to Candidates list
2. Select a vacancy that has no candidates AND a specific Status
3. Click Search
**Expected Results**: Table shows "No Records Found" and no rows are rendered
**Business Rule**: Empty result set renders the empty-state UI element
**Suggested Layer**: E2E

### TC-301: Searching with no filters returns all candidates
**Category**: Negative
**Preconditions**: Admin logged in; candidates exist
**Steps**:
1. Navigate to Candidates list (default state — no filters set)
2. Click Search without setting any filter
**Expected Results**: All candidates are returned; record count equals total count in system
**Business Rule**: Empty filter = no restriction on the API query
**Suggested Layer**: E2E

### TC-302: Future From Date with past To Date returns empty (invalid range)
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Enter From Date = future date (e.g. 2030-01-01) and To Date = past date (e.g. 2020-01-01)
2. Click Search
**Expected Results**: Either validation error on the date range or no records returned
**Business Rule**: fromDate > toDate is an invalid range that should yield no results or a validation message
**Suggested Layer**: E2E

---

## Edge Case Scenarios (TC-400–499)

### TC-400: Candidate with special characters in name appears correctly in list
**Category**: Edge Case
**Preconditions**: Candidate seeded with name containing apostrophe or hyphen (e.g. "O'Brien")
**Steps**:
1. Navigate to Candidates list
2. Verify the candidate appears in the list
**Expected Results**: Name displayed correctly with special characters, not escaped or broken
**Business Rule**: VARCHAR fields in MySQL allow special characters; Vue renders them safely
**Suggested Layer**: E2E

### TC-401: Date boundary — candidate applied on exactly fromDate is included
**Category**: Edge Case
**Preconditions**: Candidate seeded with dateOfApplication = "2024-06-15"
**Steps**:
1. Set From Date = 2024-06-15, To Date = 2024-06-15
2. Click Search
**Expected Results**: The candidate is included in results (inclusive boundary)
**Business Rule**: Date filter is inclusive on both ends
**Suggested Layer**: E2E

### TC-402: Large result set — pagination controls appear when records exceed page size
**Category**: Edge Case
**Preconditions**: More than 50 candidates exist in the system
**Steps**:
1. Navigate to Candidates list
2. Click Search with no filters
**Expected Results**: Pagination controls appear; only 50 rows shown per page
**Business Rule**: Default page size is 50; pagination is required for large sets
**Suggested Layer**: E2E

### TC-403: Candidate Name autocomplete resolves partial name to correct record
**Category**: Edge Case
**Preconditions**: Candidate "Priya Sharma" exists
**Steps**:
1. Navigate to Candidates list
2. Type "Priya" in the Candidate Name autocomplete
3. Click the suggestion in the dropdown
4. Click Search
**Expected Results**: Only Priya Sharma (or candidates sharing that partial name) appear
**Business Rule**: Autocomplete fires a server-side lookup; selecting a suggestion populates the hidden candidateId param
**Suggested Layer**: E2E

---

## UI State Scenarios (TC-500–599)

### TC-500: Page title and heading are correct
**Category**: UI State
**Preconditions**: Admin logged in and on Candidates list page
**Steps**:
1. Navigate to Candidates list
**Expected Results**: Page heading reads "Candidates"; correct module breadcrumb shown
**Business Rule**: Standard OrangeHRM page title pattern
**Suggested Layer**: E2E

### TC-501: Table shows correct column headers
**Category**: UI State
**Preconditions**: Admin logged in on Candidates list
**Steps**:
1. Navigate to Candidates list
**Expected Results**: Column headers: Candidate Name, Vacancy, Hiring Manager, Date of Application, Status, Actions
**Business Rule**: Candidate list table schema from domain model
**Suggested Layer**: E2E

### TC-502: Each candidate row has Edit and Delete action buttons
**Category**: UI State
**Preconditions**: Admin logged in; at least one candidate exists
**Steps**:
1. Navigate to Candidates list
2. Inspect each visible row
**Expected Results**: Every row has pencil (edit) and trash (delete) icon buttons
**Business Rule**: Admin can edit or delete any candidate
**Suggested Layer**: E2E

### TC-503: Record count updates after applying a filter
**Category**: UI State
**Preconditions**: Admin logged in; multiple candidates with different statuses
**Steps**:
1. Note initial "(N) Records Found"
2. Filter by a status with fewer results
3. Click Search
**Expected Results**: "(M) Records Found" where M < N
**Business Rule**: Record count reflects current server-side result set
**Suggested Layer**: E2E

### TC-504: Delete confirmation dialog appears before candidate is removed
**Category**: UI State
**Preconditions**: Admin logged in; at least one candidate to delete
**Steps**:
1. Click the trash icon on a candidate row
**Expected Results**: Confirmation dialog appears with "Yes, Delete" and "No, Cancel" buttons
**Business Rule**: Destructive action requires confirmation
**Suggested Layer**: E2E

### TC-505: Cancel on delete confirmation leaves the candidate in the list
**Category**: UI State
**Preconditions**: Admin logged in; candidate exists
**Steps**:
1. Click trash icon on a candidate row
2. Click "No, Cancel" on the confirmation dialog
**Expected Results**: Dialog closes; candidate row remains visible in the table
**Business Rule**: Cancel on delete = no-op
**Suggested Layer**: E2E

### TC-506: Delete confirmed removes candidate from list
**Category**: UI State
**Preconditions**: Admin logged in; a candidate to delete is seeded
**Steps**:
1. Click trash icon on a candidate row
2. Click "Yes, Delete"
3. Wait for table to reload
**Expected Results**: The deleted candidate no longer appears in the table; toast may show success
**Business Rule**: Admin can hard-delete candidate records
**Suggested Layer**: E2E
