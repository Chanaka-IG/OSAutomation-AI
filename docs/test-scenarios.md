# Test Scenarios: Assign Leave

**Feature**: Assign Leave (Admin/Supervisor assigning leave on behalf of employees)
**URL**: `/web/index.php/leave/assign-leave`
**Generated**: 2026-05-28

---

## Happy Path Scenarios (TC-001–TC-099)

### TC-001: Admin assigns a full-day leave for an employee with sufficient entitlement
**Category**: Happy Path
**Preconditions**: Admin logged in; target employee exists with at least 1 day entitlement for the chosen leave type; leave period is active
**Steps**:
1. Navigate to `Leave → Assign Leave` (`/leave/assign-leave`)
2. Type employee name in the Employee autocomplete and select from suggestions
3. Select a leave type with positive balance from the Leave Type dropdown
4. Observe Balance widget update
5. Set From Date and To Date to the same future working day
6. Select Duration = "Full Day"
7. Optionally enter a Comment
8. Click **Assign**
**Expected Results**: Green toast `"Successfully Saved"`; leave request appears in `Leave → Leave List` with status **Scheduled**; employee's balance is reduced by 1 day
**Business Rule**: Business Rule §6 — Admin can assign leave for any employee; employee must have positive entitlement
**Suggested Layer**: E2E

---

### TC-002: Admin assigns leave spanning multiple days (full day each)
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has ≥ 3 days entitlement for the chosen leave type
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date to a Monday and To Date to Wednesday of the same work week
4. Select Duration = "Full Day"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; leave request covers 3 days (Mon–Wed); working days counted correctly (weekends excluded); balance reduced by 3
**Business Rule**: §4 — numberOfDays excludes non-working days per Work Week config; §6 — Admin can assign for any employee
**Suggested Layer**: E2E

---

### TC-003: Admin assigns half-day morning leave
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has sufficient entitlement; target date is a working day
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, and a single future working day
3. Set From Date = To Date
4. Select Duration = "Half Day - Morning"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; leave appears as 0.5 days in leave list; balance reduced by 0.5
**Business Rule**: §6 — Half day - Morning duration supported
**Suggested Layer**: E2E

---

### TC-004: Admin assigns half-day afternoon leave
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has sufficient entitlement; target date is a working day
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, and a single future working day
3. Set From Date = To Date
4. Select Duration = "Half Day - Afternoon"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; leave appears as 0.5 days; balance reduced by 0.5
**Business Rule**: §6 — Half day - Afternoon duration supported
**Suggested Layer**: E2E

---

### TC-005: Admin assigns leave with "Specify Time" duration
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has sufficient entitlement; target date is a working day
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, set From Date = To Date to a future working day
3. Select Duration = "Specify Time"
4. Set From Time to "09:00" and To Time to "12:00"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; duration shown in hours (3 hours); leave appears in leave list with correct time range
**Business Rule**: §6 — Specify Time requires From/To time inputs; duration displayed in hours
**Suggested Layer**: E2E

---

### TC-006: Admin assigns leave with a comment
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has sufficient entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, valid date range, Duration = "Full Day"
3. Enter text in the Comment field: "Annual leave assigned by admin"
4. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; comment is saved and visible when viewing the leave request details
**Business Rule**: §4 — Comment field is optional; §6 — general assign leave flow
**Suggested Layer**: E2E

---

### TC-007: Supervisor assigns leave for a subordinate employee
**Category**: Happy Path
**Preconditions**: Logged in as a Supervisor who has at least one subordinate; subordinate has positive entitlement
**Steps**:
1. Log in as Supervisor
2. Navigate to `Leave → Assign Leave`
3. Search for the subordinate in the Employee field
4. Select a valid leave type with balance, set valid date range, Duration = "Full Day"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; leave assigned successfully; appears in `Leave → Leave List`
**Business Rule**: §6 — Supervisors can assign leave only for their subordinates
**Suggested Layer**: E2E

---

### TC-008: Balance widget updates when leave type is changed
**Category**: Happy Path
**Preconditions**: Admin logged in; employee has entitlements for multiple leave types
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee
3. Select Leave Type A — note Balance widget value
4. Change Leave Type to Leave Type B — note Balance widget updates
**Expected Results**: Balance widget updates dynamically when leave type changes without page reload
**Business Rule**: §5 — balance = entitlement - (scheduled + taken + pending) per leave type
**Suggested Layer**: E2E

