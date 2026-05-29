# OrangeHRM Open Source Business Rules

## 1. Authentication & Session
- Login URL: `/web/index.php/auth/login`. Successful login redirects to `/web/index.php/dashboard/index`.
- Default credentials on the public demo: `Admin` / `admin123`.
- Wrong username or wrong password BOTH return the same generic error: `"Invalid credentials"` (no enumeration leak).
- Session is server-side, identified by the `orangehrm` cookie. Idle timeout defaults to **30 minutes**; absolute session lifetime is **120 minutes**.
- A hidden `_token` CSRF field is rendered into every form. Automation that posts directly (not through the visible button) must scrape and resubmit it.
- After logout (or session timeout), any deep link forces redirect to `/auth/login?next=<original-url>`. Tests must handle this redirect explicitly.

## 2. User Roles & Permissions
- Three role types: **Admin** (`userRoleId = 1`), **ESS** (`userRoleId = 2`), and the implicit **Supervisor** role (an ESS user who has subordinates via `Employee.supervisorId`).
- Admin sees the full main menu (Admin, PIM, Leave, Time, Recruitment, Performance, Dashboard, My Info, Directory, Maintenance, Claim, Buzz).
- ESS sees only **My Info, Leave, Time, Performance, Directory, Dashboard, Buzz** by default — and even within those, only their own data.
- Supervisor additionally sees subordinates' leave requests, timesheets, performance reviews, and the **"Subunit"** filter on PIM Employee List.
- Permissions are governed by **Data Group Permissions** (Admin → User Management → User → ... no, actually **Admin → Configuration → API → Data Groups** in the backend). Tests should not assume permission strings — verify via UI menu visibility.

## 3. Employee Lifecycle (PIM)
- An employee record MUST exist before a system user can be created for them (`User.empNumber` is non-nullable).
- `firstName` and `lastName` are mandatory; `middleName` is optional.
- `employeeId` is auto-generated as an incrementing string if left blank on creation. If supplied, it must be **unique across all employees** (including terminated and purged).
- Once created, the employee number (`empNumber`) is immutable and is the FK target for nearly every other module (leave, timesheets, candidates-converted-to-employees, reviews).
- **Termination** does not delete the employee — it sets `terminationId` and `terminationDate`. Terminated employees:
  - Disappear from default Employee List (filter "Include: Current and Past Employees" reveals them).
  - Cannot log in (their User record is auto-disabled).
  - Are preserved as FK references in historical leave, timesheets, and reviews.
- **Purge** (Admin only, from PIM) permanently anonymizes personal data but retains aggregate counts.
- **Employee details update** Can pick an employee from the employee list. It will be redirected to the Employee details update section. There user can update employee's data based on multiple sections from the left side bar.
- **Report - PIM** By default there is a report called "PIM Sample Report". 
  - Can add new report using Add button. 
  - Following are the fields when adding a report. **Report Name** - required. **Selection Criteria** - non required dropdown. Once select a option from the dropdown its needed to click on Add icon to add. **Include** - non required. **Select Display Field Group** - non required dropdown. **Select Display Field** - non required dropdown. Once select a option from the dropdown its needed to click on Add icon to add.
  - In order to view report data, Need to click on the file text icon.

## 4. Leave Workflow
- A leave request flows: **Pending Approval → Scheduled → Taken** (with **Rejected** and **Cancelled** as terminal off-ramps).
- Status codes are integers as stored in the DB: `-1 Rejected, 0 Cancelled, 1 Pending Approval, 2 Scheduled, 3 Taken` — useful when asserting on API responses.
- Leave **balance** is computed as: `entitlement - (scheduled + taken + pending)`. The "Pending Approval" portion is held in escrow — it is subtracted from balance immediately on submission, not at approval.
- **Overlapping leave**: applying for dates that overlap an existing non-cancelled request returns `"Overlapping leave requests found"` (400). This check is per leave type AND across leave types.
- A leave request that spans non-working days (weekend, holidays) computes `numberOfDays` excluding those days according to the **Work Week** (Admin → Job → Work Shifts / Configuration → Leave → Work Week).
- Half-day leave is supported via the **Partial Days** dropdown: `None / All Days / Start Day Only / End Day Only / Start and End Day`.
- Self-approval is blocked by default — a Supervisor cannot approve their own leave even if they have approval rights elsewhere.

## 5. Leave Types & Entitlements
- Leave Types are global (Admin → Leave → Leave Types). Default seeded types on the demo: **CAN - Bereavement, CAN - Casual, CAN - Matrimonial, US - FMLA, US - Vacation** (varies by demo state).
- Entitlement must be **assigned per employee per leave type per leave period** (Leave → Entitlements → Add). Without an entitlement, balance is `0.00` and any leave application is rejected with `"Leave balance exceeded"`.
- **Bulk Assign** lets Admin push the same entitlement to multiple employees by Location / Subunit / Job Title filter.
- Leave Period is annual by default. Roll-over (carry-forward) is OFF by default in Open Source — leftover balance evaporates at period end unless the leave type is configured otherwise.

## 6. Assign leaves for employees
- Only Admin and the supervisors can assign leaves for employees. Admin can assign leave for every employees. Suprvisors can only assign leaves for their respective subordinates.
- In order to assign leaves, Particular employee should have positive entitlements for the relevant leave type.
- Can assign leaves with different type of Durations. **Full day** **Half day - Morning** **Half day - Afternoon** **Specify time**
- For the **Specify time** **From** and **To** times also need to be added


