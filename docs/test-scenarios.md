# Test Scenarios: PIM Reports

**Module**: PIM → Reports  
**URLs**:
- List: `/web/index.php/pim/viewDefinedPredefinedReports`
- Add: `/web/index.php/pim/definePredefinedReport`
- Edit: `/web/index.php/pim/definePredefinedReport/{id}`
- View: `/web/index.php/pim/displayPredefinedReport/{id}`

---

## Happy Path (TC-001–TC-099)

### TC-001: Navigate to PIM Reports via top menu
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Navigate to `/pim/viewEmployeeList`
2. Click "Reports" in the PIM top navigation bar
**Expected Results**: Page loads at `/pim/viewDefinedPredefinedReports`; heading "Employee Reports" is visible; "PIM Sample Report" row is present in the table  
**Business Rule**: Admin has access to PIM module and its sub-pages  
**Suggested Layer**: E2E

---

### TC-002: Default PIM Sample Report exists on fresh install
**Category**: Happy Path  
**Preconditions**: Logged in as Admin; standard seeded environment  
**Steps**:
1. Navigate to `/pim/viewDefinedPredefinedReports`
2. Observe the records table
**Expected Results**: Exactly "(1) Record Found"; table row shows "PIM Sample Report"; all three action buttons (delete, edit, view) are present  
**Business Rule**: "By default there is a report called PIM Sample Report"  
**Suggested Layer**: E2E

---

### TC-003: Add a minimal report (Report Name only)
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Navigate to `/pim/viewDefinedPredefinedReports`
2. Click "+ Add"
3. Fill Report Name with a unique value (e.g. "TC003 Minimal Report")
4. Leave Selection Criteria, Include, and Display Fields at defaults
5. Click "Save"
**Expected Results**: Toast "Successfully Saved"; redirected to `/pim/viewDefinedPredefinedReports`; new report row appears in the list  
**Business Rule**: Report Name is the only required field  
**Suggested Layer**: E2E

---

### TC-004: Add report with one Selection Criteria
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Click "+ Add" from the Reports list
2. Enter a unique Report Name
3. Under Selection Criteria, select "Job Title" from the dropdown
4. Click the Add (+) icon next to Selection Criteria
5. Click "Save"
**Expected Results**: "Successfully Saved" toast; report created with the Job Title criterion  
**Business Rule**: Selection Criteria requires clicking Add icon to register the selection  
**Suggested Layer**: E2E

---

### TC-005: Add report with one Display Field
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Click "+ Add" from Reports list
2. Enter unique Report Name
3. Under Display Fields, select "Personal" from "Select Display Field Group"
4. Select "Employee First Name" from "Select Display Field"
5. Click the Add (+) icon
6. Click "Save"
**Expected Results**: "Successfully Saved" toast; report persisted with Employee First Name field  
**Business Rule**: Display Field requires group selection → field selection → Add button click  
**Suggested Layer**: E2E

---

### TC-006: Add report with Selection Criteria + Include + Display Fields (full form)
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Click "+ Add"
2. Enter unique Report Name (e.g. "TC006 Full Report")
3. Select "Sub Unit" as Selection Criteria → click Add
4. Change Include to "Current and Past Employees"
5. Select "Job" field group → "Job Title" field → click Add
6. Click "Save"
**Expected Results**: "Successfully Saved"; report appears in list; editing the report shows all saved criteria and fields  
**Business Rule**: All sections are optional except Report Name; all fields persist correctly  
**Suggested Layer**: E2E

---

### TC-007: View report data via document icon
**Category**: Happy Path  
**Preconditions**: "PIM Sample Report" exists; at least one employee record exists  
**Steps**:
1. Navigate to reports list
2. Click the document (view) icon on "PIM Sample Report"
**Expected Results**: Navigated to `/pim/displayPredefinedReport/{id}`; heading shows "PIM Sample Report"; "(N) Records Found" count is visible; employee data rows are displayed with column groups (Personal, Contact Details, etc.)  
**Business Rule**: "In order to view report data, need to click on the file text icon"  
**Suggested Layer**: E2E

---

### TC-008: Edit an existing report name
**Category**: Happy Path  
**Preconditions**: A user-created report exists  
**Steps**:
1. Click the pencil (edit) icon on the report
2. Clear Report Name and enter a new unique name
3. Click "Save"
**Expected Results**: "Successfully Saved" toast; report list shows the updated name  
**Business Rule**: Report Name is editable; must be unique  
**Suggested Layer**: E2E

---

