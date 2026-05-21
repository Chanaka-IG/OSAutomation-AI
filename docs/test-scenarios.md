# Test Scenarios: Add Vacancies
**Module**: Recruitment → Vacancies  
**Feature**: Add a new Job Vacancy  
**Navigation**: Recruitment → Vacancies → Add  
**API Endpoint**: `POST /web/index.php/api/v2/recruitment/vacancies`  

---

## Happy Path

### TC-001: Add Vacancy with Required Fields Only
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: Admin logged in; at least one Job Title exists in Admin → Job → Job Titles; at least one Employee record exists  
**Steps**:
1. Navigate to Recruitment → Vacancies
2. Click **Add**
3. Enter a unique **Vacancy Name** (e.g., `Software Engineer - QA`)
4. Select a valid **Job Title** from the dropdown (e.g., `QA Engineer`)
5. Type at least 2 characters in **Hiring Manager** autocomplete; select a valid employee
6. Enter **Number of Positions** = `1`
7. Leave Description blank
8. Leave Published toggle as-is (default off)
9. Click **Save**
**Expected Results**:
- Success toast `"Successfully Saved"` appears in bottom-right
- Page redirects to vacancy list or vacancy detail
- New vacancy row appears in the vacancies table
**Business Rule**: Vacancy requires name, jobTitleId, hiringManagerId, numOfPositions (≥1)  
**Suggested Layer**: E2E

---

### TC-002: Add Vacancy with All Fields Populated
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee record exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → click **Add**
2. Enter **Vacancy Name**: `Senior Frontend Developer`
3. Select **Job Title** from dropdown
4. Select **Hiring Manager** via autocomplete
5. Enter **Number of Positions**: `5`
6. Enter **Description**: `We are looking for a senior frontend engineer with Vue.js experience.`
7. Toggle **Active** to active (if not already)
8. Toggle **Publish in Job Board / RSS Feed** to enabled
9. Click **Save**
**Expected Results**:
- Toast `"Successfully Saved"` is shown
- Vacancy appears in the list with status Active and published indicator
- All fields reflect saved values when vacancy is reopened for editing
**Business Rule**: `isPublished` flag controls visibility on public job board; `status` controls Active/Closed  
**Suggested Layer**: E2E

---

### TC-003: Verify New Vacancy Appears in Vacancies List
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: Admin logged in; at least one Job Title and Employee exist  
**Steps**:
1. Note the current record count on the Vacancies list page
2. Add a vacancy (TC-001 steps)
3. After save, navigate to Recruitment → Vacancies list
4. Wait for `.oxd-loading-spinner` to disappear
5. Verify the newly added vacancy name appears in the table
**Expected Results**:
- Record count increments by 1
- Vacancy row shows correct Name, Job Title, Hiring Manager, Status
**Business Rule**: Vacancy list shows all created vacancies  
**Suggested Layer**: E2E

---

### TC-004: Add Vacancy with Active Status
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields
3. Ensure the **Status** toggle is set to **Active**
4. Click **Save**
**Expected Results**:
- Vacancy saved successfully
- Vacancy list shows status as `Active`
- Vacancy appears in the dropdown when adding a candidate (`/recruitment/addCandidate`)
**Business Rule**: Active vacancies are selectable for candidate applications  
**Suggested Layer**: E2E

---

### TC-005: Add Vacancy with Closed Status
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields
3. Set **Status** toggle to **Closed / Inactive**
4. Click **Save**
**Expected Results**:
- Vacancy saved successfully with status Closed
- Vacancy does NOT appear in the Vacancy dropdown when adding a new candidate
- Vacancy appears in the list with Closed status indicator
**Business Rule**: Closed/Inactive vacancies are not available for new candidate applications  
**Suggested Layer**: E2E

---

### TC-006: Navigate to Add Vacancy via Recruitment Menu
**Category**: Happy Path  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. Click **Recruitment** in the left side panel
2. Click **Vacancies** sub-menu item
3. Click **Add** button (`.orangehrm-header-container button:has-text("Add")`)
**Expected Results**:
- Add Vacancy form renders with all expected fields: Vacancy Name, Job Title, Hiring Manager, Number of Positions, Description, Active status toggle, Published toggle
- URL contains the vacancy add path
**Business Rule**: Only Admin role can access Recruitment module  
**Suggested Layer**: E2E

---

