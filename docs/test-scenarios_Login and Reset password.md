# Test Scenarios — Login and Reset Password

**Feature**: Authentication — Login (`/web/index.php/auth/login`) and the "Forgot your password?" / Reset Password flow (`/web/index.php/auth/requestPasswordResetCode`).
**Domain references**: User Flows — Flow 1 (Login & Role Recognition), Flow 7 (ESS login). Business Rules §1 (Authentication & Session), §9 (Required Field Validation), §10 (CSRF/Toasts). API Reference — Authentication table (`POST /auth/validate`, `GET /auth/logout`). UI Selectors — Login Page.
**API**: `POST /web/index.php/auth/validate` (`username, password, _token`) → 302 redirect; `GET /web/index.php/auth/logout` → 302 → `/auth/login`.

> **Live verification (2026-06-25, `automationtest-os-kord.orangehrm.com`, OrangeHRM OS 5.8):**
> - Valid login (`admin`/`admin@OHRM123`) → redirect to `/dashboard/index`.
> - Wrong credentials → red alert banner `.oxd-alert-content-text` reading **"Invalid credentials"** (same text for wrong username and wrong password — no user-enumeration leak).
> - Empty submit → field-level **"Required"** under both Username and Password (`.oxd-input-field-error-message`); no request sent.
> - **"Forgot your password?"** link navigates to `/auth/requestPasswordResetCode`. On THIS instance email is not configured, so the page shows **"The OrangeHRM system is not configured to receive email notifications. Please contact your OrangeHRM administrator to reset your password"** with a **"Click here to go back to login page"** link. There is **no** Username field and **no** "Reset Password" submit button on this instance.
> - "Click here" → `/auth/login`. `GET /auth/logout` → `/auth/login`. Deep link while logged out → `/auth/login`.

---

## Happy Path (TC-001–099)

### TC-001: Admin logs in with valid credentials
**Category**: Happy Path
**Preconditions**: Valid Admin account (`admin` / configured password); logged out
**Steps**:
1. Navigate to `/web/index.php/auth/login`
2. Enter valid Username and Password
3. Click **Login**
**Expected Results**: Session cookie set; redirect away from `/auth/login` to `/dashboard/index`; no error banner shown
**Business Rule**: §1 — successful login redirects to dashboard
**Suggested Layer**: E2E

### TC-002: Admin user sees the full (Admin) side menu after login
**Category**: Happy Path
**Preconditions**: Logged in as Admin
**Steps**:
1. Log in as Admin
2. Inspect the left side menu
**Expected Results**: Admin-scoped menu present (includes **Admin** and **PIM** items); 11+ menu items
**Business Rule**: Flow 1 — side panel reflects the user's role
**Suggested Layer**: E2E

### TC-003: ESS user logs in and sees ESS-scoped menu
**Category**: Happy Path
**Preconditions**: An enabled ESS user exists (env-configured or seeded)
**Steps**:
1. Log in with ESS credentials
2. Inspect the side menu
**Expected Results**: Redirect to `/dashboard/index`; ESS-scoped menu (no **Admin** item)
**Business Rule**: Flow 1 / Flow 7 — role-based menu
**Suggested Layer**: E2E

### TC-004: Logout returns the user to the login page
**Category**: Happy Path
**Preconditions**: Logged in
**Steps**:
1. Open the user dropdown (top-right) and click **Logout** (or `GET /auth/logout`)
**Expected Results**: Redirect to `/auth/login`; session invalidated
**Business Rule**: §1 — logout → `/auth/login`
**Suggested Layer**: E2E

### TC-005: "Forgot your password?" link opens the Reset Password page
**Category**: Happy Path
**Preconditions**: On the login page
**Steps**:
1. Click **Forgot your password?**
**Expected Results**: Navigate to `/auth/requestPasswordResetCode`; heading **"Reset Password"** rendered
**Business Rule**: Login page — forgot-password entry point
**Suggested Layer**: E2E

### TC-006: From Reset Password page, "Click here" returns to login
**Category**: Happy Path
**Preconditions**: On `/auth/requestPasswordResetCode`
**Steps**:
1. Click **"Click here"** (to go back to login page)
**Expected Results**: Navigate back to `/auth/login` with the login form visible
**Business Rule**: Reset Password page back-link behavior
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Reset Password page reflects email-not-configured state on this instance
**Category**: Business Rule
**Preconditions**: SMTP/email not configured on the instance (current state)
**Steps**:
1. From login, click **Forgot your password?**
**Expected Results**: Page shows **"The OrangeHRM system is not configured to receive email notifications. Please contact your OrangeHRM administrator to reset your password"**; no Username input and no "Reset Password" submit button are rendered
**Business Rule**: Password reset depends on email configuration; without it, OrangeHRM blocks the self-service reset flow
**Suggested Layer**: E2E

