# Test Scenarios — Add Users (Admin → User Management → Users → Add)

**Feature**: Creating a new System User (`/web/index.php/admin/viewSystemUsers` → Add → `/admin/saveSystemUser`)
**Domain references**: Flow 2 (Create a New System User), Business Rules §2 (Roles), §9 (Required Field Validation), §10 (Toasts), §11 (Hard delete), User data model (username 5–40 unique, `empNumber` mandatory FK, `userRoleId` 1=Admin 2=ESS, status boolean).
**API**: `POST /api/v2/admin/users` `{ username, password, userRoleId, empNumber, status }`

---

## Happy Path (TC-001–099)

### TC-001: Add an ESS user successfully
**Category**: Happy Path
**Preconditions**: Logged in as Admin; a PIM employee exists (create via `POST /api/v2/pim/employees`)
**Steps**:
1. Navigate to `/admin/viewSystemUsers`
2. Click **Add**
3. Select User Role = **ESS**, type employee name in **Employee Name** autocomplete and pick the suggestion, Status = **Enabled**
4. Enter unique Username (5–40 chars), Password `Test@123`, Confirm Password `Test@123`
5. Click **Save**
**Expected Results**: Success toast `Successfully Saved`; redirect back to user list; new username appears in the grid; Records count incremented by 1
**Business Rule**: Flow 2; User model — all five fields required
**Suggested Layer**: E2E

### TC-002: Add an Admin user successfully
**Category**: Happy Path
**Preconditions**: Logged in as Admin; PIM employee exists
**Steps**:
1. Open Add User form
2. Select User Role = **Admin**, valid employee, Status = Enabled, unique username, valid matching passwords
3. Save
**Expected Results**: `Successfully Saved` toast; user listed with User Role = Admin
**Business Rule**: `userRoleId = 1` (Admin)
**Suggested Layer**: E2E

### TC-003: Newly created enabled user can log in
**Category**: Happy Path
**Preconditions**: TC-001 user created with known password
**Steps**:
1. Logout
2. Login with the new ESS credentials
**Expected Results**: Redirect to `/dashboard/index`; ESS-scoped side menu shown (no Admin item)
**Business Rule**: §1 Authentication, §2 Roles — ESS menu subset
**Suggested Layer**: E2E

### TC-004: Created user is searchable in the System Users list
**Category**: Happy Path
**Preconditions**: User created
**Steps**:
1. On `/admin/viewSystemUsers`, enter the username in the Username filter
2. Click **Search**
**Expected Results**: Exactly one row matching the username, role, employee name, and status
**Business Rule**: GET `/admin/users?username=` filter
**Suggested Layer**: E2E

### TC-005: Create user via API
**Category**: Happy Path
**Preconditions**: Admin session/CSRF token; existing `empNumber`
**Steps**:
1. `POST /api/v2/admin/users` with `{ username, password, status: true, userRoleId: 2, empNumber }`
**Expected Results**: 200 with created user payload (`userName`, `userRole`, `employee`, `status`); user visible via `GET /admin/users?username=`
**Business Rule**: API reference — POST /admin/users
**Suggested Layer**: API

---

## Business Rules (TC-100–199)

### TC-101: Employee must already exist in PIM
**Category**: Business Rule
**Preconditions**: Admin on Add User form
**Steps**:
1. Type a random non-existent name in Employee Name autocomplete
2. Wait for suggestions
**Expected Results**: Dropdown shows **No Records Found**; attempting Save shows field-level `Invalid` error; no user created
**Business Rule**: §3 — `User.empNumber` is non-nullable; employee record must exist before a system user can be created
**Suggested Layer**: E2E

### TC-102: Username must be unique
**Category**: Business Rule
**Preconditions**: User with username `Admin` (seeded) exists
**Steps**:
1. Fill Add User form with Username = `Admin` (or any existing username), all other fields valid
2. Blur the username field / Save
**Expected Results**: Field-level `Already exists` error (or failure toast); user not created; list count unchanged
**Business Rule**: §9 unique violations; User model — userName unique
**Suggested Layer**: E2E

### TC-103: Password strength enforced
**Category**: Business Rule
**Preconditions**: Add User form open
**Steps**:
1. Enter password `weakpass` (no number) and matching confirm
2. Blur field
**Expected Results**: Inline error (e.g. `Your password must contain minimum 1 number`); Save blocked
**Business Rule**: Flow 2 step 5 — password must meet strength rules
**Suggested Layer**: E2E

### TC-104: Confirm Password must match Password
**Category**: Business Rule
**Preconditions**: Add User form open
**Steps**:
1. Password `Test@123`, Confirm Password `Test@124`
2. Blur / Save
**Expected Results**: Inline error `Passwords do not match` under Confirm Password; user not created
**Business Rule**: Flow 2 step 5
**Suggested Layer**: E2E

