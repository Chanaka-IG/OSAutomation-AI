# Test Scenarios — Vacancies List & Filter Functionalities

**Feature:** Recruitment → Vacancies List (`/web/index.php/recruitment/viewJobVacancy`)  
**Generated:** 2026-05-23  
**API endpoint:** `GET /web/index.php/api/v2/recruitment/vacancies`

---

## Page Summary (verified against live app)

| Element | Detail |
|---|---|
| Filter fields | Job Title (OXD dropdown), Vacancy (OXD dropdown), Hiring Manager (OXD dropdown), Status (OXD dropdown: Active / Closed) |
| Filter buttons | Search, Reset |
| Table columns | Vacancy (sortable), Job Title (sortable), Hiring Manager (sortable), Status (sortable), Actions |
| Row actions | Edit (button 1), Delete (button 2) |
| Bulk actions | Per-row checkbox + Select-all header checkbox |
| Record counter | "(N) Records Found" |
| Pagination | 50 records per page (`limit=50&offset=0`) |
| Sort params | `sortField=vacancy.name`, `sortOrder=ASC\|DESC` |
| API filter params | `jobTitleId`, `vacancyId`, `hiringManagerId`, `status=true\|false` |

---

## TC-001–099: Happy Path

---

### TC-001: Vacancies list loads with all records and correct columns
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 1 vacancy exists  
**Steps**:
1. Navigate to `/web/index.php/recruitment/viewJobVacancy`
2. Wait for the table loader to disappear

**Expected Results**:
- Page heading shows "Vacancies"
- Table renders with columns: Vacancy, Job Title, Hiring Manager, Status, Actions
- "(N) Records Found" counter matches the number of rows displayed
- All filter dropdowns default to "-- Select --"
- Add button is visible  

**Business Rule**: Admin can view all vacancies regardless of job title or hiring manager  
**Suggested Layer**: E2E

---

### TC-002: Filter by Job Title returns only matching vacancies
**Category**: Happy Path  
**Preconditions**: Admin logged in; vacancies exist for at least two different job titles  
**Steps**:
1. Navigate to vacancies list
2. Select "QA Engineer" from the Job Title dropdown
3. Click Search

**Expected Results**:
- API call includes `jobTitleId={id}`
- Only vacancies with Job Title = "QA Engineer" appear in the table
- Record count updates to reflect filtered results
- Rows with other job titles are absent  

**Business Rule**: Job Title filter maps to `jobTitleId` API param  
**Suggested Layer**: E2E

---

### TC-003: Filter by specific Vacancy name returns exact match
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 2 vacancies exist  
**Steps**:
1. Navigate to vacancies list
2. Select a specific vacancy from the Vacancy dropdown
3. Click Search

**Expected Results**:
- API call includes `vacancyId={id}`
- Exactly 1 record matching the selected vacancy name is shown
- Record count shows "(1) Records Found"  

**Business Rule**: Vacancy filter maps to `vacancyId` API param  
**Suggested Layer**: E2E

---

### TC-004: Filter by Hiring Manager returns only their vacancies
**Category**: Happy Path  
**Preconditions**: Admin logged in; vacancies assigned to at least one hiring manager  
**Steps**:
1. Navigate to vacancies list
2. Select a hiring manager from the Hiring Manager dropdown
3. Click Search

**Expected Results**:
- API call includes `hiringManagerId={id}`
- All returned rows show the selected hiring manager
- No rows from other hiring managers appear  

**Business Rule**: Hiring Manager filter maps to `hiringManagerId` API param  
**Suggested Layer**: E2E

---

### TC-005: Filter by Status "Active" shows only active vacancies
**Category**: Happy Path  
**Preconditions**: Admin logged in; both Active and Closed vacancies exist  
**Steps**:
1. Navigate to vacancies list
2. Select "Active" from Status dropdown
3. Click Search

**Expected Results**:
- API call includes `status=true`
- All returned rows show Status = "Active"
- No "Closed" rows appear
- Record count reflects active-only count  

**Business Rule**: Active status = `status: true` in data model  
**Suggested Layer**: E2E

---

### TC-006: Filter by Status "Closed" shows only closed vacancies
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 1 Closed vacancy exists  
**Steps**:
1. Navigate to vacancies list
2. Select "Closed" from Status dropdown
3. Click Search

