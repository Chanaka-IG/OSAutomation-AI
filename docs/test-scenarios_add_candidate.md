# Test Scenarios: Add Candidates

> Feature: `Recruitment → Candidates → Add Candidate`
> URL: `/web/index.php/recruitment/addCandidate`
> Domain Rules: Business Rules §7, UI Selectors §Recruitment, API Reference §Recruitment
> Generated: 2026-05-24

---

## Happy Path Scenarios (TC-001 – TC-099)

### TC-001: Add Candidate with Required Fields Only
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one active vacancy exists
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Fill **First Name** = "Priya"
3. Fill **Last Name** = "Sharma"
4. Fill **Email** = "priya.sharma.test@example.com"
5. Select **Vacancy** from OXD dropdown (pick an active vacancy)
6. Fill **Date of Application** = today's date in `YYYY-MM-DD` format
7. Tick **Consent to keep data** checkbox
8. Click **Save**
**Expected Results**:
- Page navigates to candidate profile URL
- Candidate listed with status `APPLICATION_INITIATED`
**Business Rule**: §7 — candidate must have consent; vacancy must be active; status starts at APPLICATION_INITIATED
**Suggested Layer**: E2E

---

### TC-002: Add Candidate with All Optional Fields Populated
**Category**: Happy Path
**Preconditions**: Admin logged in; active vacancy exists
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Fill **First Name** = "Oliver", **Last Name** = "Bennett"
3. Fill **Email** = "oliver.bennett.test@example.com"
4. Fill **Contact Number** = "+94771234567"
5. Select **Vacancy** from dropdown
6. Upload a **Resume** (PDF ≤ 1 MB)
7. Fill **Keywords** = "automation, qa, typescript"
8. Fill **Date of Application** = "2026-05-24"
9. Fill **Notes** = "Referred by internal team"
10. Tick **Consent to keep data**
11. Click **Save**
**Expected Results**:
- Candidate saved with all fields persisted
- Profile page shows First Name, Last Name, Email correctly
**Business Rule**: §7 — all optional fields are accepted; resume file stored
**Suggested Layer**: E2E

---

### TC-003: Candidate Profile Shows APPLICATION_INITIATED Status After Save
**Category**: Happy Path
**Preconditions**: Admin logged in; candidate exists from TC-001
**Steps**:
1. Navigate to Recruitment → Candidates list
2. Locate the newly created candidate
3. Click the candidate row to open profile
**Expected Results**:
- Status reads "Application Initiated"
- Action button label is "Shortlist"
**Business Rule**: §7 — pipeline starts at APPLICATION_INITIATED
**Suggested Layer**: E2E

---

### TC-004: Candidate Visible in Candidates List After Creation
**Category**: Happy Path
**Preconditions**: Admin logged in; candidate just created
**Steps**:
1. After saving a candidate, navigate to `/recruitment/viewCandidates`
2. Observe the candidates table
**Expected Results**:
- New candidate row is present
- Row shows candidate name and vacancy name
**Business Rule**: §7 — created candidate listed immediately
**Suggested Layer**: E2E

---

### TC-005: Only Active Vacancies Appear in Vacancy Dropdown
**Category**: Happy Path
**Preconditions**: Admin logged in; one active vacancy and one closed vacancy exist
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Click the **Vacancy** OXD dropdown
3. Observe available options
**Expected Results**:
- Active vacancy name is present
- Closed vacancy name is NOT present
**Business Rule**: §7 — only status=true vacancies show in candidate form
**Suggested Layer**: E2E

---

## Business Rule Scenarios (TC-100 – TC-199)

### TC-100: Consent to Keep Data Checkbox Is Mandatory (GDPR)
**Category**: Business Rule
**Preconditions**: Admin logged in; active vacancy exists
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Fill all required fields (First Name, Last Name, Email, Vacancy, Date of Application)
3. Leave **Consent to keep data** UN-ticked
4. Click **Save**
**Expected Results**:
- Form does not submit
- Validation message appears near consent checkbox
- URL remains on add candidate page
**Business Rule**: §7 — `consentToKeepData` is mandatory GDPR field
**Suggested Layer**: E2E

---

