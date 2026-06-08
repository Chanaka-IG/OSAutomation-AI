# OrangeHRM Open Source UI Selectors Reference

> **OXD = `@orangehrm/oxd` design system.** OXD form fields wrap their `<input>` inside `<div class="oxd-input-group">` and apply `.oxd-input` to the actual input. **Dropdowns are NOT native `<select>` elements** — they are custom Vue components and must be opened with a click before typing/selecting.
> Selector strategy below uses **Playwright syntax** as primary (`getByRole`, `getByText`, `locator`). CSS equivalents are listed under each section for Selenium/Cypress.

## Conventions
- **Avoid** raw XPaths and brittle `:nth-child(n)` selectors — the OXD grid renumbers when filters change.
- **Prefer**, in order: text-anchored (`getByText`, `:has-text(...)`), then `oxd-input` near a known label, then CSS class.
- For OXD dropdowns: click the dropdown body → click the option text. Never try to `selectOption(...)` — it will fail silently.
- For date pickers: typing directly into the input is faster and more reliable than clicking through the calendar.
- Wait for `.oxd-loading-spinner` to disappear before asserting list contents.

---

## Login Page (`/auth/login`)
- Username input: `getByPlaceholder('Username')` or `getByName('username')`
- Password input: `getByPlaceholder('Password')` or `getByName('password')`
- Login button: `getByRole('button', { name: 'Login' })` or `button[type="submit"]`
- "Forgot your password?" link: `getByText('Forgot your password?')`
- Login error banner: `.oxd-alert-content-text` containing `"Invalid credentials"`
- Default-credentials hint (demo only): `.orangehrm-login-forgot-header` sibling text

---

## Top Bar & Side Panel (Global)
- Side menu toggle: `.oxd-main-menu-button`
- Side menu item (by name): `.oxd-main-menu-item:has-text("PIM")` (replace with module name)
- User dropdown (top-right): `.oxd-userdropdown-tab`
- Logout link (after opening user dropdown): `getByRole('menuitem', { name: 'Logout' })`
- Page title (top breadcrumb): `.oxd-topbar-header-breadcrumb-module` → text equals current module name
- Toast / Snackbar (success / error): `.oxd-toast-container .oxd-toast` (read inner `.oxd-text--toast-message`)
- Global loading spinner: `.oxd-loading-spinner`

---

## Dashboard (`/dashboard/index`)
- Quick Launch cards: `.orangehrm-quick-launch-card` (use `:has-text("Assign Leave")` etc.)
- "My Actions" widget: `.orangehrm-dashboard-widget:has-text("My Actions")`
- "Employees on Leave Today" widget: `.orangehrm-dashboard-widget:has-text("Employees on Leave Today")`
- "Employee Distribution by Sub Unit" chart: `.emp-distribution-chart`
- "Time at Work" widget: `.orangehrm-attendance-card`

---

## Admin Module

### User Management List (`/admin/viewSystemUsers`)
- Username search input: `.oxd-form-row input.oxd-input` (1st field) or `getByLabel('Username')`
- User Role dropdown: `.oxd-select-text:near(:text("User Role"))` then click option in `.oxd-select-dropdown`
- Employee Name autocomplete: `getByPlaceholder('Type for hints...')` (anchored under "Employee Name" label)
- Status dropdown: anchored under "Status" label (same pattern)
- Search button: `getByRole('button', { name: 'Search' })`
- Reset button: `getByRole('button', { name: 'Reset' })`
- Add button: `.orangehrm-header-container button:has-text("Add")`
- Records table: `.oxd-table`
- Table row: `.oxd-table-card`
- Row checkbox: row → `.oxd-table-card-cell:first-child .oxd-checkbox-input`
- Edit row icon: row → `.oxd-icon-button:has(.bi-pencil-fill)`
- Delete row icon: row → `.oxd-icon-button:has(.bi-trash)`
- Pagination: `.oxd-pagination`
- Result count: `.orangehrm-horizontal-padding span` containing "Records Found"

### Add / Edit User Form (verified live via Playwright MCP, 2026-06-07)
- Form heading: `getByRole('heading', { name: 'Add User' })` — **h6**, not h5 (list heading "System Users" is h5)
- User Role dropdown: anchored under "User Role" label — options: `Admin`, `ESS`
- Employee Name autocomplete: `getByPlaceholder('Type for hints...')` — hints render as `getByRole('option')` and show the FULL name incl. middle name (e.g. "Marcus James Chen"); no match → option `"No Records Found"`; free text left unbound → field error `"Invalid"` on blur
- Status dropdown: anchored under "Status" label — options: `Enabled`, `Disabled`
- Username: anchored under "Username" label (no placeholder/aria-label — use `.oxd-input-group` filtered by label text). Live validation: `"Should be at least 5 characters"`, `"Should not exceed 40 characters"`, `"Already exists"` (case-insensitive, fires while typing)
- Password / Confirm Password: `input[type="password"]` nth(0)/nth(1). Messages: `"Should have at least 8 characters"`, `"Your password must contain minimum 1 upper-case letter"`, `"Passwords do not match"`. NOTE: medium passwords show a non-blocking "could be guessable" warning in the same message slot, and a strength meter label (Very Weak…Strongest) renders above the field
- Empty save: 5× `"Required"` but Confirm Password shows `"Passwords do not match"` instead
- Disabled-account login attempt shows alert `"Account disabled"` in `.oxd-alert-content-text`
- Save button: `getByRole('button', { name: 'Save' })`
- Cancel button: `getByRole('button', { name: 'Cancel' })`
- Reusable framework assets: `src/pages/admin/SystemUsersPage.ts`, `test-data/admin/frontend/systemUsers.ts`