**Expected Results**:
- API call includes `status=false`
- All returned rows show Status = "Closed"
- No "Active" rows appear  

**Business Rule**: Closed status = `status: false` in data model  
**Suggested Layer**: E2E

---

### TC-007: Combine Job Title + Status filters narrows results
**Category**: Happy Path  
**Preconditions**: Admin logged in; vacancies with varying job titles and statuses exist  
**Steps**:
1. Navigate to vacancies list
2. Select "QA Engineer" from Job Title dropdown
3. Select "Active" from Status dropdown
4. Click Search

**Expected Results**:
- API call includes both `jobTitleId={id}&status=true`
- All returned rows have Job Title = "QA Engineer" AND Status = "Active"
- Record count is ≤ the count from filtering by Job Title alone  

**Business Rule**: Multiple filters are ANDed together  
**Suggested Layer**: E2E

---

### TC-008: Combine all four filters returns exact match
**Category**: Happy Path  
**Preconditions**: Admin logged in; a known vacancy exists with a specific job title, hiring manager, and status  
**Steps**:
1. Navigate to vacancies list
2. Select values in all four filter dropdowns matching a known vacancy
3. Click Search

**Expected Results**:
- API call includes all four params: `jobTitleId`, `vacancyId`, `hiringManagerId`, `status`
- Exactly 1 record matching all criteria is returned
- Record count shows "(1) Records Found"  

**Business Rule**: All filters apply simultaneously (AND logic)  
**Suggested Layer**: E2E

---

### TC-009: Reset button clears all filters and restores full list
**Category**: Happy Path  
**Preconditions**: Admin logged in; a filter has been applied  
**Steps**:
1. Navigate to vacancies list
2. Apply Status = "Active" filter and click Search
3. Click Reset

**Expected Results**:
- All four filter dropdowns revert to "-- Select --"
- API call fires without filter params (unfiltered)
- Record count returns to the full unfiltered count
- Table shows all vacancies again  

**Business Rule**: Reset clears filter state and re-fetches unfiltered data  
**Suggested Layer**: E2E

---

### TC-010: Edit button navigates to correct Edit Vacancy page
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 1 vacancy exists  
**Steps**:
1. Navigate to vacancies list
2. Click the Edit (first action) button on a vacancy row

**Expected Results**:
- Page navigates to `/web/index.php/recruitment/addJobVacancy/{id}`
- Heading reads "Edit Vacancy"
- Form is pre-populated with the correct vacancy data (name, job title, hiring manager)  

**Business Rule**: Edit action loads vacancy data by ID  
**Suggested Layer**: E2E

---

### TC-011: Delete button opens confirmation; confirming removes the record
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 1 vacancy with no associated candidates exists  
**Steps**:
1. Navigate to vacancies list and note the record count
2. Click the Delete (second action) button on a vacancy row
3. Click "Yes, Delete" in the confirmation dialog

**Expected Results**:
- Confirmation dialog appears with "Yes, Delete" / "No, Cancel" buttons
- After confirming, the vacancy disappears from the table
- Record count decrements by 1  

**Business Rule**: Vacancy is hard-deleted; no soft-delete for vacancies  
**Suggested Layer**: E2E

---

### TC-012: Add button navigates to Add Vacancy page
**Category**: Happy Path  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to vacancies list
2. Click the "+ Add" button

**Expected Results**:
- Page navigates to `/web/index.php/recruitment/addJobVacancy`
- Heading reads "Add Vacancy"
- Empty form is displayed  

**Business Rule**: Only Admin can create vacancies  
**Suggested Layer**: E2E

---

### TC-013: Table default sort is Vacancy name ASC on page load
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 3 vacancies exist  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- API is called with `sortField=vacancy.name&sortOrder=ASC`
- Vacancy names in the table are in alphabetical ascending order  

**Business Rule**: Default sort is vacancy name ASC  
**Suggested Layer**: E2E

---

### TC-014: Clicking Vacancy column header toggles sort to DESC
**Category**: Happy Path  
**Preconditions**: Admin logged in; at least 3 vacancies exist  
**Steps**:
1. Navigate to vacancies list (default ASC)
2. Click the "Vacancy" column header