### TC-105: Disabled user cannot log in
**Category**: Business Rule
**Preconditions**: User created with Status = **Disabled**
**Steps**:
1. Logout
2. Attempt login with the disabled user's valid credentials
**Expected Results**: Login rejected (error message, e.g. `Account disabled` or `Invalid credentials`); stays on `/auth/login`
**Business Rule**: User model — `status: false = Disabled`
**Suggested Layer**: E2E

### TC-106: New user role governs menu visibility
**Category**: Business Rule
**Preconditions**: One new ESS user and one new Admin user created
**Steps**:
1. Login as new ESS user → record visible main-menu items
2. Login as new Admin user → record visible main-menu items
**Expected Results**: ESS sees only the ESS subset (no Admin/PIM/Recruitment); Admin sees full menu including Admin
**Business Rule**: §2 User Roles & Permissions
**Suggested Layer**: E2E

### TC-107: Duplicate username rejected at API level
**Category**: Business Rule
**Preconditions**: Username already exists
**Steps**:
1. `POST /api/v2/admin/users` with the existing username
**Expected Results**: 422/400 error response (not 200); no second user with the same name in `GET /admin/users`
**Business Rule**: username unique constraint
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-201: ESS user cannot open System Users page
**Category**: Security
**Preconditions**: Logged in as ESS
**Steps**:
1. Navigate directly to `/web/index.php/admin/viewSystemUsers`
**Expected Results**: Forbidden/credentials-required page or redirect; no users grid rendered; Admin menu absent from sidebar
**Business Rule**: Flow 9 — Cross-Role Security
**Suggested Layer**: E2E

### TC-202: ESS session cannot create users via API
**Category**: Security
**Preconditions**: Valid ESS session cookie + CSRF token
**Steps**:
1. `POST /api/v2/admin/users` with a valid body using the ESS session
**Expected Results**: `403 Unauthorized`; user not created
**Business Rule**: Flow 9 step 3
**Suggested Layer**: API

### TC-203: Unauthenticated request cannot create users
**Category**: Security
**Preconditions**: No session
**Steps**:
1. `POST /api/v2/admin/users` without cookies/token
**Expected Results**: 401/redirect to login; no user created
**Business Rule**: §1 — deep links force redirect to `/auth/login`
**Suggested Layer**: API

### TC-204: Password value is never echoed back
**Category**: Security
**Preconditions**: User created via UI or API
**Steps**:
1. Inspect `POST /admin/users` response body and `GET /admin/users/{id}` response
**Expected Results**: No `password` (plain or hash) field present in any response payload
**Business Rule**: User model — password stored bcrypt-hashed, never returned
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-301: All fields empty — required validation
**Category**: Negative
**Preconditions**: Add User form open
**Steps**:
1. Click **Save** without filling anything
**Expected Results**: `Required` shown under User Role, Employee Name, Username, Password, Confirm Password; form not submitted
**Business Rule**: §9 — required fields show `Required` on blur/submit
**Suggested Layer**: E2E

### TC-302: Username below minimum length
**Category**: Negative
**Preconditions**: Add User form open
**Steps**:
1. Enter Username = `abc` (3 chars), other fields valid
2. Blur / Save
**Expected Results**: Inline error `Should be at least 5 characters`; Save blocked
**Business Rule**: username 5–40 chars
**Suggested Layer**: E2E

### TC-303: Password below minimum length
**Category**: Negative
**Preconditions**: Add User form open
**Steps**:
1. Enter Password `Ab@1` (< 7 chars)
**Expected Results**: Inline error (`Should have at least 7 characters`); Save blocked
**Business Rule**: Edge values — password < 7 chars rejected
**Suggested Layer**: E2E

### TC-304: Free-typed employee name without selecting suggestion
**Category**: Negative
**Preconditions**: A real employee exists
**Steps**:
1. Type the employee's full name into the autocomplete but do NOT click the suggestion
2. Save
**Expected Results**: Field-level `Invalid` error — the hidden `empNumber` was never bound
**Business Rule**: §3 — empNumber FK must resolve to a real employee
**Suggested Layer**: E2E

### TC-305: API create with non-existent empNumber
**Category**: Negative
**Preconditions**: Admin session
**Steps**:
1. `POST /api/v2/admin/users` with `empNumber: 999999`
**Expected Results**: 422/400 validation error; no user created
**Business Rule**: empNumber FK constraint
**Suggested Layer**: API