## 6. Timesheet Workflow
- One timesheet per employee per week. The week-start day is configurable (default: Monday) via Admin → Configuration → ... actually via the `Start Day` of the timesheet definition.
- States: `NOT_SUBMITTED → SUBMITTED → APPROVED | REJECTED`. Only `SUBMITTED` and `APPROVED` count toward project/activity reports.
- An employee edits a timesheet by adding rows of `Project / Activity / Hours-per-day`. Hours per day per row must be `>= 0` and `<= 24`.
- **Reject** moves the timesheet back to `NOT_SUBMITTED` (the employee can edit and resubmit). A rejection comment is mandatory.
- **Attendance records** (Punch In / Punch Out) are independent from timesheets in Open Source — they live in a separate table and do not auto-fill timesheet rows.

## 7. Recruitment Pipeline
- A **Vacancy** must be created (Admin or hiring manager) before candidates can be applied against it.
- A Vacancy is tied to exactly one **Job Title** (which must already exist in Admin → Job → Job Titles) and one **Hiring Manager** (must be an existing Employee).
- Candidate status transitions are linear-ish:
  ```
  APPLICATION_INITIATED
        ↓
  SHORTLISTED ── (reject) ─→ REJECTED
        ↓
  INTERVIEW_SCHEDULED ── (fail) ─→ INTERVIEW_FAILED
        ↓
  INTERVIEW_PASSED
        ↓
  JOB_OFFERED ── (decline) ─→ OFFER_DECLINED
        ↓
  HIRED  (triggers Employee record creation)
  ```
- Moving a candidate to `HIRED` opens a confirmation dialog that auto-creates a PIM Employee record using the candidate's first/last name/email. The candidate row is then "linked" to the new `empNumber`.
- Once `HIRED`, the candidate can no longer be edited from Recruitment — further changes happen on the PIM record.
- Candidates have a **mandatory `consentToKeepData`** checkbox (GDPR). Without it, the candidate record is purged after the configured retention window.

## 8. Performance Reviews
- A **Performance Tracker** is a continuous-feedback log assigned by a reviewer to an employee.
- A **Performance Review** is a scheduled, formal evaluation with:
  - Review Period (start + end date)
  - Job Title (auto-filled from employee, used to pull KPIs)
  - Supervisor reviewer (mandatory)
  - Optional additional reviewers
  - Set of KPIs with weight (must sum to **100**) and a 1–5 rating scale
- Review states: `INACTIVE → AC/home/administrator/Downloads/OSAutomationAI
TIVATED → IN_PROGRESS → COMPLETED`. Reviews cannot be edited once `COMPLETED`.
- **KPI weights**: assigning KPIs to a Job Title requires the sum of weights to equal exactly 100; otherwise the form blocks save with `"Total weight should be 100"`.

## 9. Required Field Validation (Global)
OrangeHRM uses consistent inline validation. Common rules tests should assert:
- **Required text fields** show `"Required"` immediately below the OXD input when blurred empty.
- **Length-limited fields** show `"Should be less than N characters"` (varies: 30 for name fields, 100 for email, 250 for textareas).
- **Numeric fields** show `"Should be a number"` or `"Should be greater than 0"`.
- **Date fields** require `YYYY-MM-DD` format in API; the UI date picker accepts the locale format configured in Admin → Localization (default `Y-m-d`).
- **Unique violations** (duplicate username, duplicate employee ID, duplicate job title) surface as a toast/snackbar in the bottom-right: `"Already exists"` or field-level `"Already exists"`.

## 10. CSRF, Toasts & Loading States
- Every state-changing UI action triggers a green/red **toast** in the bottom-right via the OXD toast component. Tests should wait on this toast (not on URL change) to assert success.
  - Success: `"Successfully Saved"` / `"Successfully Updated"` / `"Successfully Deleted"`.
  - Failure: red toast with a specific message (e.g., `"Failed to Save: Already exists"`).
- Tables are loaded asynchronously and show a **shimmer/skeleton loader** for ~200–800ms. Tests should wait for the loader (`.oxd-loading-spinner`) to disappear before asserting on row count.
- Pagination defaults to **50 rows per page**. The page-size selector offers 10/20/50.

## 11. Soft Delete vs Hard Delete
- **PIM employees** are soft-deleted via Termination; only Purge is permanent.
- **System users**: hard-deleted from `Admin → User Management → Users`. Deleting a user does NOT delete the linked Employee.
- **Job Titles, Locations, Pay Grades, Employment Statuses**: hard-deleted, but deletion is BLOCKED if any Employee or Vacancy still references them (`"This record is in use and cannot be deleted"`).
- **Leave Types**: soft-deleted (flagged `deleted = 1`). The leave type vanishes from dropdowns but historical leave requests retain it.

## 12. Public Demo Constraints (opensource-demo.orangehrmlive.com)
- The public demo at `opensource-demo.orangehrmlive.com` is **read-only for destructive actions**: DELETE requests are silently rejected or return `403`. POST/PUT for most endpoints DO work for the duration of a session.
- The demo **resets every 24 hours**. Tests should not assume that records created in a previous run still exist.
- Default seeded employees (Linda Anderson, Paul Collings, Russel Hudson, etc.) and ~24 sample users are present on each reset.