### TC-101: Wrong username and wrong password produce the identical error (no enumeration)
**Category**: Business Rule
**Preconditions**: Logged out
**Steps**:
1. Submit a non-existent username with any password → note the error
2. Submit a valid username with a wrong password → note the error
**Expected Results**: Both show the same **"Invalid credentials"** banner; neither reveals whether the username exists
**Business Rule**: §1 — generic error prevents user enumeration
**Suggested Layer**: E2E

### TC-102: Disabled account is rejected with a distinct message
**Category**: Business Rule
**Preconditions**: A user whose Status = Disabled, with otherwise valid credentials
**Steps**:
1. Attempt to log in with the disabled user's valid credentials
**Expected Results**: Login rejected; alert **"Account disabled"** in `.oxd-alert-content-text`; remains on `/auth/login`
**Business Rule**: §1 — disabled users get "Account disabled", not "Invalid credentials"
**Suggested Layer**: E2E

### TC-103: Login is case-sensitive on the password
**Category**: Business Rule
**Preconditions**: Valid account with a known password
**Steps**:
1. Submit the correct username with the password in a different letter case
**Expected Results**: Rejected with **"Invalid credentials"**
**Business Rule**: §1 — credentials validated exactly
**Suggested Layer**: E2E

### TC-104: Login via the validate endpoint (form POST) succeeds with a valid CSRF token
**Category**: Business Rule
**Preconditions**: Fresh `/auth/login` page providing the hidden `_token`
**Steps**:
1. Scrape `_token` from the login form
2. `POST /web/index.php/auth/validate` with `username`, `password`, `_token`
**Expected Results**: 302 redirect toward `/dashboard/index`; session cookie issued
**Business Rule**: §1, §10 — server-rendered form POST with CSRF token
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-200: Unauthenticated deep link redirects to login
**Category**: Security
**Preconditions**: Logged out / no session
**Steps**:
1. Navigate directly to a protected page (e.g. `/pim/viewEmployeeList`)
**Expected Results**: Redirect to `/auth/login`; protected content never rendered
**Business Rule**: §1 — deep links force redirect to login when unauthenticated
**Suggested Layer**: E2E

### TC-201: Accessing dashboard after logout redirects to login
**Category**: Security
**Preconditions**: User logs in, then logs out
**Steps**:
1. After logout, navigate to `/dashboard/index`
**Expected Results**: Redirect to `/auth/login` (session no longer valid)
**Business Rule**: §1 — session invalidated on logout
**Suggested Layer**: E2E

### TC-202: Login form POST without a CSRF token is rejected
**Category**: Security
**Preconditions**: Logged out
**Steps**:
1. `POST /auth/validate` with valid `username`/`password` but missing or invalid `_token`
**Expected Results**: Request rejected (invalid CSRF token / not authenticated); no session granted
**Business Rule**: §10 — CSRF token required on form POST
**Suggested Layer**: API

### TC-203: Error banner does not echo the submitted password
**Category**: Security
**Preconditions**: Logged out
**Steps**:
1. Submit wrong credentials
2. Inspect the page/DOM for the submitted password value
**Expected Results**: Password is not reflected in the error banner or page text
**Business Rule**: §1 — no sensitive data leakage on failed login
**Suggested Layer**: E2E

### TC-204: Credentials are not passed in the URL query string
**Category**: Security
**Preconditions**: Logged out
**Steps**:
1. Submit the login form and inspect the resulting URL/network request method
**Expected Results**: Credentials submitted via POST body, never appended to the URL
**Business Rule**: §1 — form POST authentication
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Wrong password shows "Invalid credentials"
**Category**: Negative
**Preconditions**: Valid username known
**Steps**:
1. Enter valid username with an incorrect password
2. Click **Login**
**Expected Results**: Remains on `/auth/login`; **"Invalid credentials"** alert banner shown
**Business Rule**: §1
**Suggested Layer**: E2E