### TC-101: Email Must Be in Valid Format
**Category**: Business Rule
**Preconditions**: Admin logged in; active vacancy exists
**Steps**:
1. Fill Email = "valid+tag@sub.domain.com"
2. Fill all other required fields, tick consent
3. Click **Save**
**Expected Results**:
- Candidate saved successfully
**Business Rule**: §9 — email format validated; RFC-compliant addresses accepted
**Suggested Layer**: E2E

---

### TC-102: Date of Application Defaults to Today
**Category**: Business Rule
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Observe the **Date of Application** field before any interaction
**Expected Results**:
- Date field pre-populated with today's date (2026-05-24)
**Business Rule**: §7 — application date defaults to today
**Suggested Layer**: E2E

---

### TC-103: Vacancy Field Is Required
**Category**: Business Rule
**Preconditions**: Admin logged in
**Steps**:
1. Fill First Name, Last Name, Email, Date of Application; tick consent
2. Leave **Vacancy** field empty
3. Click **Save**
**Expected Results**:
- Form stays on add page
- Required error visible near Vacancy field
**Business Rule**: §7 — candidate must be tied to a vacancy
**Suggested Layer**: E2E

---

### TC-104: Keywords Field Accepts Comma-Separated Values
**Category**: Business Rule
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill Keywords = "java, spring, microservices, 5yrs"
2. Fill all required fields; tick consent; Save
**Expected Results**:
- Candidate saved; keywords persisted
- Candidate findable via keyword search filter on list page
**Business Rule**: §7 / API — keywords stored for search filtering
**Suggested Layer**: E2E

---

### TC-105: Resume Upload — PDF File Accepted
**Category**: Business Rule
**Preconditions**: Admin logged in; test PDF ≤ 1 MB available
**Steps**:
1. Upload a PDF via resume file input
2. Fill all required fields; tick consent; Save
**Expected Results**:
- Candidate saved successfully
- Profile shows resume download link
**Business Rule**: §7 — resume is an optional attachment (PDF/DOC/DOCX accepted)
**Suggested Layer**: E2E

---

### TC-106: Multiple Candidates Can Be Added to the Same Vacancy
**Category**: Business Rule
**Preconditions**: Admin logged in; one active vacancy exists
**Steps**:
1. Add candidate A to Vacancy X → Save
2. Add candidate B to same Vacancy X → Save
**Expected Results**:
- Both candidates created with APPLICATION_INITIATED status
- Both listed when filtering by Vacancy X
**Business Rule**: §7 — vacancies support multiple candidates (up to numOfPositions)
**Suggested Layer**: E2E

---

## Security Scenarios (TC-200 – TC-299)

### TC-200: ESS User Cannot See Recruitment in Side Navigation
**Category**: Security
**Preconditions**: ESS user (marcus.chen / admin@OHRM123) logged in
**Steps**:
1. Login as ESS user
2. Observe side navigation menu
**Expected Results**:
- "Recruitment" menu item is absent
**Business Rule**: §2 — ESS users do not have Recruitment module access
**Suggested Layer**: E2E

---

### TC-201: ESS User: Direct URL to Add Candidate Shows No Functional Form
**Category**: Security
**Preconditions**: ESS user logged in
**Steps**:
1. Login as ESS user
2. Navigate directly to `/web/index.php/recruitment/addCandidate`
**Expected Results**:
- Page renders without a functional Save button OR shows forbidden state
- ESS cannot create candidates
**Business Rule**: §2 — ESS cannot bypass Recruitment via direct URL
**Suggested Layer**: E2E

---

### TC-202: XSS Probe in First Name Does Not Execute
**Category**: Security
**Preconditions**: Admin logged in; active vacancy exists
**Steps**:
1. Fill **First Name** = `<script>alert('xss')</script>`
2. Fill all other required fields; tick consent; Save
**Expected Results**:
- No browser alert fires during or after save
- Profile and list render name as plain escaped text
**Business Rule**: §9 / OWASP XSS — all text inputs must be HTML-escaped on render
**Suggested Layer**: E2E

---

### TC-203: XSS Probe in Keywords and Notes Does Not Execute
**Category**: Security
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill Keywords = `<img src=x onerror=alert(1)>`
2. Fill Notes = `"><script>alert('stored-xss')</script>`
3. Fill valid required fields; tick consent; Save
**Expected Results**:
- No alert/dialog fires
- List and profile pages render fields as escaped text
**Business Rule**: §9 / OWASP — stored XSS prevention on all free-text fields
**Suggested Layer**: E2E