**Expected Results**:
- API fires with `sortField=vacancy.name&sortOrder=DESC`
- Vacancy names reverse to descending alphabetical order
- Sort indicator on the column reflects DESC direction  

**Business Rule**: Column headers toggle sort direction between ASC and DESC  
**Suggested Layer**: E2E

---

### TC-015: Sort by Job Title column reorders rows
**Category**: Happy Path  
**Preconditions**: Admin logged in; vacancies with different job titles exist  
**Steps**:
1. Navigate to vacancies list
2. Click the "Job Title" column header

**Expected Results**:
- API fires with a job-title sort field
- Rows reorder alphabetically by job title  

**Business Rule**: All table columns are sortable  
**Suggested Layer**: E2E

---

### TC-016: Sort by Status column groups Active and Closed rows
**Category**: Happy Path  
**Preconditions**: Admin logged in; both Active and Closed vacancies exist  
**Steps**:
1. Navigate to vacancies list
2. Click the "Status" column header

**Expected Results**:
- Rows reorder so Active and Closed vacancies are grouped  

**Business Rule**: Status column is sortable  
**Suggested Layer**: E2E

---

### TC-017: Select-all header checkbox selects every row on the current page
**Category**: Happy Path  
**Preconditions**: Admin logged in; multiple vacancies exist  
**Steps**:
1. Navigate to vacancies list
2. Click the checkbox in the table header row

**Expected Results**:
- All row checkboxes become checked
- Header checkbox is in a checked state  

**Business Rule**: Bulk selection is scoped to the current page  
**Suggested Layer**: E2E

---

### TC-018: Bulk delete selected vacancies removes them from the list
**Category**: Happy Path  
**Preconditions**: Admin logged in; multiple vacancies with no associated candidates exist  
**Steps**:
1. Navigate to vacancies list
2. Check 2+ individual row checkboxes
3. Click the bulk delete button (trash icon)
4. Confirm deletion

**Expected Results**:
- All selected vacancies are removed from the table
- Record count decrements by the number deleted
- Unselected vacancies remain  

**Business Rule**: Bulk delete sends `DELETE` with array of IDs  
**Suggested Layer**: E2E

---

## TC-100–199: Business Rules

---

### TC-100: Vacancy dropdown lists all vacancies currently in the system
**Category**: Business Rule  
**Preconditions**: Admin logged in; N vacancies exist  
**Steps**:
1. Navigate to vacancies list
2. Open the Vacancy filter dropdown

**Expected Results**:
- Dropdown contains exactly N vacancy entries
- Each entry matches a vacancy name visible in the unfiltered table
- Populated from `GET /vacancies?model=summary`  

**Business Rule**: Vacancy dropdown is dynamically sourced from current system data  
**Suggested Layer**: E2E

---

### TC-101: Job Title dropdown lists ALL configured job titles — not just those with vacancies
**Category**: Business Rule  
**Preconditions**: Admin logged in; job titles seeded (Business Analyst, HR Specialist, QA Engineer, Senior Software Engineer, Software Engineer, UI Engineer)  
**Steps**:
1. Navigate to vacancies list
2. Open the Job Title filter dropdown

**Expected Results**:
- All configured job titles appear (including those with zero vacancies)  

**Business Rule**: Job Title dropdown sourced from Admin job titles list, not filtered by vacancy assignment  
**Suggested Layer**: E2E

---

### TC-102: Hiring Manager dropdown lists only employees who manage at least one vacancy
**Category**: Business Rule  
**Preconditions**: Admin logged in; some employees are hiring managers, others are not  
**Steps**:
1. Navigate to vacancies list
2. Open the Hiring Manager filter dropdown

**Expected Results**:
- Only employees currently assigned as hiring manager on ≥1 vacancy appear
- Employees with no vacancy assignment are absent  

**Business Rule**: Hiring Manager dropdown populated from `?model=summary&excludeInterviewers=false`  
**Suggested Layer**: E2E

---

### TC-103: Status "Active" maps to API param status=true
**Category**: Business Rule  
**Preconditions**: Admin logged in  
**Steps**:
1. Select "Active" from Status dropdown and click Search
2. Inspect the outgoing network request

**Expected Results**:
- API call URL contains `status=true`
- All returned rows show "Active" in the Status column  