### TC-007: Add Vacancy and Associate a Candidate
**Category**: Happy Path  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Add a vacancy using TC-001 steps; note the vacancy name
2. Navigate to Recruitment → Candidates → Add
3. Fill candidate First Name, Last Name, Email
4. In the **Vacancy** dropdown, select the newly created vacancy
5. Set Date of Application; check Consent to keep data
6. Click **Save**
**Expected Results**:
- Candidate saved with status `APPLICATION_INITIATED`
- Candidate is associated with the created vacancy
- Filtering candidates by the vacancy name returns this candidate
**Business Rule**: A Vacancy must exist before candidates can be applied against it  
**Suggested Layer**: E2E

---

## Business Rules

### TC-100: Vacancy Name Must Be Unique
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Admin logged in; a vacancy named `Duplicate Name Test` already exists  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter **Vacancy Name**: `Duplicate Name Test` (same as existing)
3. Select a valid Job Title and Hiring Manager
4. Enter Number of Positions: `1`
5. Click **Save**
**Expected Results**:
- Save is blocked
- Error toast or inline validation shows `"Already exists"` near the Vacancy Name field
- No new vacancy is created
**Business Rule**: Business rules §9: Unique violations surface as `"Already exists"` error; vacancy name must be unique  
**Suggested Layer**: E2E, API

---

### TC-101: Job Title Must Pre-exist in Admin → Job → Job Titles
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Admin logged in; the Job Title dropdown is populated only from Admin → Job → Job Titles  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Observe the **Job Title** dropdown options
3. Attempt to manually type a non-existent job title name (if the field accepts text entry)
4. Verify only existing job titles appear in the dropdown
**Expected Results**:
- Job Title is a constrained dropdown (not a free-text input)
- Only job titles already defined in Admin → Job → Job Titles are selectable
- Cannot save a vacancy with a job title not in the system
**Business Rule**: §7 — Vacancy is tied to exactly one Job Title which must already exist  
**Suggested Layer**: E2E

---

### TC-102: Hiring Manager Must Be an Existing Employee
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. In the **Hiring Manager** autocomplete, type a name that does not match any employee
3. Attempt to select a non-existent suggestion or leave the field with unresolved text
4. Click **Save**
**Expected Results**:
- No match appears in the autocomplete dropdown for non-existent names
- If free text is left without selecting a valid autocomplete option, save fails with a required/invalid field error
- Vacancy cannot be saved with an unresolved Hiring Manager
**Business Rule**: §7 — Hiring Manager must be an existing Employee (FK constraint)  
**Suggested Layer**: E2E

---

### TC-103: Number of Positions Must Be at Least 1
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill in Name, Job Title, Hiring Manager
3. Enter **Number of Positions**: `0`
4. Click **Save**
**Expected Results**:
- Save is blocked
- Inline validation message: `"Should be greater than 0"` or similar
- No vacancy is created
**Business Rule**: §Edge-Boundary test data — `numOfPositions`: 0 rejected, 1 minimum  
**Suggested Layer**: E2E, API

---

### TC-104: Published Vacancy Appears on Public Job Board
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Create a vacancy with **Publish in Job Board** toggled ON and Status = Active
2. Create a second vacancy with **Publish in Job Board** toggled OFF
3. Navigate to the public job site (RSS feed or job site URL if configured)
**Expected Results**:
- Vacancy 1 (published) appears in the public listing
- Vacancy 2 (unpublished) does NOT appear in the public listing
**Business Rule**: `isPublished` flag controls visibility on public job site  
**Suggested Layer**: E2E

---

### TC-105: Vacancy Status Controls Candidate Availability
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Admin logged in; one Active vacancy and one Closed vacancy exist  
**Steps**:
1. Navigate to Recruitment → Candidates → Add
2. Open the **Vacancy** dropdown
3. Observe which vacancies are listed
**Expected Results**:
- Only Active vacancies appear in the dropdown
- The Closed vacancy does not appear as an option
**Business Rule**: §7 — candidates can only be applied against existing (active) vacancies  
**Suggested Layer**: E2E

---

### TC-106: Deleting a Job Title Blocked When Referenced by a Vacancy
**Category**: Business Rule  
**Priority**: P1  
**Preconditions**: Admin logged in; a vacancy exists that references Job Title X  
**Steps**:
1. Navigate to Admin → Job → Job Titles
2. Attempt to delete Job Title X (the one referenced by the active vacancy)
3. Confirm the delete action
**Expected Results**:
- Delete is blocked
- Error message: `"This record is in use and cannot be deleted"`
- Job Title remains in the system
**Business Rule**: §11 — Job Titles are hard-deleted but deletion is blocked if referenced by a vacancy  
**Suggested Layer**: E2E