### TC-009: Delete a user-created report
**Category**: Happy Path  
**Preconditions**: A user-created report exists (not "PIM Sample Report")  
**Steps**:
1. Click the trash (delete) icon on the report row
2. Confirm the deletion dialog if prompted
**Expected Results**: Report row removed from list; record count decrements by 1; "Successfully Deleted" toast  
**Business Rule**: Hard delete — report is removed permanently  
**Suggested Layer**: E2E

---

### TC-010: Search reports list by name
**Category**: Happy Path  
**Preconditions**: Multiple reports exist (at least PIM Sample Report + 1 user-created)  
**Steps**:
1. Navigate to reports list
2. Type "PIM Sample" in the Report Name search box
3. Click "Search"
**Expected Results**: Only "PIM Sample Report" appears; record count shows "(1) Record Found"  
**Business Rule**: Search filters the list by partial name match  
**Suggested Layer**: E2E

---

### TC-011: Search with no matching name returns no results
**Category**: Happy Path  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Type a non-existent report name in the search box
2. Click "Search"
**Expected Results**: "(0) Records Found"; table body is empty or shows "No Records Found" message  
**Business Rule**: Empty search result state  
**Suggested Layer**: E2E

---

### TC-012: Reset search restores full list
**Category**: Happy Path  
**Preconditions**: A search filter is active  
**Steps**:
1. Enter a search term → click "Search"
2. Click "Reset"
**Expected Results**: Search field cleared; full report list reloaded  
**Business Rule**: Reset clears all filter inputs  
**Suggested Layer**: E2E

---

## Business Rules (TC-100–TC-199)

### TC-100: Report Name is mandatory
**Category**: Business Rule  
**Preconditions**: Logged in as Admin; on Add Report page  
**Steps**:
1. Leave Report Name blank
2. Click "Save"
**Expected Results**: Inline validation error "Required" appears under Report Name; page does not navigate away; no toast  
**Business Rule**: "Report Name — required"  
**Suggested Layer**: E2E

---

### TC-101: Selection Criteria must use Add icon to register
**Category**: Business Rule  
**Preconditions**: On Add Report page  
**Steps**:
1. Select "Gender" from Selection Criteria dropdown
2. Do NOT click the Add (+) icon
3. Click "Save"
4. Re-open the saved report in Edit mode
**Expected Results**: Report saves successfully but Selection Criteria shows no criteria (the selection was not committed without clicking Add)  
**Business Rule**: "Once select an option from the dropdown its needed to click on Add icon to add"  
**Suggested Layer**: E2E

---

### TC-102: Display Field must use Add icon to register
**Category**: Business Rule  
**Preconditions**: On Add Report page  
**Steps**:
1. Select "Personal" Display Field Group → "Employee Id" field
2. Do NOT click the Add (+) icon
3. Click "Save"
4. Re-open the saved report in Edit mode
**Expected Results**: Report saves successfully but Display Fields section shows no field (not committed without Add)  
**Business Rule**: "Once select an option from the dropdown its needed to click on Add icon to add"  
**Suggested Layer**: E2E

---

### TC-103: Include dropdown defaults to "Current Employees Only"
**Category**: Business Rule  
**Preconditions**: On Add Report page  
**Steps**:
1. Open Add Report page without changing Include
2. Observe the Include dropdown default value
**Expected Results**: Default value is "Current Employees Only"  
**Business Rule**: The Include filter defaults to current employees  
**Suggested Layer**: E2E

---

### TC-104: Include "Current Employees Only" filters out terminated employees
**Category**: Business Rule  
**Preconditions**: At least one terminated employee exists  
**Steps**:
1. Add report with Include = "Current Employees Only" and some display fields
2. View the report
3. Edit the same report, change Include = "Current and Past Employees"
4. View again
**Expected Results**: "Current Employees Only" does not show terminated employees; "Current and Past Employees" includes them; record counts differ  
**Business Rule**: Terminated employees disappear from default filters (business-rules.md §3)  
**Suggested Layer**: E2E

---

### TC-105: Multiple selection criteria can be added
**Category**: Business Rule  
**Preconditions**: On Add Report page  
**Steps**:
1. Select "Job Title" → click Add
2. Select "Sub Unit" → click Add
3. Click "Save"
**Expected Results**: Report saved; in Edit view both "Job Title" and "Sub Unit" appear as added selection criteria  
**Business Rule**: Multiple criteria are supported  
**Suggested Layer**: E2E

---

### TC-106: Multiple display fields from different groups
**Category**: Business Rule  
**Preconditions**: On Add Report page  
**Steps**:
1. Select "Personal" group → "Employee First Name" → click Add
2. Select "Job" group → "Job Title" → click Add
3. Save report; view it
**Expected Results**: Report view shows both "Personal" and "Job" as column group headers with their respective fields  
**Business Rule**: Display fields from multiple groups are all shown in the report output  
**Suggested Layer**: E2E

