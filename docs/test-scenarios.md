# Test Scenarios: Add Entitlements

> Feature: Leave → Entitlements → Add Entitlements
> Generated: 2026-05-26

---

## Happy Path

### TC-001: Add entitlement to a single employee (Individual mode)
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one employee exists; at least one leave type exists; a leave period is active
**Steps**:
1. Navigate to `Leave → Entitlements → Add Entitlements`
2. Confirm the form defaults to **Individual** employee mode
3. Select an employee from the **Employee Name** autocomplete
4. Select a **Leave Type** from the dropdown
5. Confirm **Leave Period** is auto-populated with the current period
6. Enter **Entitlement** = `10`
7. Click **Save**
**Expected Results**: Success toast `"Successfully Saved"` appears; entitlement row is visible on the employee's leave entitlements page with 10 days assigned
**Business Rule**: Entitlement must be assigned per employee per leave type per leave period (§5)
**Suggested Layer**: E2E

---

### TC-002: Add entitlement via Bulk Assign (Multiple Employees mode)
**Category**: Happy Path
**Preconditions**: Admin logged in; multiple employees assigned to the same Sub Unit exist
**Steps**:
1. Navigate to `Leave → Entitlements → Add Entitlements`
2. Select **Multiple Employees** radio/toggle
3. Select **Leave Type** from the dropdown
4. Select **Leave Period**
5. Enter **Entitlement** = `14`
6. Set **Sub Unit** filter to an existing sub unit (e.g., Engineering)
7. Click **Save**
8. A confirmation modal appears showing the number of affected employees
9. Click **Confirm** on the modal
**Expected Results**: Toast `"Successfully Saved"`; all employees in the selected sub unit now have 14 days of that leave type
**Business Rule**: Bulk Assign pushes the same entitlement to multiple employees by Location / Sub Unit / Job Title filter (§5)
**Suggested Layer**: E2E

---

### TC-003: Add entitlement filtered by Location (Bulk mode)
**Category**: Happy Path
**Preconditions**: Admin logged in; multiple employees share the same Location
**Steps**:
1. Navigate to Add Entitlements; toggle **Multiple Employees**
2. Select **Leave Type**, **Leave Period**, and enter **Entitlement** = `7`
3. Set **Location** filter to a configured location
4. Click **Save** → confirm modal → click **Confirm**
**Expected Results**: Toast `"Successfully Saved"`; all employees at that location gain the entitlement
**Business Rule**: Bulk assign supports Location filter (§5)
**Suggested Layer**: E2E

---

### TC-004: Add entitlement filtered by Job Title (Bulk mode)
**Category**: Happy Path
**Preconditions**: Admin logged in; employees with a specific Job Title exist
**Steps**:
1. Navigate to Add Entitlements; toggle **Multiple Employees**
2. Select **Leave Type**, **Leave Period**, enter **Entitlement** = `5`
3. Set **Job Title** filter to an existing job title
4. Click **Save** → confirm modal → **Confirm**
**Expected Results**: Toast `"Successfully Saved"`; only employees with that job title receive the entitlement
**Business Rule**: Bulk assign supports Job Title filter (§5)
**Suggested Layer**: E2E

---

### TC-005: Added entitlement reflects in employee leave balance
**Category**: Happy Path
**Preconditions**: An employee has just been assigned 10 days of Annual Leave
**Steps**:
1. Navigate to `Leave → Entitlements → Employee Entitlements`
2. Search for the employee
3. Find the row for the assigned leave type in the current leave period
**Expected Results**: Balance column shows `10.00`; Used = `0.00`; Scheduled = `0.00`; Pending = `0.00`
**Business Rule**: Balance = entitlement − (scheduled + taken + pending) (§4)
**Suggested Layer**: E2E

---

### TC-006: Add entitlement with decimal days (Individual mode)
**Category**: Happy Path
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to Add Entitlements (Individual mode)
2. Select employee, leave type, leave period
3. Enter **Entitlement** = `0.5`
4. Click **Save**
**Expected Results**: Toast `"Successfully Saved"`; entitlement shows `0.50` days on the employee's entitlements page
**Business Rule**: Half-day leave is supported; entitlement can be fractional (§4)
**Suggested Layer**: E2E