---

### TC-204: Unauthenticated API POST to Candidates Returns 401
**Category**: Security
**Preconditions**: No session or token
**Steps**:
1. POST `/web/index.php/api/v2/recruitment/candidates` without auth
**Expected Results**:
- HTTP 401 Unauthorized
- No record created
**Business Rule**: API §Authentication — all write endpoints require valid session or Bearer token
**Suggested Layer**: API

---

## Negative / Error Scenarios (TC-300 – TC-399)

### TC-300: Empty Form — All Required Fields Show "Required" Errors
**Category**: Negative
**Preconditions**: Admin logged in; on add candidate form
**Steps**:
1. Navigate to `/web/index.php/recruitment/addCandidate`
2. Click **Save** without filling anything
**Expected Results**:
- URL unchanged (stays on add page)
- Multiple "Required" messages appear below mandatory fields (First Name, Last Name, Email, Vacancy minimum)
**Business Rule**: §9 — required fields show inline validation on submit
**Suggested Layer**: E2E

---

### TC-301: Missing First Name Shows Required Error
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Fill Last Name, Email, Vacancy, Date, Consent; leave First Name empty
2. Click **Save**
**Expected Results**:
- "Required" error below First Name field
- Form not submitted
**Business Rule**: §9 — firstName required
**Suggested Layer**: E2E

---

### TC-302: Missing Last Name Shows Required Error
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Fill First Name, Email, Vacancy, Date, Consent; leave Last Name empty
2. Click **Save**
**Expected Results**:
- "Required" error below Last Name field
**Business Rule**: §9
**Suggested Layer**: E2E

---

### TC-303: Missing Email Shows Required Error
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Fill First Name, Last Name, Vacancy, Date, Consent; leave Email empty
2. Click **Save**
**Expected Results**:
- "Required" error below Email field
**Business Rule**: §9
**Suggested Layer**: E2E

---

### TC-304: Invalid Email Format Shows Validation Error
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Fill Email = "not-an-email"
2. Fill all other required fields; tick consent; Save
**Expected Results**:
- Inline format validation error below Email field
- Form not submitted
**Business Rule**: §9 — email format validated client or server side (422)
**Suggested Layer**: E2E

---

### TC-305: Cancel Returns to Candidates List Without Creating Record
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to add candidate form
2. Fill First Name = "DoNotSave", Last Name = "Candidate"
3. Click **Cancel**
**Expected Results**:
- Navigated to `/recruitment/viewCandidates`
- "DoNotSave Candidate" does NOT appear in the list
**Business Rule**: §7 — Cancel discards form without creating a record
**Suggested Layer**: E2E

---

### TC-306: API Missing Required Field Returns 422
**Category**: Negative
**Preconditions**: Admin session active
**Steps**:
1. POST `/web/index.php/api/v2/recruitment/candidates` with body missing `firstName`
**Expected Results**:
- HTTP 422 Invalid Parameter
- Response body: `{ "firstName": "Required" }` or similar
**Business Rule**: API §Error Scenarios — 422 with field-level details on missing required param
**Suggested Layer**: API

---

### TC-307: First Name Exceeding 30 Characters Shows Length Error
**Category**: Negative
**Preconditions**: Admin logged in
**Steps**:
1. Fill First Name = 31 characters
2. Fill all required fields; tick consent; Save
**Expected Results**:
- Validation error: "Should be less than 30 characters" or similar
- Form not submitted
**Business Rule**: §9 — name fields max 30 chars
**Suggested Layer**: E2E

---

## Edge Case Scenarios (TC-400 – TC-499)

### TC-400: First Name at Maximum Length (30 chars)
**Category**: Edge Case
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill First Name = exactly 30 characters
2. Fill all required fields; tick consent; Save
**Expected Results**:
- Candidate saved successfully at boundary
**Business Rule**: §9 — max 30 chars accepted
**Suggested Layer**: E2E

---

### TC-401: Contact Number with International Format
**Category**: Edge Case
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill Contact Number = "+1 (555) 867-5309"
2. Fill required fields; tick consent; Save
**Expected Results**:
- Candidate saved; contact number persisted as entered
**Business Rule**: §7 — contact number is optional free-text; international formats accepted
**Suggested Layer**: E2E

---