---

## Business Rule Scenarios (TC-100–TC-199)

### TC-101: Cannot assign leave when employee has zero entitlement for that leave type
**Category**: Business Rule
**Preconditions**: Admin logged in; target employee has 0 entitlement for chosen leave type
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and a leave type for which the employee has 0 balance
3. Set a valid date range and Duration = "Full Day"
4. Click **Assign**
**Expected Results**: Error message or toast indicating leave balance exceeded; leave is NOT created; balance remains 0
**Business Rule**: §6 — "Particular employee should have positive entitlements for the relevant leave type"; §5 — without entitlement, balance is 0.00 and leave is rejected with "Leave balance exceeded"
**Suggested Layer**: E2E

---

### TC-102: Cannot assign leave when requested days exceed available balance
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has exactly 2 days entitlement for chosen leave type
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and the leave type with 2-day balance
3. Set From Date and To Date spanning 5 working days
4. Select Duration = "Full Day"
5. Click **Assign**
**Expected Results**: Error indicating leave balance exceeded; leave NOT created
**Business Rule**: §4 — balance is held immediately on submission; §5 — balance check at assign time
**Suggested Layer**: E2E

---

### TC-103: Overlapping leave request is rejected
**Category**: Business Rule
**Preconditions**: Admin logged in; employee already has an approved/pending leave on a specific date
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and same leave type as an existing leave
3. Set From Date and To Date overlapping with an existing leave request
4. Click **Assign**
**Expected Results**: Error `"Overlapping leave requests found"` (400); leave NOT created
**Business Rule**: §4 — overlapping leave check is per leave type AND across leave types; returns 400 with "Overlapping leave requests found"
**Suggested Layer**: E2E

---

### TC-104: Leave spanning weekends counts only working days
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has ≥ 5 days entitlement; work week = Mon–Fri
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date to a Monday and To Date to the following Sunday (7 calendar days)
4. Select Duration = "Full Day"
5. Observe the Balance widget
**Expected Results**: Balance widget and resulting leave shows 5 working days (not 7); Sat/Sun excluded
**Business Rule**: §4 — numberOfDays computed respecting Work Week configuration (weekends/holidays excluded)
**Suggested Layer**: E2E

---

### TC-105: Assign leave with status immediately "Scheduled" (not Pending)
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has sufficient entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Assign a valid leave (full day, valid date, sufficient balance)
3. Navigate to `Leave → Leave List` and find the assigned leave
**Expected Results**: Leave status is **Scheduled** (not "Pending Approval") — admin-assigned leaves bypass the approval workflow
**Business Rule**: §4 — Admin-assigned leave goes directly to "Scheduled" (status=2); no approval step needed
**Suggested Layer**: E2E

---

### TC-106: From Date must be equal to or before To Date
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has sufficient entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date to a date AFTER To Date
4. Click **Assign**
**Expected Results**: Validation error indicating invalid date range; leave NOT created
**Business Rule**: §4 — toDate >= fromDate; §9 — required field validation
**Suggested Layer**: E2E

---

### TC-107: Specify Time duration requires From Time and To Time
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has sufficient entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, valid date
3. Select Duration = "Specify Time"
4. Leave From Time and To Time empty
5. Click **Assign**
**Expected Results**: Validation error indicating From Time and To Time are required; leave NOT created
**Business Rule**: §6 — "For the Specify time, From and To times also need to be added"
**Suggested Layer**: E2E

---

### TC-108: Half-day duration auto-computes 0.5 days in balance widget
**Category**: Business Rule
**Preconditions**: Admin logged in; employee has ≥ 1 day entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, From Date = To Date = a working day
3. Select Duration = "Half Day - Morning"
4. Observe Balance widget
**Expected Results**: Balance widget shows 0.5 days deducted; remaining balance decreases by 0.5 after save
**Business Rule**: §6 — Half day durations deduct 0.5 from balance
**Suggested Layer**: E2E

---

## Security Scenarios (TC-200–TC-299)