---

## Business Rules

### TC-100: Without entitlement, leave balance is 0.00
**Category**: Business Rule
**Preconditions**: A leave type exists; a specific employee has NO entitlement assigned for that leave type in the current period
**Steps**:
1. Navigate to `Leave → Entitlements → Employee Entitlements`
2. Search for the employee
3. Verify the leave type row (if present) shows balance `0.00`, OR the leave type does not appear in the list
**Expected Results**: No positive balance exists for that leave type; if the employee tries to apply leave of that type, they receive "Leave balance exceeded"
**Business Rule**: Without an entitlement, balance is 0.00 and leave is rejected (§5)
**Suggested Layer**: E2E

---

### TC-101: Leave Period auto-populates with the current period
**Category**: Business Rule
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Navigate to Add Entitlements
2. Observe the **Leave Period** field without touching it
**Expected Results**: Leave Period is auto-filled with the current annual leave period (e.g., 2025-01-01 to 2025-12-31)
**Business Rule**: Leave Period is annual by default (§5)
**Suggested Layer**: E2E

---

### TC-102: Bulk assign confirmation modal shows employee count
**Category**: Business Rule
**Preconditions**: Multiple Employees mode; Sub Unit filter set to a sub unit with N employees
**Steps**:
1. Fill in bulk assign form (leave type, period, entitlement, sub unit)
2. Click **Save**
3. Observe the confirmation dialog
**Expected Results**: Modal text indicates the number of employees who will receive the entitlement (e.g., "Assign leave entitlement for N employee(s)")
**Business Rule**: Bulk Assign shows confirmation with affected employee count before committing (§5, Flow 10)
**Suggested Layer**: E2E

---

### TC-103: Entitlement is per employee per leave type per period
**Category**: Business Rule
**Preconditions**: Employee already has an entitlement for Annual Leave in the current period
**Steps**:
1. Navigate to Add Entitlements (Individual mode)
2. Select the same employee, same leave type, same leave period
3. Enter a different entitlement value (e.g., 20)
4. Click **Save**
**Expected Results**: Either the entitlement is updated to the new value, or an "Already exists" error is shown — the system does not silently create a duplicate row
**Business Rule**: Entitlement is per employee per leave type per period (§5)
**Suggested Layer**: E2E

---

### TC-104: Cancel on bulk confirmation modal aborts the save
**Category**: Business Rule
**Preconditions**: Bulk assign form fully filled; confirmation modal open
**Steps**:
1. Click **Save** → confirmation modal appears
2. Click **Cancel** on the modal
**Expected Results**: No toast appears; no entitlements are created; the form retains its values so admin can review and try again
**Business Rule**: Confirmation modal is a guard before bulk commit (§10)
**Suggested Layer**: E2E

---

## Security

### TC-200: ESS user cannot access Add Entitlements page
**Category**: Security
**Preconditions**: An ESS (non-admin) user account exists and is enabled
**Steps**:
1. Login as ESS user
2. Observe the left navigation menu
3. Attempt to navigate directly to `/web/index.php/leave/addLeaveEntitlement`
**Expected Results**: The "Leave → Entitlements" menu item is not visible to ESS users; direct URL navigation either redirects to dashboard or shows an "Access Denied" / empty page — never renders the entitlement form
**Business Rule**: ESS users see only My Info, Leave (own), Time, Performance, Directory, Dashboard, Buzz — not admin entitlement management (§2)
**Suggested Layer**: E2E

---

### TC-201: ESS user cannot call Add Entitlement API
**Category**: Security
**Preconditions**: ESS user session active
**Steps**:
1. With an ESS session, attempt `POST /api/v2/leave/leave-entitlements` with valid payload
**Expected Results**: API returns `403 Unauthorized`; no entitlement is created
**Business Rule**: Permissions enforced at API layer — not just UI (§2, §9)
**Suggested Layer**: API

---