---

### TC-107: API POST Vacancy — All Required Fields Validated
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Valid Admin session with Bearer token  
**Steps**:
1. Send `POST /web/index.php/api/v2/recruitment/vacancies` with body:
   ```json
   { "name": "API Test Vacancy", "jobTitleId": <valid_id>, "hiringManagerId": <valid_emp_id>, "numOfPositions": 3, "isPublished": false, "status": true }
   ```
2. Note the response
**Expected Results**:
- HTTP 200/201
- Response contains created vacancy data with auto-generated `vacancyId`
- `GET /recruitment/vacancies` returns the new record
**Business Rule**: API POST endpoint requires all mandatory fields; returns standard envelope `{ "data": {...}, "meta": {...} }`  
**Suggested Layer**: API

---

### TC-108: API POST Vacancy — Missing Required Field Returns 422
**Category**: Business Rule  
**Priority**: P0  
**Preconditions**: Valid Admin session with Bearer token  
**Steps**:
1. Send `POST /web/index.php/api/v2/recruitment/vacancies` with `name` omitted:
   ```json
   { "jobTitleId": <valid_id>, "hiringManagerId": <valid_emp_id>, "numOfPositions": 1, "isPublished": false, "status": true }
   ```
**Expected Results**:
- HTTP 422
- Response body: `{ "error": { "status": "422", "text": "Invalid Parameter" }, "data": { "name": "Required" } }`
**Business Rule**: §9 — Required fields return 422 with `"Required"` in the data field  
**Suggested Layer**: API

---

## Security

### TC-200: ESS User Cannot Access Recruitment → Vacancies via UI
**Category**: Security  
**Priority**: P0  
**Preconditions**: ESS user account exists and is logged in  
**Steps**:
1. Login as an ESS user
2. Observe the side navigation menu
3. Attempt direct URL navigation to the Recruitment Vacancies list page
**Expected Results**:
- Recruitment menu item is NOT visible in the ESS side panel
- Direct URL navigation renders an empty page, 403, or redirects with "Forbidden" message
- No vacancy data is displayed
**Business Rule**: §2 — ESS users only see My Info, Leave, Time, Performance, Directory, Dashboard, Buzz  
**Suggested Layer**: E2E

---

### TC-201: ESS User Cannot Create Vacancy via API
**Category**: Security  
**Priority**: P0  
**Preconditions**: ESS user session cookie and CSRF token obtained  
**Steps**:
1. Login as ESS user; capture session cookie and `_token`
2. Send `POST /web/index.php/api/v2/recruitment/vacancies` with valid body and ESS session
**Expected Results**:
- HTTP 403 Forbidden
- Response: `{ "error": { "status": "403", "text": "Unauthorized" } }`
- No vacancy is created
**Business Rule**: §9 — Cross-user/role API access returns 403 Unauthorized  
**Suggested Layer**: API

---

### TC-202: ESS User Cannot Read Vacancy List via API
**Category**: Security  
**Priority**: P0  
**Preconditions**: ESS user Bearer token obtained  
**Steps**:
1. Send `GET /web/index.php/api/v2/recruitment/vacancies` with ESS Bearer token
**Expected Results**:
- HTTP 403 Forbidden
- Zero vacancy records returned; no data leak
**Business Rule**: §9 — ESS role cannot read Recruitment data  
**Suggested Layer**: API

---

### TC-203: Unauthenticated API Call to Create Vacancy is Rejected
**Category**: Security  
**Priority**: P0  
**Preconditions**: No active session (logged out)  
**Steps**:
1. Send `POST /web/index.php/api/v2/recruitment/vacancies` with no auth header and no session cookie
**Expected Results**:
- HTTP 401 Unauthorized
- Response: `{ "error": { "status": "401", "text": "Unauthorized" } }`
**Business Rule**: §1 — All API calls require valid session; §API Auth — Missing/expired Bearer token returns 401  
**Suggested Layer**: API

---

