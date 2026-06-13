# Test Scenarios — Add Work Shift

**Feature**: Admin → Job → Work Shifts → Add
**List URL**: `/web/index.php/admin/workShift` · **Add URL**: `/web/index.php/admin/saveWorkShifts` · **Edit URL**: `/web/index.php/admin/saveWorkShifts/{id}`
**Create API**: `POST /api/v2/admin/work-shifts` · body `{name, hoursPerDay, startTime, endTime, empNumbers[]}`
**List API**: `GET /api/v2/admin/work-shifts?limit=50&offset=0`
**Employee hints API**: `GET /api/v2/admin/work-shifts/employees?nameOrId=<q>`
**Uniqueness API**: `GET /api/v2/core/validation/unique?value=<name>&entityName=WorkShift&attributeName=name`

## Form Facts (discovered live, OrangeHRM OS 5.8)
- **Shift Name** — required text; live uniqueness check; duplicate → inline "Already exists"; empty save → inline "Required".
- **Working Hours** — required. `From` (default `09:00 AM`) and `To` (default `05:00 PM`) are OXD AM/PM time pickers (hour textbox + minute textbox + AM/PM radios). **Duration Per Day** is a read-only auto-computed value (To − From, in decimal hours). When `From >= To`, Duration computes to `0.00`.
- **Assigned Employees** — optional multi-select autocomplete ("Type for hints…"); selections render as removable chips; backend stores `empNumbers[]`.
- Save → success toast **"Successfully Saved"** + redirect to list. Cancel → list, no record.
- Access: Admin only (Admin module not present for ESS).

---

## Happy Path (TC-001–099)

### TC-001: Add work shift with required field only (defaults retained)
**Category**: Happy Path
**Preconditions**: Logged in as Admin; on Add Work Shift form.
**Steps**:
1. Enter a unique Shift Name.
2. Leave Working Hours at defaults (09:00 AM – 05:00 PM).
3. Leave Assigned Employees empty.
4. Click Save.
**Expected Results**: "Successfully Saved" toast; redirect to `/admin/workShift`; new row visible with From 09:00 AM, To 05:00 PM, Hours Per Day 8.00; record count incremented. POST body `{name, hoursPerDay:"8.00", startTime:"09:00", endTime:"17:00", empNumbers:[]}`.
**Business Rule**: Shift Name is the only mandatory field; Working Hours pre-filled with valid defaults.
**Suggested Layer**: E2E

### TC-002: Add work shift with custom working hours
**Category**: Happy Path
**Preconditions**: On Add Work Shift form.
**Steps**:
1. Enter a unique Shift Name.
2. Set From = 10:00 AM, To = 04:30 PM.
3. Save.
**Expected Results**: Duration Per Day updates to 6.50 before save; toast "Successfully Saved"; list row shows From 10:00 AM / To 04:30 PM / Hours Per Day 6.50.
**Business Rule**: Duration Per Day = To − From, decimal hours.
**Suggested Layer**: E2E

### TC-003: Add work shift with one assigned employee
**Category**: Happy Path
**Preconditions**: On Add Work Shift form; at least one active employee exists.
**Steps**:
1. Enter a unique Shift Name.
2. Type a partial name in Assigned Employees, select an option from the hint list.
3. Save.
**Expected Results**: Chip appears for the selected employee; POST `empNumbers` contains that employee's empNumber; toast "Successfully Saved"; row appears in list.
**Business Rule**: A work shift may have zero or more assigned employees.
**Suggested Layer**: E2E

### TC-004: Add work shift with multiple assigned employees
**Category**: Happy Path
**Preconditions**: On Add Work Shift form; ≥2 active employees.
**Steps**:
1. Enter a unique Shift Name.
2. Add two different employees via the autocomplete.
3. Save.
**Expected Results**: Two chips; POST `empNumbers` has both empNumbers; toast "Successfully Saved".
**Business Rule**: Assigned Employees is multi-select.
**Suggested Layer**: E2E

### TC-005: New shift is persisted and retrievable via list API
**Category**: Happy Path
**Preconditions**: A shift was just created.
**Steps**:
1. GET `/api/v2/admin/work-shifts?limit=50&offset=0`.
**Expected Results**: Response contains the created shift with matching name, startTime, endTime, hoursPerDay, and assigned employees.
**Business Rule**: Saved shift persists to backend.
**Suggested Layer**: API

---

## Business Rules (TC-100–199)

### TC-100: Duplicate shift name is rejected (case-sensitive create attempt)
**Category**: Business Rule
**Preconditions**: A shift named "X" already exists.
**Steps**:
1. On Add form, type "X" in Shift Name.
**Expected Results**: Inline "Already exists" appears live (via uniqueness API); Save is blocked / does not create a second record.
**Business Rule**: Shift Name must be unique.
**Suggested Layer**: E2E