### TC-202: Admin cannot select a non-existent leave type via UI
**Category**: Security
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Attempt to type a leave type name not in the dropdown
**Expected Results**: No option is selectable; the field only accepts values from the dropdown; injected values are rejected
**Business Rule**: UI restricts input to valid leave types (§5)
**Suggested Layer**: E2E

---

## Negative / Error

### TC-300: Submit Individual form with no employee selected
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Leave **Employee Name** blank
2. Fill in Leave Type, Leave Period, Entitlement = 10
3. Click **Save**
**Expected Results**: Inline validation error `"Required"` appears below the Employee Name field; form is not submitted
**Business Rule**: Required field validation (§9)
**Suggested Layer**: E2E

---

### TC-301: Submit Individual form with no leave type selected
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Select an employee
2. Leave **Leave Type** blank
3. Enter Entitlement = 10
4. Click **Save**
**Expected Results**: Inline validation error `"Required"` below Leave Type; no submission
**Business Rule**: Required field validation (§9)
**Suggested Layer**: E2E

---

### TC-302: Submit with entitlement value = 0
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Fill all required fields
2. Enter **Entitlement** = `0`
3. Click **Save**
**Expected Results**: Validation error such as `"Should be greater than 0"` or `"Required"`; form not submitted
**Business Rule**: Entitlement must be a positive value (§9)
**Suggested Layer**: E2E

---

### TC-303: Submit with negative entitlement value
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Fill all required fields
2. Enter **Entitlement** = `-5`
3. Click **Save**
**Expected Results**: Validation error; form not submitted; no entitlement created
**Business Rule**: Numeric field must be greater than 0 (§9)
**Suggested Layer**: E2E

---

### TC-304: Submit with non-numeric entitlement value
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Fill all required fields
2. Enter **Entitlement** = `abc`
3. Click **Save**
**Expected Results**: Validation error `"Should be a number"`; form not submitted
**Business Rule**: Numeric field validation (§9)
**Suggested Layer**: E2E

---

### TC-305: Bulk assign with no filter set (all employees)
**Category**: Negative
**Preconditions**: Admin on Add Entitlements (Multiple Employees mode); many employees exist
**Steps**:
1. Select Leave Type, Leave Period, enter Entitlement = 5
2. Leave ALL filters (Sub Unit, Location, Job Title) blank
3. Click **Save**
**Expected Results**: Confirmation modal shows total employee count (all employees); admin must explicitly confirm before the broad assignment goes through
**Business Rule**: Bulk assign with no filter affects all employees — modal is a safeguard (§5)
**Suggested Layer**: E2E

---

### TC-306: Bulk assign with filter matching 0 employees
**Category**: Negative
**Preconditions**: A Sub Unit filter is configured but no employees belong to that sub unit
**Steps**:
1. Multiple Employees mode; set Sub Unit to a unit with no employees
2. Fill in Leave Type, Leave Period, Entitlement = 5
3. Click **Save**
**Expected Results**: Confirmation modal shows 0 employees, or a validation message indicates no employees match the filter; save with 0 affected employees is blocked or warned
**Business Rule**: Bulk assign should not silently succeed with 0 affected employees (§5)
**Suggested Layer**: E2E

---

### TC-307: Submit Individual form with all fields blank
**Category**: Negative
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Click **Save** without filling any field
**Expected Results**: Multiple inline `"Required"` errors appear; no submission
**Business Rule**: Required field validation (§9)
**Suggested Layer**: E2E

---

## Edge Cases

### TC-400: Entitlement value of exactly 1 day
**Category**: Edge Case
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Fill in all required fields; enter **Entitlement** = `1`
2. Click **Save**
**Expected Results**: Toast `"Successfully Saved"`; entitlement shows `1.00` day in employee's balance
**Business Rule**: Minimum valid positive value (§9)
**Suggested Layer**: E2E

---

### TC-401: Very large entitlement value (e.g., 365 days)
**Category**: Edge Case
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Enter **Entitlement** = `365`
2. Click **Save**
**Expected Results**: Entitlement is saved successfully; balance shows 365.00 days; no application-level cap enforced
**Business Rule**: System should handle large values without error unless a max is configured (§5)
**Suggested Layer**: E2E

---