### TC-204: CSRF Token Required for Form Submission
**Category**: Security  
**Priority**: P0  
**Preconditions**: Admin logged in  
**Steps**:
1. Open the Add Vacancy form
2. Intercept the form POST request (using a proxy or browser DevTools)
3. Remove the `_token` field from the request
4. Submit the modified request
**Expected Results**:
- HTTP 401 or 403
- Response: `{ "error": { "status": "401", "text": "Invalid CSRF token" } }`
- No vacancy is created
**Business Rule**: §1 — Every form includes a hidden `_token` CSRF field; automated posts without it are rejected  
**Suggested Layer**: API

---

### TC-205: Session Timeout Redirects to Login Before Vacancy Save
**Category**: Security  
**Priority**: P1  
**Preconditions**: Admin session aged past 30 minutes idle timeout  
**Steps**:
1. Fill the Add Vacancy form but do not submit
2. Wait for the session to expire (idle timeout = 30 min)
3. Click **Save**
**Expected Results**:
- Request is rejected or redirect to `/auth/login?next=<original-url>`
- No vacancy is created without a valid session
**Business Rule**: §1 — Idle timeout defaults to 30 minutes; deep links after timeout redirect to `/auth/login?next=<url>`  
**Suggested Layer**: E2E

---

### TC-206: Hiring Manager Field Cannot Be Injected with Script
**Category**: Security  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. In the **Hiring Manager** autocomplete field, type `<script>alert('xss')</script>`
2. In the **Vacancy Name** field, type `"><img src=x onerror=alert(1)>`
3. Click **Save**
**Expected Results**:
- Input is treated as plain text; no script executes
- If saved, the value is HTML-escaped when displayed in the vacancy list
- No XSS alert fires
**Business Rule**: Inputs must be sanitized; OXD renders via Vue's safe text bindings  
**Suggested Layer**: E2E

---

## Negative / Error

### TC-300: Save Without Vacancy Name Shows Required Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Leave **Vacancy Name** blank
3. Fill Job Title, Hiring Manager, Number of Positions
4. Click **Save** (or blur the Name field)
**Expected Results**:
- Inline error `"Required"` appears below the Vacancy Name input
- Form does not submit
- No toast appears
**Business Rule**: §9 — Required text fields show `"Required"` immediately below the OXD input when blurred empty  
**Suggested Layer**: E2E

---

### TC-301: Save Without Job Title Shows Required Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill **Vacancy Name** and **Hiring Manager** and **Number of Positions**
3. Leave **Job Title** unselected
4. Click **Save**
**Expected Results**:
- Inline error `"Required"` appears below the Job Title dropdown
- Form does not submit
**Business Rule**: §9 — Required fields show `"Required"` on invalid submit attempt  
**Suggested Layer**: E2E

---

### TC-302: Save Without Hiring Manager Shows Required Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title exists  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill **Vacancy Name**, **Job Title**, **Number of Positions**
3. Leave **Hiring Manager** blank
4. Click **Save**
**Expected Results**:
- Inline error `"Required"` appears below the Hiring Manager input
- Form does not submit
**Business Rule**: §7, §9 — Hiring Manager is mandatory for a vacancy  
**Suggested Layer**: E2E

---

### TC-303: Save Without Number of Positions Shows Required Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill Name, Job Title, Hiring Manager
3. Leave **Number of Positions** blank
4. Click **Save**
**Expected Results**:
- Inline error `"Required"` or `"Should be a number"` appears below the field
- Form does not submit
**Business Rule**: §9 — Numeric fields show `"Should be a number"` or `"Should be greater than 0"`  
**Suggested Layer**: E2E

---

### TC-304: Number of Positions = 0 is Rejected
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill Name, Job Title, Hiring Manager
3. Enter **Number of Positions**: `0`
4. Click **Save**
**Expected Results**:
- Validation error `"Should be greater than 0"` (or equivalent) displayed
- No vacancy created
**Business Rule**: §Edge-Boundary — `numOfPositions`: 0 rejected, 1 minimum  
**Suggested Layer**: E2E, API

---

### TC-305: Negative Number of Positions is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill Name, Job Title, Hiring Manager
3. Enter **Number of Positions**: `-5`
4. Click **Save**
**Expected Results**:
- Validation error shown (`"Should be greater than 0"`)
- No vacancy created
**Business Rule**: §9 — Numeric fields must be positive  
**Suggested Layer**: E2E, API

---