### Admin → Job → Job Titles (`/admin/viewJobTitleList`)
- Add button: `.orangehrm-header-container button:has-text("Add")`
- Job Title input on Add form: `getByLabel('Job Title')`
- Job Description: textarea immediately after "Job Description" label
- Save: `getByRole('button', { name: 'Save' })`

---

## PIM Module

### Employee List (`/pim/viewEmployeeList`)
- "Employee Name" autocomplete: `getByPlaceholder('Type for hints...')` (1st on page)
- "Employee Id" input: anchored under "Employee Id" label
- "Employment Status" dropdown: anchored under "Employment Status" label
- "Include" dropdown (Current / Past / Both): anchored under "Include" label
- "Supervisor Name" autocomplete: anchored under "Supervisor Name" label
- "Job Title" dropdown: anchored under "Job Title" label
- "Sub Unit" dropdown: anchored under "Sub Unit" label
- Search button: `getByRole('button', { name: 'Search' })`
- Reset button: `getByRole('button', { name: 'Reset' })`
- Add button: `.orangehrm-header-container button:has-text("Add")`
- Employee row link (opens profile): `.oxd-table-card a` (the first cell is a clickable link)

### Add Employee (`/pim/addEmployee`)
- First Name: `getByName('firstName')`
- Middle Name: `getByName('middleName')`
- Last Name: `getByName('lastName')`
- Employee ID: anchored under "Employee Id" label (pre-filled, can be overridden)
- Profile picture: `input[type="file"]`
- "Create Login Details" toggle: `.oxd-switch-input`
- Save: `getByRole('button', { name: 'Save' })`

### Personal Details (`/pim/viewPersonalDetails/empNumber/<n>`)
- Other Id: anchored under "Other Id" label
- Driver's License Number: anchored under "Driver's License Number" label
- License Expiry Date: anchored under "License Expiry Date" label (typeable, format `YYYY-DD-MM` per locale)
- Nationality dropdown: anchored under "Nationality" label
- Marital Status dropdown: anchored under "Marital Status" label
- Date of Birth: anchored under "Date of Birth" label
- Gender radio: `.oxd-radio-input` (Male / Female)
- Smoker checkbox: `.oxd-checkbox-input` near "Smoker"
- Save (Personal Details section): first `button:has-text("Save")` on the page

### PIM Side Menu (when inside an employee profile)
- Personal Details, Contact Details, Emergency Contacts, Dependents, Immigration, Job, Salary, Tax Exemptions, Report-to, Qualifications, Memberships:
  - `.orangehrm-edit-employee-navigation a:has-text("Job")` (replace text)

---

## Leave Module

### Apply Leave (ESS, `/leave/applyLeave`)
- Leave Type dropdown: anchored under "Leave Type" label
- From Date: anchored under "From Date" label (typeable)
- To Date: anchored under "To Date" label (typeable)
- Partial Days dropdown: anchored under "Partial Days" label (appears after dates entered)
- Comment textarea: `textarea.oxd-textarea` near "Comments"
- Apply button: `getByRole('button', { name: 'Apply' })`
- Balance display (live, after Leave Type selected): `.orangehrm-leave-balance` text

### Leave List (Admin/Supervisor, `/leave/viewLeaveList`)
- From Date: anchored under "From Date" label
- To Date: anchored under "To Date" label
- Show Leave with Status checkboxes: `.oxd-checkbox-wrapper` near "Show Leave with Status"
- Employee Name autocomplete: anchored under "Employee Name" label
- Leave Type dropdown: anchored under "Leave Type" label
- Search: `getByRole('button', { name: 'Search' })`
- Action dropdown per row: `.oxd-table-card-cell:has-text("Pending Approval") .oxd-select-text` (etc.)
- Action options inside dropdown: `"Approve"`, `"Reject"`, `"Cancel"` (click within `.oxd-select-dropdown`)

### Assign Leave (Admin/Supervisor, `/leave/assignLeave`)
- Employee Name autocomplete: anchored under "Employee Name" label (mandatory)
- Other fields same as Apply Leave

### Configure → Leave Types (`/leave/leaveTypeList`)
- Add: `.orangehrm-header-container button:has-text("Add")`
- Leave Type Name: `getByLabel('Name')`
- Entitlement Allocation: `getByLabel('Entitlement Allocation')`

---

## Time Module