### TC-306: API create with invalid userRoleId
**Category**: Negative
**Preconditions**: Admin session
**Steps**:
1. `POST /api/v2/admin/users` with `userRoleId: 99`
**Expected Results**: 422/400 validation error
**Business Rule**: userRoleId ∈ {1, 2}
**Suggested Layer**: API

---

## Edge Cases (TC-400–499)

### TC-401: Username at exact minimum (5 chars)
**Category**: Edge Case
**Preconditions**: Add User form open; 5-char username unused
**Steps**:
1. Create user with a 5-character username, all else valid
**Expected Results**: Saved successfully; appears in list
**Business Rule**: boundary — username min 5
**Suggested Layer**: E2E

### TC-402: Username at exact maximum (40 chars)
**Category**: Edge Case
**Preconditions**: Add User form open
**Steps**:
1. Create user with a 40-character username
**Expected Results**: Saved successfully
**Business Rule**: boundary — username max 40
**Suggested Layer**: E2E

### TC-403: Username over maximum (41 chars)
**Category**: Edge Case
**Preconditions**: Add User form open
**Steps**:
1. Enter a 41-character username
**Expected Results**: Inline error `Should not exceed 40 characters` (or input truncated to 40); Save with 41 chars blocked
**Business Rule**: boundary — username ≤ 40
**Suggested Layer**: E2E

### TC-404: Username uniqueness is case-insensitive
**Category**: Edge Case
**Preconditions**: User `admin`-cased variant exists (`Admin` seeded)
**Steps**:
1. Attempt to create user with username `ADMIN`
**Expected Results**: `Already exists` error (MySQL collation is case-insensitive)
**Business Rule**: §9 unique violations
**Suggested Layer**: E2E

### TC-405: Username with leading/trailing spaces
**Category**: Edge Case
**Preconditions**: Add User form open
**Steps**:
1. Enter Username = `  user01  `, save
2. Search list for `user01`
**Expected Results**: Value trimmed (saved as `user01`) or validation error — either way no whitespace-padded username persisted; login works with trimmed value
**Business Rule**: §9 validation conventions
**Suggested Layer**: E2E

### TC-406: Same employee can hold multiple user accounts
**Category**: Edge Case
**Preconditions**: Employee already linked to one user
**Steps**:
1. Create a second user (different username) for the same employee
**Expected Results**: Open Source allows it (no unique constraint on empNumber in the User table) — Save succeeds and both rows list the same employee name
**Business Rule**: User model — empNumber is FK, not unique
**Suggested Layer**: API

---

## UI State (TC-500–599)

### TC-501: Cancel returns to user list without creating
**Category**: UI State
**Preconditions**: Add User form open with fields partly filled
**Steps**:
1. Click **Cancel**
**Expected Results**: Back on `/admin/viewSystemUsers`; Records count unchanged; no new row
**Business Rule**: standard form behavior
**Suggested Layer**: E2E

### TC-502: Required asterisks and field set rendered
**Category**: UI State
**Preconditions**: Add User form open
**Steps**:
1. Inspect form
**Expected Results**: Heading `Add User`; labels User Role, Employee Name, Status, Username, Password, Confirm Password all visible; required fields marked `*`
**Business Rule**: Flow 2 form contract
**Suggested Layer**: E2E

### TC-503: Employee autocomplete shows hint and suggestions
**Category**: UI State
**Preconditions**: Add User form open; seeded employees present
**Steps**:
1. Observe placeholder `Type for hints...`
2. Type 2–3 letters of an existing employee
**Expected Results**: Suggestion dropdown appears with matching employees; clicking one fills the field
**Business Rule**: OXD autocomplete behavior
**Suggested Layer**: E2E

### TC-504: Grid skeleton loader resolves before rows assertable
**Category**: UI State
**Preconditions**: Navigating to `/admin/viewSystemUsers`
**Steps**:
1. Load the page; observe table area
**Expected Results**: Loading spinner/shimmer appears then disappears; afterwards Records count text and rows are stable
**Business Rule**: §10 — wait for `.oxd-loading-spinner` to disappear
**Suggested Layer**: E2E

### TC-505: Success toast auto-dismisses
**Category**: UI State
**Preconditions**: Saving a valid user
**Steps**:
1. Save; observe bottom-left/right toast
**Expected Results**: Green `.oxd-toast--success` with `Successfully Saved` appears and disappears within a few seconds
**Business Rule**: §10 toast conventions
**Suggested Layer**: E2E

---

## Coverage Summary
| Category | Count |
|----------|-------|
| Happy Path | 5 |
| Business Rules | 7 |
| Security | 4 |
| Negative | 6 |
| Edge Cases | 6 |
| UI State | 5 |
| **Total** | **33** |