**Business Rule**: Active = `status: true` boolean in the vacancy data model  
**Suggested Layer**: API

---

### TC-104: Status "Closed" maps to API param status=false
**Category**: Business Rule  
**Preconditions**: Admin logged in  
**Steps**:
1. Select "Closed" from Status dropdown and click Search
2. Inspect the outgoing network request

**Expected Results**:
- API call URL contains `status=false`
- All returned rows show "Closed"  

**Business Rule**: Closed = `status: false` in the vacancy data model  
**Suggested Layer**: API

---

### TC-105: Record count "(N) Records Found" matches API meta.total
**Category**: Business Rule  
**Preconditions**: Admin logged in; known number of active vacancies  
**Steps**:
1. Filter by Status = "Active" and click Search

**Expected Results**:
- "(N) Records Found" equals the `meta.total` value in the API response
- Visible row count equals N  

**Business Rule**: Record count sourced from `meta.total` in API response  
**Suggested Layer**: E2E

---

### TC-106: Default page load fires unfiltered API request with sort and limit params
**Category**: Business Rule  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to vacancies list and capture the network request

**Expected Results**:
- API called with `limit=50&offset=0&sortField=vacancy.name&sortOrder=ASC&model=detailed`
- No filter params (`jobTitleId`, `vacancyId`, `hiringManagerId`, `status`) present  

**Business Rule**: Page initializes with unfiltered, name-sorted, paginated request  
**Suggested Layer**: API

---

### TC-107: Default pagination is 50 records per page
**Category**: Business Rule  
**Preconditions**: At least 51 vacancies exist  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- First page shows at most 50 rows
- Pagination controls appear
- Page 2 navigation sends `offset=50`  

**Business Rule**: Default `limit=50` per page  
**Suggested Layer**: E2E

---

### TC-108: Vacancy filter dropdown updates after a new vacancy is created
**Category**: Business Rule  
**Preconditions**: Admin logged in  
**Steps**:
1. Count options in Vacancy filter dropdown
2. Create a new vacancy via Add Vacancy
3. Return to vacancies list
4. Open the Vacancy filter dropdown again

**Expected Results**:
- Newly created vacancy appears in the dropdown
- Total dropdown count is previous count + 1  

**Business Rule**: Vacancy dropdown is populated on each page load from current data  
**Suggested Layer**: E2E

---

## TC-200–299: Security

---

### TC-200: Unauthenticated user is redirected to login
**Category**: Security  
**Preconditions**: No active session  
**Steps**:
1. Without logging in, navigate directly to `/web/index.php/recruitment/viewJobVacancy`

**Expected Results**:
- Redirected to `/web/index.php/auth/login`
- Vacancies list is not rendered  

**Business Rule**: All module pages require an active session  
**Suggested Layer**: E2E

---

### TC-201: ESS user has no Recruitment item in the side navigation
**Category**: Security  
**Preconditions**: Logged in as an ESS user  
**Steps**:
1. Log in as an ESS user
2. Inspect the side navigation menu

**Expected Results**:
- "Recruitment" link is absent from the menu
- No path to vacancies list via navigation  

**Business Rule**: ESS role (userRoleId=2) has no access to the Recruitment module  
**Suggested Layer**: E2E

---

### TC-202: ESS user accessing vacancies list URL directly sees no Add/Edit/Delete controls
**Category**: Security  
**Preconditions**: Logged in as ESS user  
**Steps**:
1. Navigate directly to `/web/index.php/recruitment/viewJobVacancy`

**Expected Results**:
- "+ Add" button is not visible
- No Edit or Delete action buttons are present on rows (or page redirects/shows forbidden)  

**Business Rule**: Role-based permissions hide write controls from ESS users  
**Suggested Layer**: E2E

---

### TC-203: Unauthenticated API GET returns 401
**Category**: Security  
**Preconditions**: No session cookie / no Bearer token  
**Steps**:
1. Send `GET /web/index.php/api/v2/recruitment/vacancies` without authentication

**Expected Results**:
- HTTP 401 Unauthorized
- No vacancy data returned  

**Business Rule**: API requires valid session + CSRF or OAuth Bearer token  
**Suggested Layer**: API

---