### TC-306: Duplicate Vacancy Name Returns Error
**Category**: Negative  
**Priority**: P0  
**Preconditions**: Admin logged in; a vacancy named `Existing Vacancy` already exists  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter **Vacancy Name**: `Existing Vacancy`
3. Fill all other required fields
4. Click **Save**
**Expected Results**:
- Error toast or field-level message: `"Already exists"`
- No second vacancy with the same name is created
**Business Rule**: §9, §100 — Unique violations surface as `"Already exists"`  
**Suggested Layer**: E2E, API

---

### TC-307: Cancel Button Does Not Create a Vacancy
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields with valid data
3. Click **Cancel** instead of Save
**Expected Results**:
- No vacancy is created
- User is redirected back to the Vacancies list
- Record count remains unchanged
**Business Rule**: Cancel action discards unsaved changes  
**Suggested Layer**: E2E

---

### TC-308: Non-numeric Input in Number of Positions is Rejected
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill Name, Job Title, Hiring Manager
3. Enter **Number of Positions**: `abc`
4. Click **Save**
**Expected Results**:
- Validation error `"Should be a number"` shown
- No vacancy created
**Business Rule**: §9 — Numeric fields show `"Should be a number"`  
**Suggested Layer**: E2E

---

### TC-309: API POST with Non-existent jobTitleId Returns 422
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Valid Admin Bearer token  
**Steps**:
1. Send `POST /web/index.php/api/v2/recruitment/vacancies` with `jobTitleId: 999999` (non-existent)
**Expected Results**:
- HTTP 422 with error body referencing invalid `jobTitleId`
- No vacancy created
**Business Rule**: §9 — FK constraints validated at API layer  
**Suggested Layer**: API

---

### TC-310: API POST with Non-existent hiringManagerId Returns 422
**Category**: Negative  
**Priority**: P1  
**Preconditions**: Valid Admin Bearer token  
**Steps**:
1. Send `POST /web/index.php/api/v2/recruitment/vacancies` with `hiringManagerId: 999999` (non-existent employee)
**Expected Results**:
- HTTP 422 with appropriate error message
- No vacancy created
**Business Rule**: §7 — Hiring Manager must be a valid existing employee  
**Suggested Layer**: API

---

## Edge Cases

### TC-400: Vacancy Name at Maximum Length (250 chars)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter a **Vacancy Name** of exactly 250 characters (or the documented max length)
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Vacancy is saved successfully
- Name displayed in full (or truncated with tooltip) in the list
**Business Rule**: §9 — Length-limited fields show `"Should be less than N characters"` when exceeded  
**Suggested Layer**: E2E

---

### TC-401: Vacancy Name Exceeding Maximum Length is Rejected
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter a **Vacancy Name** of 251+ characters
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Inline validation: `"Should be less than N characters"` (N = documented limit)
- Vacancy not created
**Business Rule**: §9 — Length-limited fields are validated on save  
**Suggested Layer**: E2E

---

### TC-402: Number of Positions = 1 (Minimum Valid Value)
**Category**: Edge Case  
**Priority**: P0  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields; set **Number of Positions**: `1`
3. Click **Save**
**Expected Results**:
- Vacancy saved successfully
- Positions shown as `1` in the vacancy record
**Business Rule**: §Edge-Boundary — `numOfPositions`: 0 rejected, 1 minimum  
**Suggested Layer**: E2E, API

---

### TC-403: Large Number of Positions (e.g., 9999)
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields; set **Number of Positions**: `9999`
3. Click **Save**
**Expected Results**:
- Vacancy saved successfully (large values accepted per boundary table)
- Number of Positions displayed correctly as `9999`
**Business Rule**: §Edge-Boundary — large values accepted  
**Suggested Layer**: E2E, API

---

### TC-404: Vacancy Name with Special Characters
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter **Vacancy Name**: `Senior Developer (R&D) – 2025/Q1`
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Vacancy saved successfully
- Name displayed exactly as entered (special chars preserved, HTML-escaped in rendering)
**Business Rule**: Fields should accept standard punctuation; no inadvertent XSS or truncation  
**Suggested Layer**: E2E

---

### TC-405: Vacancy Name with Only Whitespace is Rejected
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter **Vacancy Name**: `   ` (spaces only)
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Treated as empty; inline error `"Required"` shown
- Vacancy not created
**Business Rule**: §9 — Required fields must not be blank/whitespace-only  
**Suggested Layer**: E2E

---