### My Timesheets (ESS, `/time/viewMyTimesheet`)
- Edit button: `getByRole('button', { name: 'Edit' })`
- Project dropdown (row): `.oxd-select-text` inside the timesheet row being edited
- Activity dropdown (row): second `.oxd-select-text` in the row
- Day cell inputs: `.oxd-input[placeholder="HH:MM"]` (one per day Mon–Sun)
- "Add Row" button: `getByRole('button', { name: '+ Add' })`
- Save button: `getByRole('button', { name: 'Save' })`
- Submit button: `getByRole('button', { name: 'Submit' })`
- Timesheet period selector (`<`, `>`): `.orangehrm-attendance-card a` or `.bi-chevron-left` / `.bi-chevron-right`
- State badge (top of timesheet): `.orangehrm-card-container .oxd-text--span`

### Punch In / Punch Out (`/attendance/punchIn`)
- Date input: anchored under "Date" label
- Time input: anchored under "Time" label
- Note textarea: `textarea.oxd-textarea`
- "In" / "Out" button: `getByRole('button', { name: 'In' })` / `getByRole('button', { name: 'Out' })`

---

## Recruitment Module

### Candidates List (`/recruitment/viewCandidates`)
- Job Vacancy dropdown: anchored under "Job Vacancy" label
- Status dropdown: anchored under "Status" label
- Candidate Name autocomplete: anchored under "Candidate Name" label
- Keywords input: `getByLabel('Keywords')`
- From Date / To Date of Application: anchored under the matching labels
- Method of Application dropdown: anchored under that label
- Search / Reset / Add: same pattern as Admin

### Add Candidate (`/recruitment/addCandidate`)
- First Name: `getByName('firstName')`
- Last Name: `getByName('lastName')`
- Email: anchored under "Email" label
- Contact Number: anchored under "Contact Number" label
- Vacancy dropdown: anchored under "Vacancy" label
- Resume file input: `input[type="file"]`
- Keywords: anchored under "Keywords" label
- Date of Application: anchored under "Date of Application" label
- Notes textarea: `textarea.oxd-textarea`
- Consent checkbox: `.oxd-checkbox-input` near "Consent to keep data"
- Save: `getByRole('button', { name: 'Save' })`

### Candidate Profile / Actions
- Action button (top-right of profile, e.g. "Shortlist"): `.orangehrm-recruitment-actions button` (the label changes by current state: `"Shortlist"`, `"Reject"`, `"Schedule Interview"`, `"Mark Interview Passed"`, `"Mark Interview Failed"`, `"Offer Job"`, `"Decline Offer"`, `"Hire"`)
- Notes textarea on action modal: `textarea.oxd-textarea`
- Confirm button on action modal: `getByRole('button', { name: 'Save' })` or `getByRole('button', { name: 'Hire' })`

---

## Performance Module

### Manage Reviews (`/performance/searchEvaluatePerformanceReview`)
- Employee Name autocomplete: anchored under "Employee Name" label
- Job Title dropdown: anchored under "Job Title" label
- Sub Unit dropdown: anchored under "Sub Unit" label
- Reviewer Name autocomplete: anchored under "Reviewer Name" label
- Include checkbox set: `.oxd-checkbox-wrapper` near "Include" — `"Activated Reviews"`, `"In Progress Reviews"`, `"Completed Reviews"`
- Add: `.orangehrm-header-container button:has-text("Add")`

### Configure KPIs (`/performance/searchKpi`)
- Job Title dropdown: anchored under "Job Title" label
- KPI title input on Add form: `getByLabel('Key Performance Indicator')`
- Min Rating / Max Rating: anchored under matching labels
- "Make this KPI default for the Job Title" checkbox: `.oxd-checkbox-input`

---

## My Info Module (ESS view of own PIM)
- Same selectors as PIM Personal Details / Contact / etc. — but the URL is `/pim/viewPersonalDetails/empNumber/<own>` resolved automatically.

---

## Reusable OXD-Aware Helpers (Playwright pseudocode)

```ts
// Select an option from an OXD custom dropdown
async function oxdSelect(page, labelText, optionText) {
  const dropdown = page.locator('.oxd-input-group', { hasText: labelText })
                       .locator('.oxd-select-text');
  await dropdown.click();
  await page.locator('.oxd-select-dropdown .oxd-select-option', { hasText: optionText }).click();
}

// Pick from an OXD autocomplete (Employee Name, Supervisor, etc.)
async function oxdAutocomplete(page, labelText, query, expectedHint) {
  const input = page.locator('.oxd-input-group', { hasText: labelText })
                    .locator('input.oxd-input');
  await input.fill(query);
  await page.locator('.oxd-autocomplete-dropdown')
            .locator('div', { hasText: expectedHint }).first().click();
}

// Wait for any toast and return its text
async function waitForToast(page) {
  const toast = page.locator('.oxd-toast .oxd-text--toast-message');
  await toast.waitFor({ state: 'visible' });
  return toast.textContent();
}

// Wait for table to finish loading
async function waitForTableLoad(page) {
  await page.locator('.oxd-loading-spinner').waitFor({ state: 'detached' }).catch(() => {});
}
```