### TC-204: ESS user cannot delete vacancy via direct API call
**Category**: Security  
**Preconditions**: Valid ESS session cookie obtained  
**Steps**:
1. Send `DELETE /web/index.php/api/v2/recruitment/vacancies` with ESS session and `{"ids":[1]}`

**Expected Results**:
- HTTP 403 Forbidden
- Vacancy is not deleted  

**Business Rule**: ESS role lacks write permission on Recruitment API endpoints  
**Suggested Layer**: API

---

## TC-300–399: Negative / Error

---

### TC-300: Filter combination with no matching records shows empty state
**Category**: Negative  
**Preconditions**: Admin logged in; a Job Title exists that has no vacancies  
**Steps**:
1. Navigate to vacancies list
2. Select a Job Title that has no associated vacancies
3. Click Search

**Expected Results**:
- Table body shows "No Records Found"
- Record count shows "(0) Records Found"
- No data rows are visible  

**Business Rule**: Zero-result search is valid; empty state must be clearly shown  
**Suggested Layer**: E2E

---

### TC-301: Clicking Search with no filter applied returns full unfiltered list
**Category**: Negative  
**Preconditions**: All filter dropdowns at "-- Select --"  
**Steps**:
1. Navigate to vacancies list
2. Click Search without selecting any filter

**Expected Results**:
- API fires without filter params
- Same result as the initial page load
- Record count unchanged  

**Business Rule**: Empty filters = no restriction = all records returned  
**Suggested Layer**: E2E

---

### TC-302: Cancelling delete confirmation keeps vacancy in the list
**Category**: Negative  
**Preconditions**: Admin logged in; at least 1 vacancy exists  
**Steps**:
1. Navigate to vacancies list; note record count
2. Click Delete on any row
3. Click "No, Cancel" in the confirmation dialog

**Expected Results**:
- Confirmation dialog closes
- Vacancy remains in the table
- Record count is unchanged  

**Business Rule**: Delete is a two-step action; cancellation must be a complete no-op  
**Suggested Layer**: E2E

---

### TC-303: Filtering by Status "Active" when all vacancies are Closed returns empty state
**Category**: Negative  
**Preconditions**: All existing vacancies have Status = "Closed"  
**Steps**:
1. Filter by Status = "Active" and click Search

**Expected Results**:
- "(0) Records Found" displayed
- Table shows "No Records Found"  

**Business Rule**: Filter strictly matches; no fallback to unfiltered results  
**Suggested Layer**: E2E

---

### TC-304: Filtering by Status "Closed" when all vacancies are Active returns empty state
**Category**: Negative  
**Preconditions**: All existing vacancies have Status = "Active"  
**Steps**:
1. Filter by Status = "Closed" and click Search

**Expected Results**:
- "(0) Records Found" and empty table  

**Business Rule**: Symmetric counterpart to TC-303  
**Suggested Layer**: E2E

---

### TC-305: Applying a Vacancy filter then resetting restores the full list
**Category**: Negative  
**Preconditions**: At least 2 vacancies exist  
**Steps**:
1. Select any specific Vacancy and click Search (1 result)
2. Click Reset

**Expected Results**:
- All filter fields cleared to "-- Select --"
- API fires without filter params
- Full unfiltered list is restored  

**Business Rule**: Reset completely clears all filter state  
**Suggested Layer**: E2E

---

## TC-400–499: Edge Cases

---

### TC-400: Vacancies list with zero records shows correct empty state
**Category**: Edge Case  
**Preconditions**: No vacancies exist in the system  
**Steps**:
1. Delete all vacancies via API
2. Navigate to vacancies list

**Expected Results**:
- Table header row (columns) is visible
- Table body shows "No Records Found"
- "(0) Records Found" counter displayed
- Vacancy and Hiring Manager dropdowns contain only "-- Select --"  

**Business Rule**: Empty list is a valid state; table still renders with column headers  
**Suggested Layer**: E2E

---

### TC-401: Vacancy with a long name displays without breaking table layout
**Category**: Edge Case  
**Preconditions**: A vacancy with a name at the maximum character limit exists  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- Long name truncates or wraps cleanly in the Vacancy column
- Adjacent columns (Job Title, Hiring Manager, Status, Actions) are not displaced  

**Business Rule**: UI must handle the data model's maximum field length gracefully  
**Suggested Layer**: E2E