---

### TC-107: Remove a display field via × button in Edit mode
**Category**: Business Rule  
**Preconditions**: A report with multiple display fields exists  
**Steps**:
1. Open report in Edit mode
2. Click the × button next to one of the display fields
3. Save
4. View the report
**Expected Results**: The removed field no longer appears in the report view  
**Business Rule**: Fields can be individually removed from a report  
**Suggested Layer**: E2E

---

### TC-108: Include Header checkbox controls column group header display
**Category**: Business Rule  
**Preconditions**: A report with display fields exists; in Edit mode  
**Steps**:
1. Open a report in Edit mode
2. Observe "Include Header" checkbox (checked by default for each group)
3. Uncheck "Include Header" for one group
4. Save and view the report
**Expected Results**: The unchecked group header does not appear as a section header in the report output  
**Business Rule**: Include Header checkbox controls whether the group header row is shown  
**Suggested Layer**: E2E

---

## Security (TC-200–TC-299)

### TC-200: ESS user cannot access PIM Reports
**Category**: Security  
**Preconditions**: An ESS user account exists  
**Steps**:
1. Log in as ESS user
2. Attempt to navigate directly to `/pim/viewDefinedPredefinedReports`
**Expected Results**: Access denied — either redirected to dashboard or an unauthorized/forbidden page; PIM Reports are not visible in the ESS side menu  
**Business Rule**: ESS users do not have PIM module access (business-rules.md §2)  
**Suggested Layer**: E2E

---

### TC-201: Unauthenticated access to reports list redirects to login
**Category**: Security  
**Preconditions**: No active session  
**Steps**:
1. Without logging in, navigate to `/pim/viewDefinedPredefinedReports`
**Expected Results**: Redirect to `/auth/login?next=...`; reports list is not shown  
**Business Rule**: All PIM pages require authentication (business-rules.md §1)  
**Suggested Layer**: E2E

---

### TC-202: Unauthenticated access to Add Report redirects to login
**Category**: Security  
**Preconditions**: No active session  
**Steps**:
1. Without logging in, navigate to `/pim/definePredefinedReport`
**Expected Results**: Redirect to `/auth/login`  
**Business Rule**: Authentication required for all state-changing PIM actions  
**Suggested Layer**: E2E

---

### TC-203: Unauthenticated access to view report redirects to login
**Category**: Security  
**Preconditions**: No active session  
**Steps**:
1. Navigate to `/pim/displayPredefinedReport/5`
**Expected Results**: Redirect to `/auth/login`  
**Business Rule**: Report data (which contains employee PII) must never be exposed without authentication  
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–TC-399)

### TC-300: Save report with blank Report Name shows Required error
**Category**: Negative  
**Preconditions**: On Add Report page  
**Steps**:
1. Leave Report Name empty
2. Click Save
**Expected Results**: Inline "Required" error below Report Name; URL stays at `/pim/definePredefinedReport`; no record created  
**Business Rule**: Report Name is required  
**Suggested Layer**: E2E

---

### TC-301: Cancel returns to reports list without saving
**Category**: Negative  
**Preconditions**: On Add Report page; Report Name field has been filled  
**Steps**:
1. Type a report name
2. Click "Cancel"
**Expected Results**: Navigated back to `/pim/viewDefinedPredefinedReports`; no new report appears in the list  
**Business Rule**: Cancel discards unsaved changes  
**Suggested Layer**: E2E

---

### TC-302: Display Field Add button without selecting a field
**Category**: Negative  
**Preconditions**: On Add Report page  
**Steps**:
1. Select Display Field Group "Personal"
2. Leave Select Display Field as "-- Select --"
3. Click the Add (+) icon
**Expected Results**: No field is added to the selected fields list; possibly a validation indicator or the Add action is a no-op  
**Business Rule**: A field must be selected before clicking Add  
**Suggested Layer**: E2E

---

### TC-303: Selection Criteria Add without selecting a criterion
**Category**: Negative  
**Preconditions**: On Add Report page  
**Steps**:
1. Leave Selection Criteria as "-- Select --"
2. Click the Add (+) icon
**Expected Results**: No criterion is added; action is a no-op or shows validation  
**Business Rule**: A criterion must be selected before clicking Add  
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–TC-499)

### TC-400: Report Name at maximum character boundary
**Category**: Edge Case  
**Preconditions**: On Add Report page  
**Steps**:
1. Enter a Report Name of exactly the maximum allowed length (test 100 chars)
2. Click Save
**Expected Results**: Report saved successfully; name appears (possibly truncated in table display but stored correctly)  
**Business Rule**: Required field with length limit  
**Suggested Layer**: E2E

