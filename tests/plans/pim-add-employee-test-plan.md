# Test plan — PIM · Add Employee

**Application:** [OrangeHRM OS](https://automationtest-os-kord.orangehrm.com/) (instance used for automation)

**Navigation path:** Home → log in as admin → left sidebar **PIM** → top nav **Add Employee** (`/web/index.php/pim/addEmployee`)

**Execution note (frontend):** run Playwright in headed mode when validating UI behaviour:

```bash
BASE_URL=https://automationtest-os-kord.orangehrm.com \
npx playwright test tests/pim/add-employee.spec.ts --config automation.config.ts --headed --project=chromium
```

---

## Legend — test layers

| Layer | Scope (this project) |
|--------|----------------------|
| **Unit** | Pure helpers (e.g. name-field validators, Employee ID format rules, DTO ↔ UI mapping) where implemented; otherwise **N/A**. |
| **API** | OrangeHRM REST v2 under `/web/index.php/api/v2/pim/employees` — POST employee creation, GET verification, error payloads (400/409), and auth handling (401). |
| **Frontend** | Playwright E2E: navigation, form field interactions, toggle behaviour, inline validation messages, photo upload, and post-save redirect/state. |

---

## Screen inventory (observed 2026-05-14)

| Section | Fields | Notes |
|---------|--------|-------|
| **Profile Photo** | Choose File button; remove (✕) button | Accepts `.jpg`, `.png`, `.gif` ≤ 1 MB; recommended 200×200 px |
| **Employee Full Name** | First Name\*, Middle Name, Last Name\* | Three separate text inputs grouped under one label |
| **Employee ID** | Single text input | Auto-populated with next sequential ID (e.g. `0008`); editable |
| **Create Login Details** | Toggle (off by default) | Reveals Username\*, Status radio (Enabled/Disabled), Password\*, Confirm Password\* |
| **Actions** | Save, Cancel | `* Required` note in footer |

---

## 1. Positive test cases

### TC-PIM-AE-001 — Navigate to Add Employee via PIM top menu

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Logged in as admin; on any page. |
| **Test case description** | Click **PIM** in the sidebar → click **Add Employee** in the top navigation. Verify URL matches `/pim/addEmployee`, the page heading reads "Add Employee", and all expected form sections are rendered. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert URL pattern, heading text, presence of First Name / Last Name / Employee ID inputs and Create Login Details toggle. |

---

### TC-PIM-AE-002 — Default page state on load

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Logged in as admin; Add Employee page freshly loaded. |
| **Test case description** | Without any interaction, observe: profile photo placeholder visible, Middle Name present but not required, Employee ID pre-populated, Create Login Details toggle is OFF, login-detail fields (Username, Status, Password, Confirm Password) not visible, Save and Cancel buttons present. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert toggle state, hidden login fields, pre-filled Employee ID, Save/Cancel presence. |

---

### TC-PIM-AE-003 — Save with required name fields only (no login details)

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Enter a unique First Name and Last Name; leave all other fields at their defaults (Middle Name empty, login toggle OFF). Click **Save**. Employee record is created and the user is redirected to the new employee's Personal Details tab. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees` with firstName + lastName; assert 200 and returned `empNumber`. **Frontend:** Fill name fields, click Save, assert redirect URL contains new employee ID and personal-details route. |

---

### TC-PIM-AE-004 — Save with all basic fields including Middle Name

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Enter First Name, Middle Name, and Last Name. Edit Employee ID to a unique value. Click **Save**. Verify the employee's profile displays all three name parts and the custom ID. |
| **Test layers** | **Unit:** N/A. **API:** GET `/api/v2/pim/employees/{empNumber}` after creation; assert `middleName` and `employeeId` match inputs. **Frontend:** Fill all fields, assert employee profile reflects them post-redirect. |

---

### TC-PIM-AE-005 — Employee ID is auto-generated on page load

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded; previous employees exist. |
| **Test case description** | Observe the Employee ID field on load; it must be non-empty and follow the sequential format (e.g. `0008`). No user action required. |
| **Test layers** | **Unit:** Auto-ID generation logic (if extracted to a helper). **API:** GET `/api/v2/pim/employees?limit=1&sortField=e.empNumber&sortOrder=DESC` to derive expected next ID. **Frontend:** Assert Employee ID input is pre-filled and non-empty on page load. |

---

### TC-PIM-AE-006 — Employee ID can be manually overridden

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded; a unique ID is available. |
| **Test case description** | Clear the pre-populated Employee ID, type a known-unique custom ID, fill required name fields, click **Save**. Verify the employee record is created with the custom ID. |
| **Test layers** | **Unit:** N/A. **API:** GET employee by `empNumber`; assert `employeeId` equals custom value. **Frontend:** Clear and retype ID field; confirm value persists on save. |

---

### TC-PIM-AE-007 — Create Login Details toggle ON reveals all fields; Status defaults to Enabled

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Click the Create Login Details toggle. Assert that Username, Status radio (Enabled/Disabled), Password, and Confirm Password fields become visible. Assert "Enabled" radio is pre-selected. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Toggle click; assert field visibility, label text, Enabled radio checked state. |

---

### TC-PIM-AE-008 — Save with login details enabled (Status = Enabled)

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded; a unique username and valid password string available. |
| **Test case description** | Fill First Name + Last Name, toggle ON login details, enter a unique Username, leave Status as Enabled, enter matching Password and Confirm Password, click **Save**. Verify employee record is created and the new user can log in. |
| **Test layers** | **Unit:** N/A. **API:** POST employee with `login` payload; assert `userName` and `status: Enabled` in response. **Frontend:** Full form fill + toggle; assert redirect; optional login smoke with new credentials. |

---

### TC-PIM-AE-009 — Save with login details enabled (Status = Disabled)

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Same as TC-PIM-AE-008. |
| **Test case description** | Fill required fields, toggle ON login details, select **Disabled** status, enter valid matching passwords, click **Save**. Verify record created. Attempt login with the new credentials and confirm the attempt is rejected with an appropriate error. |
| **Test layers** | **Unit:** N/A. **API:** Assert `status: Disabled` in the created user record. **Frontend:** Select Disabled radio; post-save login attempt returns an error. |

---

### TC-PIM-AE-010 — Profile photo: Upload valid JPG

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded; a `.jpg` test file ≤ 1 MB available. |
| **Test case description** | Click **Choose File**, select a valid `.jpg` image. Preview updates to the uploaded image. Save the employee; photo persists on the employee's profile. |
| **Test layers** | **Unit:** N/A. **API:** N/A (photo stored separately; verify via profile page). **Frontend:** File upload interaction; assert preview src changes; assert photo on profile post-save. |

---

### TC-PIM-AE-011 — Profile photo: Upload valid PNG

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | A `.png` test file ≤ 1 MB available. |
| **Test case description** | Same flow as TC-PIM-AE-010 using a `.png` file. Preview and persisted photo must reflect the uploaded image. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** File upload; assert preview and post-save profile photo. |

---

### TC-PIM-AE-012 — Post-save: redirected to new employee's Personal Details tab

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Required name fields filled; Save clicked. |
| **Test case description** | After a successful save the URL must contain the new employee's ID (e.g. `/pim/viewPersonalDetails/empNumber/{id}`) and the name entered must be visible on the profile page. |
| **Test layers** | **Unit:** N/A. **API:** Response body `empNumber` matches redirected URL segment. **Frontend:** Assert URL pattern and displayed employee name post-redirect. |

---

### TC-PIM-AE-013 — Post-save: new employee appears in Employee List

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | A new employee has just been saved. |
| **Test case description** | Navigate to **PIM → Employee List**, search by the newly created employee's name. The record appears in results with the correct name and Employee ID. |
| **Test layers** | **Unit:** N/A. **API:** GET `/api/v2/pim/employees?nameOrId={name}` returns the new employee. **Frontend:** Search filter; assert matching row. |

---

### TC-PIM-AE-014 — Cancel navigates away without creating a record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page; First Name partially typed. |
| **Test case description** | Enter a First Name value then click **Cancel**. User is redirected to Employee List and no new employee record exists for the typed name. |
| **Test layers** | **Unit:** N/A. **API:** GET employees after cancel; assert no new record for typed name. **Frontend:** Click Cancel; assert Employee List URL; assert typed name absent from list. |

---

## 2. Negative test cases

### TC-PIM-AE-N01 — Unauthenticated access redirects to login

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Clean browser context (no session cookies). |
| **Test case description** | Navigate directly to `/web/index.php/pim/addEmployee`. Application must redirect to the login page and not expose any form data. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees` without session cookie returns 401. **Frontend:** Direct URL access → login redirect; no form elements visible. |

---

### TC-PIM-AE-N02 — Save with empty First Name

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Leave First Name blank, enter a Last Name, click **Save**. An inline validation error must appear on the First Name field; no record is created. |
| **Test layers** | **Unit:** Required-field validator for firstName. **API:** POST with missing `firstName` returns 400 with field-level error. **Frontend:** Assert error message adjacent to First Name; assert no redirect. |

---

### TC-PIM-AE-N03 — Save with empty Last Name

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Enter a First Name, leave Last Name blank, click **Save**. Inline validation error on Last Name; no record created. |
| **Test layers** | **Unit:** Required-field validator for lastName. **API:** POST with missing `lastName` returns 400. **Frontend:** Assert error message on Last Name field. |

---

### TC-PIM-AE-N04 — Save with both First Name and Last Name empty

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded; all fields at defaults. |
| **Test case description** | Click **Save** immediately. Validation errors appear on both First Name and Last Name simultaneously; no record created. |
| **Test layers** | **Unit:** N/A. **API:** N/A (guard at frontend before API call). **Frontend:** Assert two distinct error messages; assert no navigation away from form. |

---

### TC-PIM-AE-N05 — Duplicate Employee ID

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | A known existing Employee ID available (e.g. `0001`). |
| **Test case description** | Clear the auto-populated Employee ID, enter the existing ID, fill required name fields, click **Save**. Expect a validation error stating the ID is already in use; no duplicate record created. |
| **Test layers** | **Unit:** ID uniqueness rule if modelled locally. **API:** POST with duplicate `employeeId` returns 400/409 with error payload. **Frontend:** Inline or toast error message; form remains on page. |

---

### TC-PIM-AE-N06 — Login details: Save with empty Username

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Login Details toggle ON; required name fields filled. |
| **Test case description** | Leave Username blank, enter valid matching passwords, click **Save**. Inline validation error on Username; no record created. |
| **Test layers** | **Unit:** Required-field validator for username. **API:** POST with `login.username` absent returns 400. **Frontend:** Assert error on Username field; no redirect. |

---

### TC-PIM-AE-N07 — Login details: Save with empty Password

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Login Details toggle ON; Username filled. |
| **Test case description** | Leave Password blank, fill Confirm Password, click **Save**. Inline validation error on Password. |
| **Test layers** | **Unit:** Required-field validator for password. **API:** POST with `login.password` absent returns 400. **Frontend:** Assert error on Password field. |

---

### TC-PIM-AE-N08 — Login details: Save with empty Confirm Password

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Login Details toggle ON; Username and Password filled. |
| **Test case description** | Leave Confirm Password blank, click **Save**. Inline validation error on Confirm Password field. |
| **Test layers** | **Unit:** N/A (client-side match check). **API:** N/A (confirmPassword is UI-only). **Frontend:** Assert error on Confirm Password; assert no API call fired. |

---

### TC-PIM-AE-N09 — Login details: Password and Confirm Password mismatch

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Login Details toggle ON; Username filled. |
| **Test case description** | Enter `Admin@123` in Password and `Admin@456` in Confirm Password, click **Save**. A mismatch validation error appears; no record created. |
| **Test layers** | **Unit:** Password-equality validator if extracted. **API:** N/A (match enforced before API call). **Frontend:** Assert mismatch error message; assert form does not navigate away. |

---

### TC-PIM-AE-N10 — Login details: Duplicate Username

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Login Details toggle ON; an existing system username known (e.g. `admin`). |
| **Test case description** | Enter the existing username, fill matching valid passwords, fill required name fields, click **Save**. Validation error indicating the username is already in use; no record created. |
| **Test layers** | **Unit:** N/A. **API:** POST returns 400/409 with username-taken error. **Frontend:** Assert error message (inline or toast); form stays on page. |

---

### TC-PIM-AE-N11 — Profile photo: File exceeding 1 MB rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | An image file > 1 MB available. |
| **Test case description** | Click **Choose File**, select the oversized image. An error message is shown; the profile preview does not change from the default avatar. |
| **Test layers** | **Unit:** File-size guard if extracted to a validator. **API:** N/A (blocked before upload). **Frontend:** Assert error message; assert photo preview unchanged. |

---

### TC-PIM-AE-N12 — Profile photo: Unsupported file type rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | A `.pdf` or `.docx` test file available. |
| **Test case description** | Attempt to upload a non-image file. Error is displayed; preview remains default. |
| **Test layers** | **Unit:** MIME-type / extension validator if extracted. **API:** N/A. **Frontend:** Assert file-type error; assert preview unchanged. |

---

## 3. Edge test cases

### TC-PIM-AE-E01 — First / Last Name at maximum character length

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded; max character limit known from API contract or observed truncation. |
| **Test case description** | Enter a string exactly at the field's maximum allowed length in both First Name and Last Name. Click **Save**. Record saves successfully; the full value is persisted without truncation. |
| **Test layers** | **Unit:** Length-limit validator (boundary-exact). **API:** POST with max-length values returns 200. **Frontend:** Fill max-length string; assert no inline error; assert persisted value on profile page. |

---

### TC-PIM-AE-E02 — First / Last Name exceeding maximum character length

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Paste a string longer than the allowed maximum into First Name. The input must truncate at the limit or show a validation error; no server error (500) occurs. |
| **Test layers** | **Unit:** Length-limit validator (boundary+1). **API:** POST with oversized value returns 400 (not 500). **Frontend:** Input capped at max length or inline error visible. |

---

### TC-PIM-AE-E03 — Empty Employee ID on save

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Clear the pre-populated Employee ID, fill required name fields, click **Save**. Verify whether the system auto-assigns an ID or shows a validation error; the outcome must be deterministic (no silent blank ID stored). |
| **Test layers** | **Unit:** Employee ID required/optional rule if modelled. **API:** POST with `employeeId: ""` — assert response is either 200 (with auto-assigned ID) or 400 (required field). **Frontend:** Assert clear behaviour and resulting state. |

---

### TC-PIM-AE-E04 — Name fields with international / special characters

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Enter names containing unicode (e.g. `Müller`, `García`, `李明`) and punctuation (hyphen, apostrophe) in First and Last Name. Click **Save**. Characters are preserved exactly; no encoding corruption on the profile page. |
| **Test layers** | **Unit:** Character-set validator if exists. **API:** GET employee after creation; assert `firstName`/`lastName` round-trip without corruption. **Frontend:** Assert displayed name on profile matches input exactly. |

---

### TC-PIM-AE-E05 — XSS probe in name fields (smoke)

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Enter a benign script probe (e.g. `<script>alert(1)</script>`) in First Name. The value must not execute as a script anywhere — in the form, post-save redirect, or Employee List. Content must be escaped and displayed as plain text. |
| **Test layers** | **Unit:** Sanitisation helper tests if introduced. **API:** POST with script string; assert value is stored escaped or rejected (400). **Frontend:** No alert fires; DOM shows text-only content. |

---

### TC-PIM-AE-E06 — Login Details toggle: toggling OFF clears previously entered values

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | Add Employee page loaded. |
| **Test case description** | Toggle ON login details, fill Username / Password / Confirm Password. Toggle OFF, then toggle ON again. The previously entered values must be cleared (not re-populated) to prevent accidental submission of stale credentials. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert field values are empty after toggle OFF → ON cycle. |

---

### TC-PIM-AE-E07 — Profile photo: Upload valid GIF

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | A `.gif` test file ≤ 1 MB available. |
| **Test case description** | Upload a `.gif` image. Preview updates. After save, the photo persists on the employee profile (static frame acceptable). |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** File upload; assert preview change; assert profile photo post-save. |

---

### TC-PIM-AE-E08 — Profile photo: Remove uploaded photo resets to default avatar

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | A photo has been selected (preview showing uploaded image). |
| **Test case description** | Click the remove (✕) button next to the photo preview. Preview reverts to the default placeholder avatar without a page reload. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert preview src returns to default avatar after remove click. |

---

### TC-PIM-AE-E09 — Password strength hint visible when login toggle is ON

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | Login Details toggle ON. |
| **Test case description** | Observe the text below the Password field; it must read: *"For a strong password, please use a hard to guess combination of text with upper and lower case characters, symbols and numbers."* |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert paragraph text exact match or contains expected substring. |

---

## Coverage summary

| Category | Count |
|----------|-------|
| Positive | 14 |
| Negative | 12 |
| Edge | 9 |
| **Total** | **35** |

| Priority | Count | Test cases |
|----------|-------|------------|
| **High** | **15** | TC-PIM-AE-001, 003, 008, 012, N01–N10, E05 |
| **Medium** | **16** | TC-PIM-AE-002, 004–007, 009–011, 013–014, N11–N12, E01–E04 |
| **Low** | **4** | TC-PIM-AE-E06–E09 |

**Recommended automation priority:**
1. **Frontend P1 (auth + smoke):** TC-PIM-AE-N01, TC-PIM-AE-001, TC-PIM-AE-003
2. **Frontend P1 (core saves):** TC-PIM-AE-003, TC-PIM-AE-008 (with login)
3. **API parity:** TC-PIM-AE-003, TC-PIM-AE-N05, TC-PIM-AE-N10 (duplicate ID / username)
4. **Frontend P1 (validation):** TC-PIM-AE-N02 through TC-PIM-AE-N09
5. **Edge / boundary:** TC-PIM-AE-E01 through TC-PIM-AE-E05

---

## References

- Target environment: [automationtest-os-kord.orangehrm.com](https://automationtest-os-kord.orangehrm.com/)
- Related plan: [pim-employee-list-test-plan.md](./pim-employee-list-test-plan.md)
- OrangeHRM API documentation: [OrangeHRM API docs](https://help.orangehrm.com/hc/en-us/articles/900001765703-OrangeHRM-API-Documentation)