### TC-402: Past leave period entitlement assignment
**Category**: Edge Case
**Preconditions**: A past leave period exists in the system
**Steps**:
1. Individual mode; select employee, leave type
2. Change **Leave Period** to a past period
3. Enter Entitlement = 10
4. Click **Save**
**Expected Results**: Either saves successfully (historical data entry allowed) or shows a validation warning; no unhandled error
**Business Rule**: Leave Period selection must be handled gracefully (§5)
**Suggested Layer**: E2E

---

### TC-403: Entitlement decimal precision (e.g., 10.25 days)
**Category**: Edge Case
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Enter **Entitlement** = `10.25`
2. Click **Save**
**Expected Results**: Either saves as `10.25` (2 decimal places) or rounds; no error; balance reflects assigned value accurately
**Business Rule**: Half-day leave support implies decimal precision (§4)
**Suggested Layer**: E2E

---

### TC-404: Bulk assign with combined filters (Sub Unit + Job Title)
**Category**: Edge Case
**Preconditions**: Some employees match BOTH filters; some match only one
**Steps**:
1. Multiple Employees mode; set both Sub Unit and Job Title filters
2. Click **Save** → observe confirmation modal employee count
**Expected Results**: Only employees matching BOTH filters appear in the count; count is less than or equal to either filter alone
**Business Rule**: Filters are AND-combined in bulk assign (§5)
**Suggested Layer**: E2E

---

## UI State

### TC-500: Toggle between Individual and Multiple Employees changes visible fields
**Category**: UI State
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Observe default state (Individual mode): **Employee Name** field visible; Location/Sub Unit/Job Title filters NOT visible
2. Switch to **Multiple Employees** mode
3. Observe form changes
**Expected Results**: Employee Name field disappears; Location, Sub Unit, Job Title filter fields appear; Leave Type, Leave Period, Entitlement remain visible
**Business Rule**: Mode toggle controls which form fields are rendered (§5)
**Suggested Layer**: E2E

---

### TC-501: Leave Period dropdown lists available periods
**Category**: UI State
**Preconditions**: Admin on Add Entitlements page
**Steps**:
1. Click the **Leave Period** dropdown
2. Observe available options
**Expected Results**: At least the current annual leave period is present; no blank or malformed period entries
**Business Rule**: Leave Period is annual by default (§5)
**Suggested Layer**: E2E

---

### TC-502: Employee Name autocomplete filters correctly
**Category**: UI State
**Preconditions**: Admin on Add Entitlements page (Individual mode)
**Steps**:
1. Click **Employee Name** field and type 3+ characters of an employee's name
2. Wait for autocomplete dropdown
3. Type a name that does not match any employee
**Expected Results**: Dropdown lists matching employees; selecting one commits the value; typing a non-existent name shows "No Records Found"
**Business Rule**: Employee autocomplete is standard OXD pattern (§9)
**Suggested Layer**: E2E

---

### TC-503: Success toast appears after saving
**Category**: UI State
**Preconditions**: All required fields filled in Add Entitlements form
**Steps**:
1. Click **Save** (Individual mode)
**Expected Results**: Green success toast `"Successfully Saved"` appears in bottom-right corner and auto-dismisses
**Business Rule**: Every state-changing action triggers a toast (§10)
**Suggested Layer**: E2E

---

### TC-504: Form state after successful save
**Category**: UI State
**Preconditions**: Individual entitlement just saved
**Steps**:
1. Observe the page state after the save toast appears
**Expected Results**: Either the form resets to blank (allowing another entry) OR the page navigates to the entitlements list — no lingering stale data in the form
**Business Rule**: Post-save navigation/reset is a UX state to verify (§10)
**Suggested Layer**: E2E

---

### TC-505: Confirmation modal in Bulk mode is dismissible
**Category**: UI State
**Preconditions**: Bulk assign form filled; Save clicked → confirmation modal open
**Steps**:
1. Click outside the modal or click the **Cancel** / close button
**Expected Results**: Modal closes; user is returned to the form; no save has occurred; form data is preserved
**Business Rule**: Modal cancel should not lose form data (§10)
**Suggested Layer**: E2E