### TC-101: Duplicate detection while typing triggers uniqueness API
**Category**: Business Rule
**Preconditions**: A shift named "X" exists.
**Steps**:
1. Type "X" in Shift Name and observe network.
**Expected Results**: `GET /api/v2/core/validation/unique?...entityName=WorkShift&attributeName=name` fires and the field shows "Already exists".
**Business Rule**: Uniqueness validated server-side, live.
**Suggested Layer**: E2E / API

### TC-102: Duration auto-recalculates on time change
**Category**: Business Rule
**Preconditions**: On Add form.
**Steps**:
1. Change From to 11:30 AM (To stays 05:00 PM).
**Expected Results**: Duration Per Day shows 5.50 without saving.
**Business Rule**: Duration is derived, not user-entered.
**Suggested Layer**: E2E

### TC-103: hoursPerDay in POST matches the displayed Duration
**Category**: Business Rule
**Preconditions**: On Add form with custom times.
**Steps**:
1. Set From 09:00 AM, To 01:00 PM, Save; inspect POST body.
**Expected Results**: POST `hoursPerDay` = "4.00", `startTime`="09:00", `endTime`="13:00".
**Business Rule**: Submitted duration is consistent with computed value and 24h times.
**Suggested Layer**: API / E2E

### TC-104: Assigned employees persist as empNumbers
**Category**: Business Rule
**Preconditions**: On Add form.
**Steps**:
1. Assign a known employee, Save, inspect POST body and list/edit view.
**Expected Results**: POST `empNumbers` contains the correct empNumber; the assignment survives a reload of the edit page.
**Business Rule**: Employee assignment stored by empNumber.
**Suggested Layer**: API / E2E

---

## Security (TC-200–299)

### TC-200: ESS user has no Admin menu and cannot reach the Add form
**Category**: Security
**Preconditions**: Logged in as an ESS (non-admin) user.
**Steps**:
1. Confirm "Admin" is absent from the side menu.
2. Deep-link to `/admin/workShift` and `/admin/saveWorkShifts`.
**Expected Results**: No Admin nav item; deep links render no Work Shift list/form (access denied / no Add button / no Save).
**Business Rule**: Work Shift administration is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a work shift via the API
**Category**: Security
**Preconditions**: ESS session/token.
**Steps**:
1. POST `/api/v2/admin/work-shifts` with a valid body as ESS.
**Expected Results**: 403/401 (forbidden); no record created.
**Business Rule**: API enforces the same role restriction as the UI.
**Suggested Layer**: API

### TC-202: Script payload in Shift Name is stored inert (no XSS)
**Category**: Security
**Preconditions**: On Add form.
**Steps**:
1. Enter `<script>alert('xss')</script> Shift <ts>` as the name; Save.
**Expected Results**: Saved successfully; the list renders the payload as literal text; no dialog fires; no inline `<script>` executes.
**Business Rule**: User input is escaped on render.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Empty Shift Name shows "Required"
**Category**: Negative
**Preconditions**: On Add form.
**Steps**:
1. Leave Shift Name empty; click Save.
**Expected Results**: Inline "Required" under Shift Name; stays on form; no record created (working-hours defaults present, so only the name errors).
**Business Rule**: Shift Name mandatory.
**Suggested Layer**: E2E

### TC-301: Whitespace-only Shift Name is rejected
**Category**: Negative
**Preconditions**: On Add form.
**Steps**:
1. Enter only spaces in Shift Name; Save.
**Expected Results**: Treated as empty → "Required" (or trimmed and rejected); no record created.
**Business Rule**: Name must be meaningful, not blank.
**Suggested Layer**: E2E

### TC-302: From >= To produces zero duration (no overnight wrap)
**Category**: Negative
**Preconditions**: On Add form.
**Steps**:
1. Set From = 06:30 PM, To = 05:00 PM.
**Expected Results**: Duration Per Day shows **0.00** (not negative, not 23.5h overnight). If saved, hoursPerDay = "0.00".
**Business Rule**: App floors invalid/negative ranges to 0.00 rather than wrapping past midnight.
**Suggested Layer**: E2E

### TC-303: Clearing a duplicate-name error by editing the name
**Category**: Negative
**Preconditions**: A shift "X" exists; on Add form.
**Steps**:
1. Type "X" → "Already exists" shows.
2. Change name to a unique value.
**Expected Results**: Error clears; Save enabled and succeeds.
**Business Rule**: Validation re-runs on change.
**Suggested Layer**: E2E