### TC-201: ESS user cannot access the Assign Leave page
**Category**: Security
**Preconditions**: Logged in as an ESS (non-supervisor) user
**Steps**:
1. Log in as ESS user
2. Attempt direct navigation to `/web/index.php/leave/assign-leave`
**Expected Results**: Access denied (403 / redirect to forbidden page or login); no leave assignment form rendered; ESS user cannot see "Assign Leave" in the Leave menu
**Business Rule**: §6 — "Only Admin and the supervisors can assign leaves for employees"; §2 — ESS role restrictions
**Suggested Layer**: E2E

---

### TC-202: Supervisor cannot assign leave for a non-subordinate employee
**Category**: Security
**Preconditions**: Logged in as a Supervisor with at least one subordinate; another employee exists who is NOT a subordinate
**Steps**:
1. Log in as Supervisor
2. Navigate to `Leave → Assign Leave`
3. Type the name of a non-subordinate employee in the Employee field
**Expected Results**: Non-subordinate employee does NOT appear in the autocomplete suggestions; OR if entered manually via API, request returns 403
**Business Rule**: §6 — "Supervisors can only assign leaves for their respective subordinates"
**Suggested Layer**: E2E

---

### TC-203: Unauthenticated user cannot access the Assign Leave page
**Category**: Security
**Preconditions**: No active session (not logged in)
**Steps**:
1. Directly navigate to `/web/index.php/leave/assign-leave` without logging in
**Expected Results**: Redirected to `/auth/login?next=<original-url>`; form is not accessible
**Business Rule**: §1 — After logout/session timeout, deep links force redirect to /auth/login
**Suggested Layer**: E2E

---

### TC-204: ESS user cannot call assign leave API directly
**Category**: Security
**Preconditions**: Active ESS session
**Steps**:
1. Log in as ESS user
2. Attempt POST to the leave assignment API with ESS session cookie and CSRF token
**Expected Results**: API returns 403 Unauthorized; leave not created
**Business Rule**: §2 — ESS cannot access leave management endpoints; §9 — server-side role enforcement
**Suggested Layer**: API

---

## Negative / Error Scenarios (TC-300–TC-399)

### TC-301: Assigning leave without selecting an employee shows validation error
**Category**: Negative
**Preconditions**: Admin logged in; on Assign Leave page
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Leave Employee field empty
3. Click **Assign**
**Expected Results**: Inline validation error `"Required"` shown under Employee field; form not submitted
**Business Rule**: §9 — Required text fields show "Required" when blurred empty
**Suggested Layer**: E2E

---

### TC-302: Assigning leave without selecting a leave type shows validation error
**Category**: Negative
**Preconditions**: Admin logged in; employee selected
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select a valid employee
3. Leave Leave Type unselected
4. Set valid date range and click **Assign**
**Expected Results**: Inline validation `"Required"` under Leave Type field; form not submitted
**Business Rule**: §9 — Required field validation
**Suggested Layer**: E2E

---

### TC-303: Assigning leave without From Date shows validation error
**Category**: Negative
**Preconditions**: Admin logged in; employee and leave type selected
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Leave From Date empty, set a To Date
4. Click **Assign**
**Expected Results**: Validation error `"Required"` under From Date; form not submitted
**Business Rule**: §9 — Required field validation; §4 — fromDate is required
**Suggested Layer**: E2E

---

### TC-304: Assigning leave without To Date shows validation error
**Category**: Negative
**Preconditions**: Admin logged in; employee and leave type selected
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, set From Date only
3. Click **Assign**
**Expected Results**: Validation error `"Required"` under To Date; form not submitted
**Business Rule**: §9 — Required field validation; §4 — toDate is required
**Suggested Layer**: E2E

---

### TC-305: Assigning leave with invalid date format
**Category**: Negative
**Preconditions**: Admin logged in; on Assign Leave page
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Manually type an invalid date like "13/32/2025" in the From Date field
4. Click **Assign**
**Expected Results**: Validation error shown for invalid date; leave not created
**Business Rule**: §9 — Date fields require correct locale format (default Y-m-d)
**Suggested Layer**: E2E

---

### TC-306: Assigning leave on a non-working day (weekend) with single-day selection results in 0 days
**Category**: Negative
**Preconditions**: Admin logged in; employee has entitlement; work week = Mon–Fri
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date = To Date = a Saturday
4. Select Duration = "Full Day"
5. Click **Assign**
**Expected Results**: Balance shows 0 days or validation error indicating no working days in the selected range; leave NOT created
**Business Rule**: §4 — numberOfDays excludes non-working days; a weekend-only date range results in 0 working days
**Suggested Layer**: E2E