### TC-406: Hiring Manager Autocomplete with Partial Name (2 Characters)
**Category**: Edge Case  
**Priority**: P1  
**Preconditions**: Admin logged in; employees exist with names starting with `Pa` (e.g., `Paul Collings`)  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. In **Hiring Manager** autocomplete, type `Pa`
3. Observe the autocomplete dropdown
4. Select `Paul Collings`
**Expected Results**:
- Dropdown appears with matching employee suggestions after 2 characters typed
- Can successfully select and save with the chosen employee
**Business Rule**: OXD autocomplete requires at least 2 chars to trigger hints  
**Suggested Layer**: E2E

---

### TC-407: Description Field at Maximum Length
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin logged in; Job Title and Employee exist  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Fill all required fields
3. Enter a **Description** of exactly the maximum allowed characters (250 chars if textarea limit applies)
4. Click **Save**
**Expected Results**:
- Vacancy saved successfully
- Description stored and displayed correctly
**Business Rule**: §9 — Textarea fields have a max of 250 chars; `"Should be less than 250 characters"` at 251+  
**Suggested Layer**: E2E

---

### TC-408: Add Vacancy When No Job Titles Exist in the System
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin logged in; no Job Titles are configured in Admin → Job → Job Titles  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Click on the **Job Title** dropdown
**Expected Results**:
- Dropdown opens with empty list or placeholder message (e.g., `"No Results"`)
- Cannot save vacancy without a job title selection
**Business Rule**: §7 — Vacancy is tied to exactly one Job Title which must pre-exist  
**Suggested Layer**: E2E

---

### TC-409: Number of Positions as Decimal is Rejected
**Category**: Edge Case  
**Priority**: P2  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Enter **Number of Positions**: `2.5`
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Validation error shown (decimal not accepted for integer position count)
- Vacancy not created
**Business Rule**: §9 — Numeric integer fields reject non-integer values  
**Suggested Layer**: E2E, API

---

## UI State

### TC-500: Add Vacancy Form Renders All Expected Fields
**Category**: UI State  
**Priority**: P0  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Observe the form layout
**Expected Results**:
- Form contains: **Vacancy Name** (text input), **Job Title** (OXD dropdown), **Hiring Manager** (OXD autocomplete), **Number of Positions** (numeric input), **Description** (textarea), **Active** status toggle, **Published** toggle
- **Save** and **Cancel** buttons are visible
- No fields are pre-filled except potentially toggles at their defaults
**Business Rule**: Add form must expose all required and optional vacancy fields  
**Suggested Layer**: E2E

---

### TC-501: Required Field Inline Validation Appears on Blur
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; Add Vacancy form is open  
**Steps**:
1. Click into the **Vacancy Name** input
2. Leave it blank and click away (blur the field)
3. Repeat for **Job Title** dropdown
4. Repeat for **Hiring Manager** autocomplete
5. Repeat for **Number of Positions**
**Expected Results**:
- Each field shows `"Required"` error immediately below its input upon losing focus while empty
- Error disappears when a valid value is entered
**Business Rule**: §9 — Required text fields show `"Required"` immediately below the OXD input when blurred empty  
**Suggested Layer**: E2E

---

### TC-502: Job Title Dropdown Lists Only Existing Job Titles
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; known Job Titles exist (e.g., `QA Engineer`, `Software Engineer`)  
**Steps**:
1. Open Recruitment → Vacancies → Add
2. Click the **Job Title** dropdown
**Expected Results**:
- Dropdown options match exactly the Job Titles configured in Admin → Job → Job Titles
- No free-text entry is possible
- Dropdown closes after selection; selected value is displayed
**Business Rule**: OXD dropdowns are NOT native `<select>` — click the dropdown body first  
**Suggested Layer**: E2E

---

### TC-503: Hiring Manager Autocomplete Dropdown Behavior
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; multiple employees exist  
**Steps**:
1. Open Add Vacancy form
2. Type 2 characters in **Hiring Manager** autocomplete
3. Observe dropdown
4. Type more characters to narrow results
5. Click a result to select
**Expected Results**:
- Dropdown (`.oxd-autocomplete-dropdown`) appears after 2 characters
- Results narrow as more characters are typed
- Clicking a result fills the field and closes the dropdown
- Previously selected value can be cleared by deleting text
**Business Rule**: OXD autocomplete requires click-to-select pattern; `getByPlaceholder('Type for hints...')`  
**Suggested Layer**: E2E

---