---

### TC-401: Report Name exceeds maximum length
**Category**: Edge Case  
**Preconditions**: On Add Report page  
**Steps**:
1. Enter a Report Name exceeding the maximum length
2. Click Save
**Expected Results**: Validation error "Should be less than N characters" (or field caps input); report not saved  
**Business Rule**: Length validation on all text fields  
**Suggested Layer**: E2E

---

### TC-402: Duplicate report name validation
**Category**: Edge Case  
**Preconditions**: "PIM Sample Report" exists  
**Steps**:
1. Click Add; enter "PIM Sample Report" as the name
2. Click Save
**Expected Results**: Error shown — either inline "Already exists" or a toast indicating the name is taken; no duplicate report created  
**Business Rule**: Report names must be unique (unique violation → "Already exists")  
**Suggested Layer**: E2E

---

### TC-403: Add display fields from all available groups
**Category**: Edge Case  
**Preconditions**: On Add Report page  
**Steps**:
1. Add at least one display field from each available group (Personal, Job, Contact Details, etc.)
2. Save the report
3. View the report
**Expected Results**: Report saved successfully; report view shows all selected field groups as column sections  
**Business Rule**: No restriction on number of display field groups  
**Suggested Layer**: E2E

---

### TC-404: Report Name with special characters (XSS probe)
**Category**: Edge Case  
**Preconditions**: On Add Report page  
**Steps**:
1. Enter `<script>alert(1)</script>` as Report Name
2. Click Save (or attempt to)
**Expected Results**: If saved, the name is rendered as escaped text — no alert dialog fires; the `<script>` tag does not execute  
**Business Rule**: All user input must be sanitized against XSS (OWASP Top 10)  
**Suggested Layer**: E2E

---

## UI State (TC-500–TC-599)

### TC-500: Reports list shows correct record count badge
**Category**: UI State  
**Preconditions**: Known number of reports exist  
**Steps**:
1. Navigate to `/pim/viewDefinedPredefinedReports`
2. Wait for loading to complete
**Expected Results**: "(N) Records Found" badge matches the actual number of visible rows  
**Business Rule**: Record count badge reflects real-time data  
**Suggested Layer**: E2E

---

### TC-501: Report list updates after adding a new report
**Category**: UI State  
**Preconditions**: Known count of existing reports  
**Steps**:
1. Note current record count
2. Add a new report and save
3. Return to the reports list
**Expected Results**: Record count increments by 1; new report name appears in the table  
**Business Rule**: List reflects current data state  
**Suggested Layer**: E2E

---

### TC-502: Report list updates after deleting a report
**Category**: UI State  
**Preconditions**: A user-created report exists  
**Steps**:
1. Note current count
2. Delete the user-created report
3. Observe the list
**Expected Results**: Record count decrements by 1; deleted report row is no longer present  
**Business Rule**: Deletion is immediate and reflected in the list  
**Suggested Layer**: E2E

---

### TC-503: Add Report form page heading is "Add Report"
**Category**: UI State  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Navigate to Add Report form
**Expected Results**: Page heading reads "Add Report"; Save and Cancel buttons are visible; Report Name field is empty  
**Business Rule**: Consistent page titles across add/edit flows  
**Suggested Layer**: E2E

---

### TC-504: Edit Report form page heading is "Edit Report" and pre-fills name
**Category**: UI State  
**Preconditions**: A report exists  
**Steps**:
1. Click edit icon on an existing report
**Expected Results**: URL is `/pim/definePredefinedReport/{id}`; heading reads "Edit Report"; Report Name field shows existing name  
**Business Rule**: Edit mode pre-populates all existing values  
**Suggested Layer**: E2E

---

### TC-505: View report page shows report name as heading and employee data
**Category**: UI State  
**Preconditions**: A report with display fields and matching employee data exists  
**Steps**:
1. Click view (document) icon
**Expected Results**: URL `/pim/displayPredefinedReport/{id}`; heading matches report name; record count shown; display fields appear as columns; employee rows rendered  
**Business Rule**: Report output renders all configured display fields  
**Suggested Layer**: E2E

---

### TC-506: Loading spinner shows while report list is loading
**Category**: UI State  
**Preconditions**: Logged in as Admin  
**Steps**:
1. Navigate to the reports list
2. Observe for `.oxd-loading-spinner` during load
**Expected Results**: Spinner is visible briefly then disappears; table appears after spinner is gone  
**Business Rule**: Tables load asynchronously with spinner (business-rules.md §10)  
**Suggested Layer**: E2E