---

### TC-307: Assigning leave for a terminated employee
**Category**: Negative
**Preconditions**: Admin logged in; a terminated employee exists in the system
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Type the terminated employee's name in the Employee autocomplete
**Expected Results**: Terminated employee does NOT appear in suggestions
**Business Rule**: §3 — Terminated employees are excluded from active employee lists
**Suggested Layer**: E2E

---

### TC-308: Specify Time — To Time before From Time
**Category**: Negative
**Preconditions**: Admin logged in; employee has entitlement; Duration = "Specify Time" selected
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, valid date
3. Select Duration = "Specify Time"
4. Set From Time = "14:00" and To Time = "09:00" (To before From)
5. Click **Assign**
**Expected Results**: Validation error indicating invalid time range; leave NOT created
**Business Rule**: §6 — Specify Time duration requires valid From/To time range
**Suggested Layer**: E2E

---

## Edge Case Scenarios (TC-400–TC-499)

### TC-401: Assign leave on a public holiday — holiday excluded from day count
**Category**: Edge Case
**Preconditions**: Admin logged in; a public holiday is configured for a specific date; employee has entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date and To Date spanning the holiday (e.g., Mon–Fri week with a holiday on Wednesday)
4. Select Duration = "Full Day"
**Expected Results**: Balance widget shows 4 days (not 5); holiday excluded from numberOfDays; leave saved successfully with 4 days
**Business Rule**: §4 — numberOfDays respects work week AND holidays
**Suggested Layer**: E2E

---

### TC-402: Assign exactly the remaining balance (boundary — zero balance after)
**Category**: Edge Case
**Preconditions**: Admin logged in; employee has exactly 2 days entitlement remaining
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type with exactly 2 days remaining
3. Set From Date and To Date spanning exactly 2 working days
4. Select Duration = "Full Day"
5. Click **Assign**
**Expected Results**: Toast `"Successfully Saved"`; balance widget shows 0 remaining; leave appears in list as Scheduled
**Business Rule**: §5 — balance = entitlement - (scheduled + taken + pending); assigning exactly what's left is valid
**Suggested Layer**: E2E

---

### TC-403: Assign leave when employee has a mix of pending and approved leave (balance partially consumed)
**Category**: Edge Case
**Preconditions**: Employee has 5 days entitlement; 2 days are in Pending Approval status; admin assigns 3 more days
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee; observe balance shows 3 remaining (5 - 2 pending)
3. Assign 3 days of leave
**Expected Results**: Leave assigned successfully; balance now 0; pending count not double-counted
**Business Rule**: §4 — "Pending Approval portion is held in escrow — subtracted from balance immediately on submission"
**Suggested Layer**: E2E

---

### TC-404: Assign leave for an employee with no login account (PIM-only employee)
**Category**: Edge Case
**Preconditions**: Admin logged in; an employee exists with a PIM record but no system user account; employee has entitlement
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Search and select the PIM-only employee
3. Assign leave with valid parameters
4. Click **Assign**
**Expected Results**: Leave assigned successfully; admin can assign leave regardless of whether the employee has a login
**Business Rule**: §6 — Admin assigns leave for employees; no requirement for employee to have a system user account
**Suggested Layer**: E2E

---

### TC-405: Assign leave with comment at maximum length (250 characters)
**Category**: Edge Case
**Preconditions**: Admin logged in; employee has entitlement; Assign Leave form open
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, valid date, Duration = "Full Day"
3. Enter exactly 250 characters in the Comment field
4. Click **Assign**
**Expected Results**: Leave saved successfully with the full comment; no truncation
**Business Rule**: §9 — textareas allow up to 250 characters
**Suggested Layer**: E2E

---

### TC-406: Assign leave with comment exceeding max length
**Category**: Edge Case
**Preconditions**: Admin logged in; Assign Leave form open
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, valid date, Duration = "Full Day"
3. Enter 251+ characters in the Comment field
4. Click **Assign**
**Expected Results**: Validation error `"Should be less than 250 characters"` under Comment; leave NOT saved
**Business Rule**: §9 — textareas limited to 250 characters
**Suggested Layer**: E2E