---

### TC-402: Exactly 50 records — all shown on one page with no pagination
**Category**: Edge Case  
**Preconditions**: Exactly 50 vacancies exist  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- All 50 rows shown on page 1
- "(50) Records Found"
- No "next page" pagination control needed  

**Business Rule**: Pagination activates only when total > limit (50)  
**Suggested Layer**: E2E

---

### TC-403: 51 vacancies trigger pagination — page 2 accessible
**Category**: Edge Case  
**Preconditions**: 51 vacancies exist  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- Page 1 shows 50 rows
- Pagination control with page 2 appears
- Navigating to page 2 shows 1 row
- "(51) Records Found"
- Page 2 API request includes `offset=50`  

**Business Rule**: `offset` increments by `limit` (50) on each page navigation  
**Suggested Layer**: E2E

---

### TC-404: Sort toggle — clicking same column twice reverses direction
**Category**: Edge Case  
**Preconditions**: At least 3 vacancies with different names  
**Steps**:
1. Navigate to vacancies list (default: Vacancy ASC)
2. Click "Vacancy" column header once → DESC
3. Click "Vacancy" column header again → ASC

**Expected Results**:
- First click: `sortOrder=DESC`, rows reverse alphabetically
- Second click: `sortOrder=ASC`, rows return to original order  

**Business Rule**: Column sort toggles between ASC and DESC on repeated clicks  
**Suggested Layer**: E2E

---

### TC-405: Bulk delete all vacancies — list shows empty state afterwards
**Category**: Edge Case  
**Preconditions**: 3–5 vacancies with no candidates exist  
**Steps**:
1. Navigate to vacancies list
2. Click select-all header checkbox
3. Click bulk delete and confirm

**Expected Results**:
- All vacancies deleted
- Table shows "No Records Found"
- "(0) Records Found"
- Vacancy and Hiring Manager dropdowns now show only "-- Select --"  

**Business Rule**: Bulk delete accepts an array of IDs; empty list is valid post-state  
**Suggested Layer**: E2E

---

### TC-406: Hiring Manager dropdown shows no duplicates when one manager owns multiple vacancies
**Category**: Edge Case  
**Preconditions**: One hiring manager is assigned to 3+ vacancies  
**Steps**:
1. Navigate to vacancies list
2. Open the Hiring Manager filter dropdown

**Expected Results**:
- That hiring manager appears exactly once in the dropdown
- No duplicate entries  

**Business Rule**: Dropdown list is deduplicated by employee record  
**Suggested Layer**: E2E

---

### TC-407: Deleted vacancy no longer appears in the Vacancy filter dropdown
**Category**: Edge Case  
**Preconditions**: A specific vacancy exists and is visible in the Vacancy dropdown  
**Steps**:
1. Note a vacancy in the Vacancy dropdown
2. Delete that vacancy via the Delete action and confirm
3. Reload the vacancies list page
4. Open the Vacancy filter dropdown

**Expected Results**:
- The deleted vacancy name no longer appears in the dropdown  

**Business Rule**: Vacancy dropdown is populated on page load from current live data  
**Suggested Layer**: E2E

---

## TC-500–599: UI State

---

### TC-500: Shimmer/skeleton loader is shown while the API call is in progress
**Category**: UI State  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to vacancies list while observing page transitions

**Expected Results**:
- A loading indicator (shimmer or table loader) is visible while the API call is in flight
- Loader disappears once data is rendered  

**Business Rule**: Async data fetches must have a loading indicator per OXD design system  
**Suggested Layer**: E2E

---

### TC-501: Record count updates after each Search action
**Category**: UI State  
**Preconditions**: Known number of active vs. total vacancies  
**Steps**:
1. Note the initial "(N) Records Found"
2. Filter by Status = "Active" and click Search
3. Note the updated count

**Expected Results**:
- Counter updates immediately after the search response arrives
- Count matches the number of visible rows  

**Business Rule**: "(N) Records Found" reflects `meta.total` from the latest API response  
**Suggested Layer**: E2E

---

### TC-502: All filter dropdowns default to "-- Select --" on fresh page load
**Category**: UI State  
**Preconditions**: Admin navigates to the page with no pre-set query params  
**Steps**:
1. Navigate to `/web/index.php/recruitment/viewJobVacancy`