### TC-402: Keywords with Special Characters (C++, .NET)
**Category**: Edge Case
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill Keywords = "C++, .NET, ASP.NET Core, Node.js"
2. Fill required fields; tick consent; Save
**Expected Results**:
- Candidate saved; keywords with special chars persisted correctly
**Business Rule**: §7 — keywords are free-text, no encoding restrictions
**Suggested Layer**: E2E

---

### TC-403: Adding Candidate When No Active Vacancies Exist
**Category**: Edge Case
**Preconditions**: Admin logged in; all vacancies are closed
**Steps**:
1. Navigate to add candidate form
2. Click Vacancy dropdown
**Expected Results**:
- Vacancy dropdown shows no options or "No Options" placeholder
**Business Rule**: §7 — no active vacancies → dropdown empty → form cannot be submitted
**Suggested Layer**: E2E

---

### TC-404: Notes Field at Boundary Length (250 chars)
**Category**: Edge Case
**Preconditions**: Admin logged in; active vacancy
**Steps**:
1. Fill Notes = exactly 250 characters
2. Fill required fields; tick consent; Save
**Expected Results**:
- Candidate saved; notes persisted at boundary length
**Business Rule**: §9 — textareas max 250 chars
**Suggested Layer**: E2E

---

## UI State Scenarios (TC-500 – TC-599)

### TC-500: Validation Errors Clear When Fields Are Corrected
**Category**: UI State
**Preconditions**: Admin logged in
**Steps**:
1. Click Save on empty form to trigger all validation errors
2. Fill in First Name field
3. Observe validation state of First Name
**Expected Results**:
- First Name "Required" error disappears once field is filled
- Other unfilled-field errors remain
**Business Rule**: §9 — inline validation is reactive (clears on valid input)
**Suggested Layer**: E2E

---

### TC-501: Consent Checkbox Toggles Correctly
**Category**: UI State
**Preconditions**: Admin logged in; on add candidate form
**Steps**:
1. Tick Consent checkbox → observe checked state
2. Untick Consent checkbox → observe unchecked state
**Expected Results**:
- Checkbox visual state toggles between checked and unchecked correctly
**Business Rule**: §7 — GDPR consent checkbox must be interactive
**Suggested Layer**: E2E

---

### TC-502: Add Button Visible on Candidates List for Admin
**Category**: UI State
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `/web/index.php/recruitment/viewCandidates`
2. Wait for page load
**Expected Results**:
- "Add" button is visible in the header area
**Business Rule**: §2 / §7 — Admin has Create access to candidates
**Suggested Layer**: E2E

---

### TC-503: Vacancy Dropdown Opens and Closes on Click
**Category**: UI State
**Preconditions**: Admin logged in; active vacancy exists
**Steps**:
1. Click the Vacancy OXD dropdown → observe it opens
2. Click elsewhere on the page → observe it closes
**Expected Results**:
- Dropdown opens showing vacancy options
- Clicking outside closes it without selecting anything
**Business Rule**: OXD design system — all custom dropdowns follow open/close on click behavior
**Suggested Layer**: E2E

---

### TC-504: Resume File Upload Shows File Name After Selection
**Category**: UI State
**Preconditions**: Admin logged in; test PDF available
**Steps**:
1. Click the resume file input and select a PDF file
**Expected Results**:
- File name displayed in UI after selection
**Business Rule**: §7 / OXD — file inputs show selected file name as confirmation
**Suggested Layer**: E2E

---

### TC-505: Save Button Is Enabled Before Form Fill (Submit-Time Validation)
**Category**: UI State
**Preconditions**: Admin logged in; on add candidate form with no fields filled
**Steps**:
1. Navigate to add candidate form without filling anything
2. Observe the Save button state
**Expected Results**:
- Save button is enabled (OrangeHRM validates on submit, not pre-emptively)
**Business Rule**: §10 — OrangeHRM uses submit-time validation pattern
**Suggested Layer**: E2E

---

### TC-506: Candidates List Loading Spinner Appears Then Disappears
**Category**: UI State
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `/web/index.php/recruitment/viewCandidates`
2. Observe the table area during load
**Expected Results**:
- `.oxd-loading-spinner` briefly visible while candidates load
- Table rows appear after spinner disappears
**Business Rule**: §10 — tables load asynchronously; tests must wait for spinner to disappear
**Suggested Layer**: E2E
