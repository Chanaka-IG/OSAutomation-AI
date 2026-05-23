# Test Scenarios: Add Vacancies — OrangeHRM Open Source

> **Feature**: Recruitment → Vacancies → Add Vacancy
> **API endpoint**: `POST /web/index.php/api/v2/recruitment/vacancies`
> **UI path**: `/recruitment/viewVacancies` → Add button → `/recruitment/addVacancy`
> **Generated**: 2026-05-23

---

## Happy Path — TC-001 to TC-099

### TC-001: Add a vacancy with all required fields only
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one Job Title exists (e.g. "Software Engineer"); at least one active Employee exists to act as Hiring Manager
**Steps**:
1. Navigate to `Recruitment → Vacancies`
2. Click **Add**
3. Enter **Vacancy Name**: `QA Engineer - 2026`
4. Select **Job Title**: `Software Engineer` from the OXD dropdown
5. In **Hiring Manager** autocomplete, type at least 2 characters of an employee's name and click the first suggestion
6. Enter **Number of Positions**: `1`
7. Leave Description, Published, and Status fields at defaults
8. Click **Save**
**Expected Results**:
- Green toast appears: `"Successfully Saved"`
- Page redirects back to the Vacancies list (or stays on the form with fields cleared)
- The new vacancy `"QA Engineer - 2026"` appears in the list with status **Active**
**Business Rule**: Vacancy requires Name, Job Title, Hiring Manager, and numOfPositions ≥ 1 (business-rules.md §7; user-flows.md Flow 6)
**Suggested Layer**: E2E

---