### TC-304: Invalid time-picker entry is constrained
**Category**: Negative
**Preconditions**: On Add form, From picker open.
**Steps**:
1. Type an out-of-range hour (e.g. 13) / minute (e.g. 99) into the picker fields.
**Expected Results**: Picker rejects/normalizes the value (does not accept 13:99 AM); Duration recomputes only on a valid time.
**Business Rule**: 12-hour AM/PM time entry is bounded.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Maximum-length Shift Name
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Enter a very long name (e.g. 100+ chars); Save.
**Expected Results**: Either saved up to the documented limit or an inline length error; behavior consistent between UI and stored value (no silent truncation mismatch).
**Business Rule**: Name length is bounded by the schema.
**Suggested Layer**: E2E

### TC-401: Minimal duration (1-minute shift)
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Set From 09:00 AM, To 09:01 AM; Save.
**Expected Results**: Duration ≈ 0.02 (rounded to 2 decimals); record saves; list reflects the same.
**Business Rule**: Duration supports sub-hour precision to 2 decimals.
**Suggested Layer**: E2E

### TC-402: Maximum span (00:00 → 11:59 PM)
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Set From 12:00 AM, To 11:59 PM; Save.
**Expected Results**: Duration ≈ 23.98; record saves and lists correctly.
**Business Rule**: Near-24h span allowed.
**Suggested Layer**: E2E

### TC-403: From == To
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Set From and To to the same value (e.g. 09:00 AM / 09:00 AM).
**Expected Results**: Duration shows 0.00.
**Business Rule**: Zero-length shift floors to 0.00 (consistent with TC-302).
**Suggested Layer**: E2E

### TC-404: Name with leading/trailing spaces and unicode
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Enter a name with surrounding spaces and unicode (e.g. " Café Shift ✦ <ts> "); Save.
**Expected Results**: Saved (likely trimmed); list shows the stored value; uniqueness compares the normalized value.
**Business Rule**: Name normalization on save.
**Suggested Layer**: E2E

### TC-405: Remove an assigned-employee chip before saving
**Category**: Edge Case
**Preconditions**: On Add form.
**Steps**:
1. Add an employee chip, then click its × to remove it; Save.
**Expected Results**: POST `empNumbers` is empty; no employee assigned.
**Business Rule**: Removed chips are excluded from submission.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Default field state on the Add form
**Category**: UI State
**Preconditions**: Navigated to Add Work Shift.
**Steps**:
1. Observe the freshly loaded form.
**Expected Results**: Heading "Add Work Shift"; Shift Name empty; From = 09:00 AM; To = 05:00 PM; Duration Per Day = 8.00; Assigned Employees empty with "Type for hints…" placeholder; "* Required" note; Cancel + Save buttons.
**Business Rule**: Sensible 9–5 defaults pre-populate Working Hours.
**Suggested Layer**: E2E

### TC-501: Autocomplete hint list populates from query
**Category**: UI State
**Preconditions**: On Add form.
**Steps**:
1. Type a letter in Assigned Employees.
**Expected Results**: A listbox of matching employee full names appears (driven by `/work-shifts/employees?nameOrId=`); selecting one closes the list and adds a chip.
**Business Rule**: Employee suggestions are query-driven.
**Suggested Layer**: E2E

### TC-502: Cancel returns to list without creating a record
**Category**: UI State
**Preconditions**: On Add form with a name typed.
**Steps**:
1. Click Cancel.
**Expected Results**: Redirect to `/admin/workShift`; no new row; record count unchanged.
**Business Rule**: Cancel discards unsaved input.
**Suggested Layer**: E2E

### TC-503: Empty list state
**Category**: UI State
**Preconditions**: No work shifts exist.
**Steps**:
1. Open `/admin/workShift`.
**Expected Results**: "No Records Found" shown; no table rows; Add button present.
**Business Rule**: Empty-state messaging.
**Suggested Layer**: E2E

### TC-504: Success toast text and post-save redirect
**Category**: UI State
**Preconditions**: Valid Add form submission.
**Steps**:
1. Save a valid shift.
**Expected Results**: Toast titled "Success" with message "Successfully Saved"; lands on the list with the new row and updated "(N) Record(s) Found" counter.
**Business Rule**: Confirmation feedback on save.
**Suggested Layer**: E2E

### TC-505: Time picker popup structure
**Category**: UI State
**Preconditions**: On Add form.
**Steps**:
1. Click the From input.
**Expected Results**: Popup shows hour textbox, minute textbox, and AM/PM radio pair; editing recomputes Duration on close.
**Business Rule**: 12-hour AM/PM picker.
**Suggested Layer**: E2E

---

## Coverage Summary
- **Happy Path**: 5 (TC-001–005)
- **Business Rules**: 5 (TC-100–104)
- **Security**: 3 (TC-200–202)
- **Negative**: 5 (TC-300–304)
- **Edge Cases**: 6 (TC-400–405)
- **UI State**: 6 (TC-500–505)
- **Total**: 30