### TC-301: Non-existent username shows "Invalid credentials"
**Category**: Negative
**Preconditions**: Logged out
**Steps**:
1. Enter a random non-existent username and any password
2. Click **Login**
**Expected Results**: **"Invalid credentials"** alert banner; no redirect
**Business Rule**: §1 — no enumeration
**Suggested Layer**: E2E

### TC-302: Empty username and password show "Required"
**Category**: Negative
**Preconditions**: Login page, both fields blank
**Steps**:
1. Click **Login** without entering anything
**Expected Results**: Field-level **"Required"** under both Username and Password; no `/auth/validate` request issued; no redirect
**Business Rule**: §9 — required-field validation client-side
**Suggested Layer**: E2E

### TC-303: Only username filled → password "Required"
**Category**: Negative
**Preconditions**: Login page
**Steps**:
1. Fill Username only, leave Password blank, click **Login**
**Expected Results**: **"Required"** under Password; no submission
**Business Rule**: §9
**Suggested Layer**: E2E

### TC-304: Only password filled → username "Required"
**Category**: Negative
**Preconditions**: Login page
**Steps**:
1. Fill Password only, leave Username blank, click **Login**
**Expected Results**: **"Required"** under Username; no submission
**Business Rule**: §9
**Suggested Layer**: E2E

### TC-305: Whitespace-only credentials are rejected
**Category**: Negative
**Preconditions**: Logged out
**Steps**:
1. Enter spaces only into Username and Password, click **Login**
**Expected Results**: Login fails (either "Required"/validation or "Invalid credentials"); no successful redirect
**Business Rule**: §1, §9
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Leading/trailing spaces around a valid username are not trimmed into a match
**Category**: Edge Case
**Preconditions**: Valid account
**Steps**:
1. Enter the valid username padded with leading/trailing spaces, correct password
2. Click **Login**
**Expected Results**: Behavior is consistent and deterministic — login is rejected with **"Invalid credentials"** (username not silently trimmed). Document actual behavior.
**Business Rule**: §1 — exact credential matching
**Suggested Layer**: E2E

### TC-401: Very long username input is handled gracefully
**Category**: Edge Case
**Preconditions**: Logged out
**Steps**:
1. Enter a 200+ character username with any password, click **Login**
**Expected Results**: No crash; **"Invalid credentials"** banner; page stays responsive
**Business Rule**: §1 — input length resilience
**Suggested Layer**: E2E

### TC-402: Special characters / SQL-like input in username is safely rejected
**Category**: Edge Case
**Preconditions**: Logged out
**Steps**:
1. Enter `' OR '1'='1` as username with any password, click **Login**
**Expected Results**: **"Invalid credentials"**; no authentication bypass; no server error
**Business Rule**: §1 — parameterized auth, injection-safe
**Suggested Layer**: E2E

### TC-403: Submitting login with Enter key behaves like clicking Login
**Category**: Edge Case
**Preconditions**: Valid credentials entered
**Steps**:
1. Type valid credentials, press **Enter** in the Password field
**Expected Results**: Same successful login → redirect to `/dashboard/index`
**Business Rule**: Form submit on Enter
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Login page renders all expected controls
**Category**: UI State
**Preconditions**: Navigate to `/auth/login`
**Steps**:
1. Load the login page
**Expected Results**: Username field, Password field (masked), **Login** button, and **"Forgot your password?"** link all visible; no error banner initially
**Business Rule**: Login page composition
**Suggested Layer**: E2E

### TC-501: Password field masks input
**Category**: UI State
**Preconditions**: Login page
**Steps**:
1. Type into the Password field
**Expected Results**: Input rendered as a masked password field (`type="password"`)
**Business Rule**: Credential confidentiality
**Suggested Layer**: E2E

### TC-502: Error banner clears on a subsequent successful login
**Category**: UI State
**Preconditions**: An "Invalid credentials" banner is showing from a failed attempt
**Steps**:
1. After a failed attempt, enter valid credentials and click **Login**
**Expected Results**: Successful redirect to `/dashboard/index`; the error banner is gone
**Business Rule**: §1 — banner is tied to the failed attempt only
**Suggested Layer**: E2E

### TC-503: Reset Password page shows heading and back-link, hides login form
**Category**: UI State
**Preconditions**: On `/auth/requestPasswordResetCode`
**Steps**:
1. Inspect the page
**Expected Results**: **"Reset Password"** heading and **"Click here"** back-link present; the username/password login form is not shown
**Business Rule**: Reset Password page composition (email-not-configured state on this instance)
**Suggested Layer**: E2E