### TC-504: Success Toast Appears After Saving Vacancy
**Category**: UI State  
**Priority**: P0  
**Preconditions**: Admin logged in; all required fields filled correctly  
**Steps**:
1. Complete the Add Vacancy form with valid data
2. Click **Save**
3. Observe the bottom-right corner of the screen
**Expected Results**:
- Green success toast `"Successfully Saved"` appears in `.oxd-toast-container .oxd-toast`
- Toast auto-dismisses after a few seconds
**Business Rule**: §10 — Every state-changing UI action triggers a green/red toast in the bottom-right  
**Suggested Layer**: E2E

---

### TC-505: Page Redirects to Vacancy List After Successful Save
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; Add Vacancy form filled correctly  
**Steps**:
1. Complete the Add Vacancy form and click **Save**
2. Observe the URL and page after the success toast
**Expected Results**:
- User is redirected to the Vacancies list page
- The newly added vacancy appears in the list
- Vacancy table loads (`.oxd-loading-spinner` disappears before asserting row)
**Business Rule**: §10 — Wait on toast (not URL change) to assert success; then table re-loads asynchronously  
**Suggested Layer**: E2E

---

### TC-506: Cancel Redirects Back to Vacancies List Without Changes
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; Add Vacancy form open with data entered  
**Steps**:
1. Fill in the Add Vacancy form
2. Click **Cancel**
3. Observe resulting page and record count
**Expected Results**:
- User returns to the Vacancies list page
- No new row appears
- Record count is unchanged
**Business Rule**: Cancel discards unsaved form state  
**Suggested Layer**: E2E

---

### TC-507: Vacancy Table Loading Spinner Disappears Before Asserting Rows
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in  
**Steps**:
1. Navigate to Recruitment → Vacancies
2. Observe the table load sequence
**Expected Results**:
- A loading spinner (`.oxd-loading-spinner`) or shimmer appears during data fetch (~200–800ms)
- Spinner disappears before table rows render
- Row count shown in `Records Found` span
**Business Rule**: §10 — Tables load asynchronously; tests must wait for `.oxd-loading-spinner` to disappear  
**Suggested Layer**: E2E

---

### TC-508: Empty State — Vacancies List with No Records
**Category**: UI State  
**Priority**: P2  
**Preconditions**: Admin logged in; no vacancies exist (fresh install or all deleted)  
**Steps**:
1. Navigate to Recruitment → Vacancies
2. Observe the list state
**Expected Results**:
- Table shows `"No Records Found"` message (or equivalent empty state)
- Record count shows `0 Record(s) Found`
- **Add** button is still visible and clickable
**Business Rule**: Empty state should communicate clearly with no data  
**Suggested Layer**: E2E

---

### TC-509: Active and Published Toggles Default State
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; Add Vacancy form is open  
**Steps**:
1. Navigate to Recruitment → Vacancies → Add
2. Observe the initial state of the **Active** (Status) and **Published** toggles without clicking them
**Expected Results**:
- Document which toggle state is default (Active = ON by default; Published = OFF by default is the expected behaviour)
- Toggles render as OXD switch components, not native checkboxes
**Business Rule**: Default state should reflect most common use: Active=ON, Published=OFF  
**Suggested Layer**: E2E

---

### TC-510: Vacancies List Filter by Status (Active / Closed)
**Category**: UI State  
**Priority**: P1  
**Preconditions**: Admin logged in; vacancies with both Active and Closed statuses exist  
**Steps**:
1. Navigate to Recruitment → Vacancies list
2. Apply filter **Status = Active**; click **Search**
3. Note results
4. Apply filter **Status = Closed**; click **Search**
5. Click **Reset**
**Expected Results**:
- Active filter returns only Active vacancies
- Closed filter returns only Closed vacancies
- Reset clears filter and returns all vacancies
- Wait for `.oxd-loading-spinner` between each filter action before asserting
**Business Rule**: List filter by status must respect the `status` field value  
**Suggested Layer**: E2E

---

### TC-511: Vacancies List Pagination at 50 Rows per Page
**Category**: UI State  
**Priority**: P2  
**Preconditions**: Admin logged in; more than 50 vacancies exist  
**Steps**:
1. Navigate to Recruitment → Vacancies
2. Observe pagination controls at `.oxd-pagination`
3. Navigate to page 2
**Expected Results**:
- Default page size is 50 rows
- Page 2 contains the next set of vacancies
- Page-size selector offers 10/20/50
**Business Rule**: §10 — Pagination defaults to 50 rows per page; page-size selector offers 10/20/50  
**Suggested Layer**: E2E