### TC-002: Add a vacancy with all fields populated (including optional)
**Category**: Happy Path
**Preconditions**: Admin logged in; Job Title and an Employee for Hiring Manager exist
**Steps**:
1. Navigate to `Recruitment → Vacancies` → click **Add**
2. Enter **Vacancy Name**: `Senior Backend Developer`
3. Select **Job Title** from dropdown
4. Select **Hiring Manager** via autocomplete
5. Enter **Number of Positions**: `3`
6. Enter **Description**: `We are looking for a senior backend developer with 5+ years of experience.`
7. Toggle **Active** status to **Active**
8. Toggle **Publish in Job Site** to **ON** (isPublished = true)
9. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`
- Vacancy appears in the list with status Active and publish flag visible
- API `GET /recruitment/vacancies` returns the new record with `isPublished: true`
**Business Rule**: `isPublished` controls visibility on the public job board (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-003: Add vacancy with status set to Active
**Category**: Happy Path
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields (Name, Job Title, Hiring Manager, Number of Positions)
3. Set **Status** to **Active**
4. Click **Save**
**Expected Results**:
- Vacancy saved with `status: true` (Active)
- Vacancy appears in the default list view (which filters for active vacancies)
**Business Rule**: `status: Boolean` — Active/Closed (domain model)
**Suggested Layer**: E2E

---

### TC-004: Add vacancy with status set to Closed
**Category**: Happy Path
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields
3. Set **Status** to **Closed**
4. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`
- Vacancy is saved with `status: false` (Closed)
- Vacancy may not appear in the default Active-filtered list; confirm by changing filter or via API
**Business Rule**: Closed vacancies cannot accept new applications (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-005: Add vacancy with a large number of positions
**Category**: Happy Path
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields
3. Enter **Number of Positions**: `50`
4. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`
- Vacancy record shows `numOfPositions: 50`
**Business Rule**: numOfPositions must be ≥ 1 (no documented upper limit; test-data.md boundary values)
**Suggested Layer**: E2E

---

### TC-006: Add a vacancy via API (POST /recruitment/vacancies)
**Category**: Happy Path
**Preconditions**: Valid Bearer token (or session + CSRF); valid `jobTitleId` and `hiringManagerId` (empNumber)
**Steps**:
1. Authenticate and obtain Bearer token
2. Retrieve a valid `jobTitleId` from `GET /api/v2/admin/job-titles`
3. Retrieve a valid employee `empNumber` from `GET /api/v2/pim/employees`
4. Send `POST /api/v2/recruitment/vacancies` with body:
   ```json
   {
     "name": "API Created Vacancy",
     "jobTitleId": <id>,
     "hiringManagerId": <empNumber>,
     "numOfPositions": 2,
     "isPublished": false,
     "status": true
   }
   ```
**Expected Results**:
- HTTP 200/201
- Response body contains `{ "data": { "id": <new_id>, "name": "API Created Vacancy", ... } }`
- `GET /api/v2/recruitment/vacancies` lists the new record
**Business Rule**: API endpoint documented in api-reference.md §Recruitment
**Suggested Layer**: API

---

### TC-007: Add vacancy and verify it appears in Candidates filter
**Category**: Happy Path
**Preconditions**: Vacancy created successfully (TC-001)
**Steps**:
1. Navigate to `Recruitment → Candidates` → click **Add**
2. On the Add Candidate form, open the **Vacancy** dropdown
**Expected Results**:
- The newly created vacancy name appears as an option in the Vacancy dropdown
**Business Rule**: Candidates are applied against a specific Vacancy (business-rules.md §7; user-flows.md Flow 6)
**Suggested Layer**: E2E

---

## Business Rules — TC-100 to TC-199

### TC-100: Job Title must pre-exist before it can be selected
**Category**: Business Rule
**Preconditions**: Admin logged in; NO custom job titles have been added beyond the system defaults
**Steps**:
1. Note the current list of available Job Titles via `Admin → Job → Job Titles`
2. Navigate to `Recruitment → Vacancies` → **Add**
3. Open the **Job Title** dropdown
**Expected Results**:
- Only job titles that exist in the system appear in the dropdown
- A non-existent title cannot be typed in and saved (the field is a constrained dropdown, not a free-text input)
**Business Rule**: "A Vacancy is tied to exactly one Job Title which must already exist in Admin → Job → Job Titles" (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-101: Hiring Manager must be an existing active Employee
**Category**: Business Rule
**Preconditions**: Admin logged in; at least one active employee exists
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. In the **Hiring Manager** autocomplete field, type a partial name of an active employee
3. Verify the autocomplete dropdown shows the employee
4. Select the employee
**Expected Results**:
- Only existing employees appear in the autocomplete suggestions
- A free-text non-employee string cannot be submitted as the Hiring Manager
**Business Rule**: "Hiring Manager must be an existing Employee" (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-102: Terminated employee cannot be set as Hiring Manager
**Category**: Business Rule
**Preconditions**: Admin logged in; at least one **terminated** employee exists; their name is known
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. In **Hiring Manager** autocomplete, type the terminated employee's name
**Expected Results**:
- Terminated employee does NOT appear in autocomplete suggestions (or is excluded by filter)
- If somehow submitted via API with a terminated employee's empNumber, the API should reject with a validation error
**Business Rule**: Terminated employees are logically removed from active records (business-rules.md §3)
**Suggested Layer**: E2E + API

---

### TC-103: Vacancy name must be unique
**Category**: Business Rule
**Preconditions**: A vacancy named `"Unique Test Vacancy"` already exists in the system
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name**: `Unique Test Vacancy` (exact duplicate)
3. Fill remaining required fields with valid data
4. Click **Save**
**Expected Results**:
- Error toast or inline field error: `"Already exists"` (or similar unique constraint message)
- No new vacancy record is created
**Business Rule**: Vacancy name uniqueness (domain model — name field in vacancy table)
**Suggested Layer**: E2E + API

---

### TC-104: Number of Positions minimum value is 1
**Category**: Business Rule
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields; set **Number of Positions** to `0`
3. Click **Save**
**Expected Results**:
- Inline validation error: `"Should be greater than 0"` or similar
- Form does not submit
**Business Rule**: "numOfPositions >= 1" (user-flows.md test-data boundary values, api-reference.md)
**Suggested Layer**: E2E + API

---

### TC-105: Published vacancy is visible on public job site
**Category**: Business Rule
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Create a vacancy with **Publish in Job Site** toggled ON
2. Navigate to the public job application URL (if configured)
**Expected Results**:
- The vacancy appears on the public-facing job listing
- An unpublished (isPublished=false) vacancy does NOT appear on the public job listing
**Business Rule**: "`isPublished` controls visibility on public job board" (domain model; user-flows.md Flow 6)
**Suggested Layer**: E2E

---

### TC-106: Active vacancy accepts candidate applications; Closed vacancy does not
**Category**: Business Rule
**Preconditions**: One Active vacancy and one Closed vacancy exist
**Steps**:
1. Navigate to `Recruitment → Candidates` → **Add**
2. Open the **Vacancy** dropdown
**Expected Results**:
- Active vacancies appear as selectable options
- Closed vacancies do not appear (or are visually disabled) in the Vacancy dropdown for new candidate applications
**Business Rule**: Closed vacancies halt the recruitment pipeline (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-107: Deleting a Job Title that is referenced by a Vacancy is blocked
**Category**: Business Rule
**Preconditions**: A vacancy exists that references Job Title "Test Title"
**Steps**:
1. Navigate to `Admin → Job → Job Titles`
2. Attempt to delete `"Test Title"`
**Expected Results**:
- Error: `"This record is in use and cannot be deleted"`
- The Job Title remains in the system
**Business Rule**: "Job Titles: hard-deleted, but deletion is BLOCKED if any Vacancy still references them" (business-rules.md §11)
**Suggested Layer**: E2E + API

---

## Security — TC-200 to TC-299

### TC-200: ESS user cannot access the Vacancies page via UI navigation
**Category**: Security
**Preconditions**: Logged in as an ESS user (non-Admin)
**Steps**:
1. Log in as an ESS user
2. Inspect the left-side navigation menu
**Expected Results**:
- `Recruitment` menu item is NOT visible in the side panel
- ESS user has no path to reach Vacancies through UI navigation
**Business Rule**: "ESS sees only My Info, Leave, Time, Performance, Directory, Dashboard, Buzz" (business-rules.md §2)
**Suggested Layer**: E2E

---

### TC-201: ESS user cannot access Vacancies list via direct URL
**Category**: Security
**Preconditions**: Logged in as an ESS user
**Steps**:
1. Log in as ESS user
2. Directly navigate to `/web/index.php/recruitment/viewVacancies` in the browser address bar
**Expected Results**:
- Page renders an error, empty state, or redirects — no vacancy data is shown
- No "Add" button is accessible
**Business Rule**: Role-based menu access (business-rules.md §2; user-flows.md Flow 9)
**Suggested Layer**: E2E

---

### TC-202: ESS user cannot create a vacancy via direct API call
**Category**: Security
**Preconditions**: Valid ESS session cookie and CSRF token obtained
**Steps**:
1. Log in as ESS user (obtain `orangehrm` session cookie and `_token`)
2. Send `POST /api/v2/recruitment/vacancies` with valid vacancy payload and the ESS session credentials
**Expected Results**:
- HTTP 403 Forbidden
- Response body: `{ "error": { "status": "403", "text": "Unauthorized" } }`
- No vacancy record is created
**Business Rule**: Cross-role API protection (business-rules.md §2; api-reference.md Error Scenarios)
**Suggested Layer**: API

---

### TC-203: Unauthenticated request to create vacancy is rejected
**Category**: Security
**Preconditions**: No active session (logged out or fresh incognito window)
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with no session cookie and no Bearer token
**Expected Results**:
- HTTP 401 Unauthorized
- Response: `{ "error": { "status": "401", "text": "Unauthorized" } }`
**Business Rule**: Session-based auth; unauthenticated calls rejected (business-rules.md §1; api-reference.md)
**Suggested Layer**: API

---

### TC-204: CSRF token is required for UI-driven vacancy creation
**Category**: Security
**Preconditions**: Admin session active; CSRF token known
**Steps**:
1. Obtain a valid Admin session cookie
2. Send `POST /api/v2/recruitment/vacancies` with the session cookie but WITHOUT the `X-CSRF-Token` header
**Expected Results**:
- HTTP 401
- Response: `{ "error": { "status": "401", "text": "Invalid CSRF token" } }`
**Business Rule**: "Every state-changing UI action requires CSRF token" (business-rules.md §10; api-reference.md Error Scenarios)
**Suggested Layer**: API

---

### TC-205: Admin cannot inject malicious script into Vacancy Name (XSS)
**Category**: Security
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name**: `<script>alert('xss')</script>`
3. Fill remaining required fields with valid data
4. Click **Save**
**Expected Results**:
- Either the input is rejected with a validation error, OR
- The value is saved but rendered as escaped HTML (the script tag is not executed when the vacancy name is displayed in the list or form)
- No alert dialog appears; no script executes
**Business Rule**: OXD input sanitization; standard OWASP XSS prevention
**Suggested Layer**: E2E

---

### TC-206: SQL injection attempt in Vacancy Name field
**Category**: Security
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name**: `'; DROP TABLE ohrm_job_vacancy; --`
3. Fill remaining required fields with valid data
4. Click **Save**
**Expected Results**:
- Input is treated as a literal string (parameterized queries used by Doctrine ORM)
- System remains stable; no database error; no table dropped
- The value is either saved as a literal string or rejected by validation
**Business Rule**: ORM-level SQL injection protection (Doctrine ORM used; business-rules.md §1)
**Suggested Layer**: API

---

### TC-207: Admin user session cannot be hijacked to create vacancy on behalf of another admin
**Category**: Security
**Preconditions**: Two admin sessions; valid CSRF token from session A
**Steps**:
1. Log in as Admin A and capture session cookie + CSRF token
2. Log in as Admin B in a separate session
3. Use Admin A's CSRF token with Admin B's session cookie on a vacancy POST
**Expected Results**:
- Request is rejected (CSRF token is bound to session)
- HTTP 401 Invalid CSRF token
**Business Rule**: CSRF tokens are session-scoped (business-rules.md §10)
**Suggested Layer**: API

---

## Negative — TC-300 to TC-399

### TC-300: Submit the Add Vacancy form with all required fields empty
**Category**: Negative
**Preconditions**: Admin logged in; on the Add Vacancy form
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Click **Save** without filling any field
**Expected Results**:
- Form does not submit
- Inline validation messages appear below each required field: `"Required"` for Vacancy Name, Job Title, Hiring Manager, and Number of Positions
- No toast for success; no record created
**Business Rule**: Required field validation (business-rules.md §9)
**Suggested Layer**: E2E

---

### TC-301: Submit without Vacancy Name
**Category**: Negative
**Preconditions**: Admin logged in; Job Title and Employee available
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Leave **Vacancy Name** blank
3. Fill all other required fields with valid data
4. Click **Save**
**Expected Results**:
- Inline error under Vacancy Name: `"Required"`
- Form does not submit
**Business Rule**: Name is mandatory (api-reference.md POST `/recruitment/vacancies` body)
**Suggested Layer**: E2E

---

### TC-302: Submit without selecting a Job Title
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill Vacancy Name, Hiring Manager, Number of Positions
3. Leave **Job Title** unselected (default/empty state)
4. Click **Save**
**Expected Results**:
- Inline error: `"Required"` under Job Title
- Form does not submit
**Business Rule**: `jobTitleId` is required (api-reference.md §Recruitment)
**Suggested Layer**: E2E

---

### TC-303: Submit without selecting a Hiring Manager
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill Vacancy Name, Job Title, Number of Positions
3. Leave **Hiring Manager** autocomplete empty
4. Click **Save**
**Expected Results**:
- Inline error: `"Required"` under Hiring Manager
- Form does not submit
**Business Rule**: `hiringManagerId` is required (api-reference.md §Recruitment)
**Suggested Layer**: E2E

---

### TC-304: Submit with Number of Positions = 0
**Category**: Negative
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill all required fields; enter **Number of Positions**: `0`
3. Click **Save**
**Expected Results**:
- Inline error: `"Should be greater than 0"` (or similar numeric constraint message)
- Form does not submit
**Business Rule**: numOfPositions ≥ 1 (user-flows.md test-data boundary values)
**Suggested Layer**: E2E + API

---

### TC-305: Submit with negative Number of Positions via API
**Category**: Negative
**Preconditions**: Valid Admin session + CSRF token
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"numOfPositions": -1`
**Expected Results**:
- HTTP 422 Unprocessable Entity
- Response: `{ "error": { "status": "422", "text": "Invalid Parameter" }, "data": { "numOfPositions": "..." } }`
**Business Rule**: Validation rule — positions must be positive (api-reference.md Error Scenarios)
**Suggested Layer**: API

---

### TC-306: Submit with duplicate Vacancy Name via API
**Category**: Negative
**Preconditions**: Vacancy named `"Duplicate Test"` already exists; valid Admin session
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"name": "Duplicate Test"` and all other valid fields
**Expected Results**:
- HTTP 422
- Response data contains `"name": "Already exists"` (or similar unique constraint error)
**Business Rule**: Vacancy name uniqueness (business-rules.md §9)
**Suggested Layer**: API

---

### TC-307: Submit with non-existent jobTitleId via API
**Category**: Negative
**Preconditions**: Valid Admin session; knowing an `id` value that does not correspond to any Job Title
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"jobTitleId": 999999` (a non-existent ID)
**Expected Results**:
- HTTP 422 or 404
- Error message indicating the referenced job title does not exist
**Business Rule**: FK integrity on `jobTitleId` (Doctrine ORM enforces FK constraints)
**Suggested Layer**: API

---

### TC-308: Submit with non-existent hiringManagerId via API
**Category**: Negative
**Preconditions**: Valid Admin session
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"hiringManagerId": 999999` (non-existent employee)
**Expected Results**:
- HTTP 422 or 404
- Error response indicating the employee does not exist
**Business Rule**: FK integrity on `hiringManagerId` (empNumber FK; business-rules.md §7)
**Suggested Layer**: API

---

### TC-309: Submit with non-numeric Number of Positions (string value) via API
**Category**: Negative
**Preconditions**: Valid Admin session
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"numOfPositions": "abc"`
**Expected Results**:
- HTTP 422
- `"data": { "numOfPositions": "Should be a number" }` or similar validation message
**Business Rule**: Numeric field validation (business-rules.md §9)
**Suggested Layer**: API

---

### TC-310: Cancel Add Vacancy form — no record created
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill in **Vacancy Name**: `Cancel Test Vacancy`
3. Fill in other required fields
4. Click **Cancel** button
**Expected Results**:
- User is returned to the Vacancies list
- No new vacancy `"Cancel Test Vacancy"` appears in the list
- Record count remains unchanged
**Business Rule**: Cancel action discards unsaved data (standard UI pattern)
**Suggested Layer**: E2E

---

### TC-311: Typing a partial name in Hiring Manager autocomplete that matches nothing
**Category**: Negative
**Preconditions**: Admin logged in; on Add Vacancy form
**Steps**:
1. In the **Hiring Manager** autocomplete, type `"zzzznonexistentemployee"`
2. Wait for autocomplete suggestions to load
**Expected Results**:
- Autocomplete dropdown shows `"No Records Found"` (or is empty)
- No suggestion is accidentally auto-selected
**Business Rule**: Autocomplete behavior for no-match (OXD autocomplete component behavior)
**Suggested Layer**: E2E

---

## Edge Cases — TC-400 to TC-499

### TC-400: Vacancy Name at maximum allowed length
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied; maximum length for the name field known (assumed ~100 chars based on typical OrangeHRM string fields)
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter a **Vacancy Name** of exactly the maximum character length (test with 100 chars, e.g. `"A" × 100`)
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- If ≤ max: Toast `"Successfully Saved"`; vacancy created
- If > max: Inline error `"Should be less than N characters"`
**Business Rule**: String field length limits (business-rules.md §9)
**Suggested Layer**: E2E + API

---

### TC-401: Vacancy Name exceeds maximum allowed length
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter a **Vacancy Name** of 300 characters (well beyond any reasonable maximum)
3. Click **Save**
**Expected Results**:
- Inline error: `"Should be less than N characters"` where N is the configured max
- Form does not submit
**Business Rule**: String length validation (business-rules.md §9)
**Suggested Layer**: E2E + API

---

### TC-402: Number of Positions = 1 (minimum valid boundary)
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields; set **Number of Positions** to `1`
3. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`
- Vacancy saved with `numOfPositions: 1`
**Business Rule**: numOfPositions ≥ 1 (user-flows.md boundary values)
**Suggested Layer**: E2E

---

### TC-403: Number of Positions = very large number (boundary high)
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields; set **Number of Positions** to `9999`
3. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"` (no documented upper cap — large values should be accepted)
- If there is a max, the system shows a validation error
**Business Rule**: No explicit upper bound documented; verify system behavior
**Suggested Layer**: E2E + API

---

### TC-404: Vacancy Name with only whitespace
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name** as `"   "` (spaces only)
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Validation error: `"Required"` (whitespace-only treated as empty) OR
- Error: name cannot consist solely of whitespace
- No record created
**Business Rule**: Required field validation; whitespace-only strings should be rejected (business-rules.md §9)
**Suggested Layer**: E2E

---

### TC-405: Vacancy Name with special characters
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name**: `C++ Developer & Architect (2026) — Full-Time`
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`
- Vacancy name renders correctly in the list with special characters intact (no HTML entity mangling)
**Business Rule**: String storage and rendering with special characters
**Suggested Layer**: E2E

---

### TC-406: Vacancy Name with leading and trailing whitespace
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter **Vacancy Name**: `"  DevOps Engineer  "` (leading and trailing spaces)
3. Fill remaining required fields
4. Click **Save**
**Expected Results**:
- Vacancy is saved with the name trimmed (e.g. `"DevOps Engineer"`) OR saved with whitespace intact
- Uniqueness check should treat `"DevOps Engineer"` and `"  DevOps Engineer  "` as the same (or different — verify actual behavior)
**Business Rule**: Input trimming behavior (OXD component behavior)
**Suggested Layer**: E2E

---

### TC-407: Number of Positions as a decimal value
**Category**: Edge Case
**Preconditions**: Valid Admin session + CSRF token
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with `"numOfPositions": 1.5`
2. Also test UI: attempt to enter `"1.5"` in the Number of Positions field
**Expected Results**:
- API: HTTP 422 with validation error (integer expected)
- UI: field may only accept integer input; decimal rejected or rounded
**Business Rule**: numOfPositions is an integer field (domain model)
**Suggested Layer**: E2E + API

---

### TC-408: Creating a vacancy when no Job Titles exist in the system
**Category**: Edge Case
**Preconditions**: Admin logged in; ALL job titles have been deleted (clean/empty system)
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Open the **Job Title** dropdown
**Expected Results**:
- Dropdown is empty (no options shown, or shows "No Options" / "No Records Found")
- Form cannot be submitted without a Job Title
- The UI communicates the empty state gracefully (no crash or unhandled error)
**Business Rule**: Job Title is mandatory FK; graceful empty-state handling
**Suggested Layer**: E2E

---

### TC-409: Creating a vacancy when no Employees exist
**Category**: Edge Case
**Preconditions**: Admin logged in; all employees have been terminated or purged (or not yet created)
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. In the **Hiring Manager** autocomplete, type any string
**Expected Results**:
- Autocomplete shows `"No Records Found"` (or empty dropdown)
- Form cannot be submitted without a Hiring Manager
**Business Rule**: Hiring Manager must be an existing employee (business-rules.md §7)
**Suggested Layer**: E2E

---

### TC-410: Description field at maximum length
**Category**: Edge Case
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Fill required fields; enter a **Description** of the maximum character count (250 chars if following OrangeHRM textarea convention)
3. Click **Save**
**Expected Results**:
- Toast: `"Successfully Saved"`; description stored correctly
- If over max: error `"Should be less than N characters"`
**Business Rule**: Length-limited textarea (business-rules.md §9 — textareas ≤ 250 chars typical)
**Suggested Layer**: E2E

---

### TC-411: POST API request with missing optional fields (only required fields)
**Category**: Edge Case
**Preconditions**: Valid Admin session + CSRF token; valid `jobTitleId` and `hiringManagerId`
**Steps**:
1. Send `POST /api/v2/recruitment/vacancies` with only the required fields:
   ```json
   {
     "name": "Minimal Vacancy",
     "jobTitleId": <id>,
     "hiringManagerId": <empNumber>,
     "numOfPositions": 1,
     "isPublished": false,
     "status": true
   }
   ```
   (no `description`)
**Expected Results**:
- HTTP 200/201; vacancy created with `description: null`
**Business Rule**: Optional fields can be omitted (api-reference.md §Recruitment)
**Suggested Layer**: API

---

## UI State — TC-500 to TC-599

### TC-500: Vacancies list shows empty state when no vacancies exist
**Category**: UI State
**Preconditions**: Admin logged in; no vacancies currently in the system (or all are deleted)
**Steps**:
1. Navigate to `Recruitment → Vacancies`
**Expected Results**:
- Table shows `"No Records Found"` (or appropriate empty-state message)
- The record count shows `"(0) Records Found"`
- **Add** button is still visible and clickable
**Business Rule**: Empty state rendering (standard OXD table behavior; business-rules.md §10)
**Suggested Layer**: E2E

---

### TC-501: Success toast appears immediately after saving a vacancy
**Category**: UI State
**Preconditions**: Admin logged in; prerequisites satisfied
**Steps**:
1. Complete the Add Vacancy form with valid data
2. Click **Save**
3. Observe the bottom-right corner of the screen
**Expected Results**:
- Green toast notification appears: `"Successfully Saved"`
- Toast is visible for a few seconds then auto-dismisses
- Test waits on `.oxd-toast .oxd-text--toast-message` before asserting success
**Business Rule**: "Every state-changing UI action triggers a green/red toast" (business-rules.md §10)
**Suggested Layer**: E2E

---

### TC-502: Required field inline validation triggers on blur (not just on submit)
**Category**: UI State
**Preconditions**: Admin logged in; on Add Vacancy form
**Steps**:
1. Click on the **Vacancy Name** input
2. Leave it empty and click elsewhere (blur the field)
**Expected Results**:
- Inline validation message `"Required"` appears below the Vacancy Name field immediately on blur
- User does not need to click Save to see the error
**Business Rule**: OXD real-time inline validation on blur (business-rules.md §9)
**Suggested Layer**: E2E

---

### TC-503: Job Title dropdown renders all available job titles
**Category**: UI State
**Preconditions**: Admin logged in; 3 Job Titles exist: "HR Manager", "QA Engineer", "DevOps Lead"
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Click on the **Job Title** OXD dropdown
**Expected Results**:
- Dropdown opens (`.oxd-select-dropdown` appears)
- All 3 Job Titles are listed as selectable options
- Selecting one closes the dropdown and populates the field
**Business Rule**: OXD dropdown interaction pattern (ui-selectors.md §Conventions; OXD dropdowns require click to open)
**Suggested Layer**: E2E

---

### TC-504: Hiring Manager autocomplete shows filtered suggestions as user types
**Category**: UI State
**Preconditions**: Admin logged in; employees "John Smith" and "Jane Smith" exist
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Click the **Hiring Manager** input
3. Type `"Smi"` (at least 2 characters to trigger autocomplete)
4. Wait for `.oxd-autocomplete-dropdown` to appear
**Expected Results**:
- Dropdown appears with matching results: "John Smith" and "Jane Smith"
- Typing more characters (e.g. `"John Smi"`) narrows the results to only "John Smith"
- Clicking a suggestion populates the field
**Business Rule**: OXD autocomplete behavior (ui-selectors.md §Reusable OXD-Aware Helpers)
**Suggested Layer**: E2E

---

### TC-505: Vacancies list shows loading spinner while fetching data
**Category**: UI State
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Recruitment → Vacancies`
2. Observe the table area immediately after navigation
**Expected Results**:
- A loading spinner (`.oxd-loading-spinner`) briefly appears while data is fetched (200–800ms)
- Spinner disappears and rows are rendered
- Tests must wait for spinner to disappear before asserting row count
**Business Rule**: "Tables are loaded asynchronously and show a shimmer/skeleton loader" (business-rules.md §10)
**Suggested Layer**: E2E

---

### TC-506: Vacancy list pagination defaults to 50 rows per page
**Category**: UI State
**Preconditions**: Admin logged in; more than 50 vacancies exist
**Steps**:
1. Navigate to `Recruitment → Vacancies`
2. Check the rows displayed per page
**Expected Results**:
- Default page size is 50
- Pagination controls appear (`.oxd-pagination`) when total records exceed 50
- Page-size selector offers options: 10, 20, 50
**Business Rule**: "Pagination defaults to 50 rows per page" (business-rules.md §10)
**Suggested Layer**: E2E

---

### TC-507: Cancel button on Add Vacancy form navigates back to Vacancies list
**Category**: UI State
**Preconditions**: Admin logged in; on the Add Vacancy form with partially filled data
**Steps**:
1. Navigate to `Recruitment → Vacancies` → **Add**
2. Enter `"To Be Discarded"` in Vacancy Name
3. Click **Cancel**
**Expected Results**:
- User is redirected back to the Vacancies list (`.oxd-topbar-header-breadcrumb-module` shows "Vacancies" or "Recruitment")
- No record `"To Be Discarded"` appears in the list
**Business Rule**: Cancel discards form state without saving
**Suggested Layer**: E2E

---

### TC-508: Add Vacancy form field states after a failed save attempt
**Category**: UI State
**Preconditions**: Admin logged in; Add Vacancy form open
**Steps**:
1. Click **Save** with all fields empty (to trigger validation)
2. Observe the form state
3. Fill in the **Vacancy Name** field with valid data
**Expected Results**:
- After filling in Vacancy Name, its `"Required"` error clears immediately (real-time re-validation)
- Other empty required fields still show their errors
**Business Rule**: OXD inline validation clears on valid input (OXD component behavior)
**Suggested Layer**: E2E

---

### TC-509: Vacancy record count increments after successful creation
**Category**: UI State
**Preconditions**: Admin logged in; note the current `(N) Records Found` count on the Vacancies list
**Steps**:
1. Note current record count on Vacancies list page
2. Add a new vacancy with valid data → Save
3. Navigate back to the Vacancies list
**Expected Results**:
- Record count shows `(N+1) Records Found`
- New vacancy row appears in the table
**Business Rule**: Record count reflects actual data (business-rules.md §10)
**Suggested Layer**: E2E

---

### TC-510: Add Vacancy form is accessible from the Recruitment menu without extra navigation
**Category**: UI State
**Preconditions**: Admin logged in; currently on Dashboard
**Steps**:
1. Click `Recruitment` in the left side menu
2. Click `Vacancies` in the submenu
3. Click **Add** button
**Expected Results**:
- Each navigation step works without errors
- The Add Vacancy form loads with all fields blank and ready for input
- URL changes to the add vacancy path
**Business Rule**: Menu visibility for Admin role (business-rules.md §2; ui-selectors.md §Recruitment Module)
**Suggested Layer**: E2E