---

## UI State Scenarios (TC-500–TC-599)

### TC-501: Assign Leave page renders correctly for Admin
**Category**: UI State
**Preconditions**: Admin logged in
**Steps**:
1. Navigate to `Leave → Assign Leave`
**Expected Results**: Page renders with: Employee autocomplete, Leave Type dropdown, From Date picker, To Date picker, Duration dropdown, Comment textarea, and Assign button; all fields empty on load
**Business Rule**: §6 — Assign Leave form fields
**Suggested Layer**: E2E

---

### TC-502: Leave Type dropdown is populated only after employee is selected
**Category**: UI State
**Preconditions**: Admin logged in; on Assign Leave page
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Observe Leave Type dropdown before selecting employee
3. Select an employee
4. Observe Leave Type dropdown after employee selection
**Expected Results**: Leave Type dropdown is empty or disabled before employee selection; after selection it populates with the employee's available leave types
**Business Rule**: §5 — Leave types are relevant per employee (entitlement-dependent)
**Suggested Layer**: E2E

---

### TC-503: Duration dropdown shows correct options
**Category**: UI State
**Preconditions**: Admin logged in; employee and leave type selected; date range set
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee, leave type, and valid date range
3. Click on the Duration dropdown
**Expected Results**: Dropdown shows: "Full Day", "Half Day - Morning", "Half Day - Afternoon", "Specify Time"
**Business Rule**: §6 — "Can assign leaves with different type of Durations"
**Suggested Layer**: E2E

---

### TC-504: From Time and To Time fields appear only when "Specify Time" is selected
**Category**: UI State
**Preconditions**: Admin logged in; on Assign Leave page with employee and leave type selected
**Steps**:
1. Set Duration = "Full Day" — observe time fields
2. Set Duration = "Half Day - Morning" — observe time fields
3. Set Duration = "Specify Time" — observe time fields
**Expected Results**: From Time and To Time fields are hidden for Full Day and Half Day durations; they appear only when "Specify Time" is selected
**Business Rule**: §6 — For Specify Time, From and To times need to be added; implied fields are conditional
**Suggested Layer**: E2E

---

### TC-505: Balance widget updates when date range changes
**Category**: UI State
**Preconditions**: Admin logged in; employee and leave type selected
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Select employee and leave type
3. Set From Date = To Date = a working day — note Balance widget
4. Change To Date to 3 working days later — observe Balance widget
**Expected Results**: Balance widget dynamically updates to show days remaining after deducting the requested days without page reload
**Business Rule**: §4 — live balance widget; §5 — balance computed dynamically
**Suggested Layer**: E2E

---

### TC-506: Employee autocomplete shows suggestions on typing
**Category**: UI State
**Preconditions**: Admin logged in; on Assign Leave page
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Click on Employee field
3. Type first 2–3 characters of an employee's name
**Expected Results**: Dropdown suggestions appear with matching employee names; suggestions filter as user types
**Business Rule**: §3 — Employee field is an autocomplete backed by PIM employee list
**Suggested Layer**: E2E

---

### TC-507: Success toast appears after assign
**Category**: UI State
**Preconditions**: Admin logged in; employee with entitlement available
**Steps**:
1. Navigate to `Leave → Assign Leave`
2. Fill all required fields with valid data
3. Click **Assign**
**Expected Results**: Green toast appears in bottom-right with `"Successfully Saved"`; toast auto-dismisses after a few seconds
**Business Rule**: §10 — "Every state-changing UI action triggers a green/red toast in the bottom-right"
**Suggested Layer**: E2E

---

### TC-508: Leave menu shows "Assign Leave" only for Admin and Supervisor roles
**Category**: UI State
**Preconditions**: Multiple user accounts available (Admin, ESS, Supervisor)
**Steps**:
1. Log in as Admin — check Leave menu items
2. Log out; log in as a Supervisor — check Leave menu items
3. Log out; log in as ESS — check Leave menu items
**Expected Results**: Admin and Supervisor see "Assign Leave" in the Leave menu; ESS user does NOT see "Assign Leave" option
**Business Rule**: §2 — role-based menu visibility; §6 — only Admin and Supervisors can assign leave
**Suggested Layer**: E2E