**Expected Results**:
- Job Title, Vacancy, Hiring Manager, and Status dropdowns all display "-- Select --"
- No filter is pre-applied  

**Business Rule**: Page initializes in an unfiltered state  
**Suggested Layer**: E2E

---

### TC-503: Clicking Reset restores all dropdowns to "-- Select --"
**Category**: UI State  
**Preconditions**: All four filter dropdowns have values selected  
**Steps**:
1. Select a value in each of the four filter dropdowns
2. Click Reset

**Expected Results**:
- All four dropdowns reset to "-- Select --"
- Table reloads with unfiltered data  

**Business Rule**: Reset is a one-click action that clears all filter state and re-fetches  
**Suggested Layer**: E2E

---

### TC-504: Filter panel collapse/expand toggle
**Category**: UI State  
**Preconditions**: Admin logged in; filter panel visible by default  
**Steps**:
1. Navigate to vacancies list (filter panel open)
2. Click the collapse toggle button next to the "Vacancies" heading
3. Click it again

**Expected Results**:
- First click: filter panel collapses (search fields and buttons hidden)
- Second click: filter panel expands again  

**Business Rule**: Filter panel has a toggle control (confirmed present in live page snapshot)  
**Suggested Layer**: E2E

---

### TC-505: Closed vacancy displays "Closed" label — not "Inactive", "false", or "0"
**Category**: UI State  
**Preconditions**: At least 1 vacancy with status=false exists  
**Steps**:
1. Navigate to vacancies list (or filter by Status = "Closed")
2. Inspect the Status cell for a closed vacancy

**Expected Results**:
- Status cell displays exactly "Closed"
- Does not display "Inactive", "false", "0", or any other representation  

**Business Rule**: UI display label must match the dropdown option label ("Closed")  
**Suggested Layer**: E2E

---

### TC-506: Row checkbox toggles checked/unchecked state independently
**Category**: UI State  
**Preconditions**: At least 1 vacancy in the list  
**Steps**:
1. Click a row's checkbox — it becomes checked
2. Click the same checkbox again — it becomes unchecked

**Expected Results**:
- Checkbox state toggles on each click
- Other row checkboxes are unaffected
- Header checkbox does not auto-check when only some rows are selected  

**Business Rule**: Per-row checkboxes are independent  
**Suggested Layer**: E2E

---

### TC-507: Select-all then deselect-all via header checkbox
**Category**: UI State  
**Preconditions**: Multiple vacancies exist  
**Steps**:
1. Click the header checkbox — all rows become selected
2. Click the header checkbox again — all rows become deselected

**Expected Results**:
- All row checkboxes check on first click
- All row checkboxes uncheck on second click  

**Business Rule**: Header checkbox acts as a master toggle for the current page  
**Suggested Layer**: E2E

---

### TC-508: Record count decrements by 1 after single vacancy deletion
**Category**: UI State  
**Preconditions**: N vacancies exist  
**Steps**:
1. Note "(N) Records Found"
2. Delete one vacancy and confirm
3. Observe the record count

**Expected Results**:
- Count updates to "(N-1) Records Found" without full page reload
- Deleted row disappears from the table immediately  

**Business Rule**: List updates reactively after a delete operation  
**Suggested Layer**: E2E

---

### TC-509: Edit button navigates to the correct vacancy's edit page
**Category**: UI State  
**Preconditions**: Multiple vacancies with known IDs  
**Steps**:
1. Navigate to vacancies list
2. Click Edit on a specific vacancy row

**Expected Results**:
- URL changes to `/web/index.php/recruitment/addJobVacancy/{correctId}`
- Edit form is pre-filled with that vacancy's data — not another vacancy's  

**Business Rule**: Edit action uses the per-row vacancy ID  
**Suggested Layer**: E2E

---

### TC-510: Action buttons (Edit, Delete) are present on every row
**Category**: UI State  
**Preconditions**: Multiple vacancies exist  
**Steps**:
1. Navigate to vacancies list

**Expected Results**:
- Every data row has exactly 2 action buttons (Edit and Delete)
- Buttons are visible and enabled on all rows  

**Business Rule**: Admin has full CRUD access on all vacancies  
**Suggested Layer**: E2E
