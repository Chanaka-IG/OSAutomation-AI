# OrangeHRM Open Source User Flows & Test Data

## Flow 1: Login & Role Recognition
1. Navigate to `/web/index.php/auth/login`
2. Enter `Username` and `Password`
3. Click **Login** → session cookie set → redirect to `/dashboard/index`
4. **Assertion**: the side panel reflects the user's role
   - Admin: 11+ menu items (Admin, PIM, Leave, Time, Recruitment, Performance, Directory, Maintenance, Claim, Buzz, My Info, Dashboard)
   - ESS: 6 menu items (My Info, Leave, Time, Performance, Directory, Dashboard, Buzz)
5. Logout via user dropdown (top-right) → redirect to `/auth/login`

## Flow 2: Create a New System User (Admin)
1. Login as Admin
2. Navigate to `Admin → User Management → Users` (`/admin/viewSystemUsers`)
3. Click **Add**
4. Pick **User Role** = ESS, fill **Employee Name** autocomplete (must already exist as a PIM employee), pick **Status** = Enabled
5. Set **Username** (5–40 chars, unique), **Password**, **Confirm Password** (must meet strength rules)
6. Click **Save**
7. **Assertion**: success toast `"Successfully Saved"`; new row appears in users table; total Records count increments by 1

## Flow 3: Add an Employee (PIM)
1. Login as Admin
2. Navigate to `PIM → Add Employee` (`/pim/addEmployee`)
3. Fill **First Name**, **Last Name** (mandatory); optionally **Middle Name** and **Employee ID** (leave blank to auto-generate)
4. (Optional) Toggle **Create Login Details** → reveals username/password fields
5. Click **Save** → page navigates to that employee's Personal Details
6. **Assertion**: URL becomes `/pim/viewPersonalDetails/empNumber/<n>`; the new employee's full name appears in the breadcrumb avatar area
7. Verify list: navigate back to `/pim/viewEmployeeList`, search by name, confirm row exists

## Flow 4: Apply Leave & Manage Approval
1. **ESS user**: navigate to `My Info → ... → no, /leave/applyLeave`
2. Select **Leave Type** (must have a non-zero balance)
3. Pick **From Date** and **To Date** (To Date >= From Date)
4. **Assertion**: live `Balance` widget updates to show the requested days
5. Add optional **Comment** → click **Apply** → toast `"Successfully Saved"`
6. Verify: navigate to `My Info → ... no, /leave/viewMyLeaveList` → request appears with status **Pending Approval**
7. **Logout, login as Supervisor** of that employee
8. Navigate to `/leave/viewLeaveList`, search with **Show Leave with Status = Pending Approval**
9. Find the request → row Action dropdown → select **Approve** → status changes to **Scheduled**
10. **Negative case**: re-apply the same dates → expect `"Overlapping leave requests found"` validation toast

## Flow 5: Submit & Approve a Timesheet
1. **ESS user**: navigate to `/time/viewMyTimesheet`
2. Use period navigation `<` / `>` to choose the right week (default: current week)
3. Click **Edit** → existing rows become editable
4. Click **+ Add** → new row appears
5. Pick **Project**, **Activity**; enter hours per day in `HH:MM` format (e.g. `08:00`)
6. Click **Save** → toast `"Successfully Saved"`
7. Click **Submit** → state badge changes to **Submitted**
8. **Logout, login as Supervisor**
9. Navigate to `Time → Timesheets → Employee Timesheets` (`/time/viewEmployeeTimesheet`)
10. Select the employee → open the **Submitted** timesheet → click **Approve** (or **Reject** with mandatory comment)
11. **Assertion**: state badge becomes **Approved**; total approved hours reflect in `Time → Reports`

## Flow 6: Recruitment — Create Vacancy → Hire Candidate
1. Login as Admin
2. Navigate to `Recruitment → Vacancies` → click **Add**
3. Fill **Name** (unique), **Job Title** (must exist), **Hiring Manager** (employee autocomplete), **Number of Positions** (>=1); toggle **Active** and optionally **Publish in RSS Feed / Job site**
4. Click **Save** → toast `"Successfully Saved"`
5. Navigate to `Recruitment → Candidates` → click **Add**
6. Fill First/Last/Email, pick the new **Vacancy**, set **Date of Application**, tick **Consent to keep data**
7. Click **Save** → candidate profile opens with status **Application Initiated**
8. Click action button → **Shortlist** → confirm note → status moves to **Shortlisted**
9. Repeat through pipeline: **Schedule Interview → Mark Interview Passed → Offer Job → Hire**
10. On Hire, OrangeHRM auto-creates a PIM Employee record
11. **Assertion**: navigate to PIM Employee List → search by candidate name → record exists with auto-generated Employee ID

## Flow 7: Performance Review Cycle
1. Login as Admin
2. Navigate to `Performance → Configure → KPIs` → ensure the employee's Job Title has KPIs with weights summing to 100
3. Navigate to `Performance → Manage Reviews → Manage Reviews` → click **Add**
4. Pick **Employee**, **Supervisor Reviewer**, **Review Period Start/End**, **Due Date**
5. Save → review created with state **Inactive**
6. Click **Activate** action → state → **Activated**
7. Logout, login as the assigned **Supervisor**
8. Navigate to `Performance → My Reviews → Reviews to Complete`
9. Open the review → enter KPI ratings (1–5) + comments → click **Save Draft** then **Complete**
10. **Assertion**: state → **Completed**; the review is locked and cannot be edited

## Flow 8: My Info (ESS Self-Service)
1. Login as ESS user (e.g. an employee account created in Flow 2)
2. Navigate to `My Info` (`/pim/viewPersonalDetails/empNumber/<self>`)
3. Update Personal Details (e.g. Marital Status, Nationality) → click **Save** under that section
4. Visit each sub-page from the in-profile side menu: Contact Details, Emergency Contacts, Dependents, Immigration, Job (read-only for ESS), Qualifications, Memberships
5. **Assertion**: changes saved on each page show their own toast; navigating away and back retains the saved values
6. **Negative case**: attempt to navigate directly to `/pim/viewPersonalDetails/empNumber/<OTHER_USER>` → returns 403 / `"Unauthorized"` page

## Flow 9: Cross-Role Security (ESS attempting Admin actions)
1. Login as an ESS user
2. Attempt direct URL `/admin/viewSystemUsers` → app renders an empty page or redirects with a forbidden message (no left-menu access in the first place)
3. Attempt API call `GET /api/v2/admin/users` with the ESS session → expect `403 Unauthorized`
4. Attempt `GET /api/v2/pim/employees/<other empNumber>/personal-details` → `403 Unauthorized`
5. **Assertion**: zero data leak; no employee names, no salaries, no leave requests of others returned

## Flow 10: Bulk Leave Entitlement Assign (Admin)
1. Login as Admin
2. Navigate to `Leave → Entitlements → Add Entitlements`
3. Toggle to **Multiple Employees** mode
4. Filter by **Location** or **Sub Unit** (or both); pick **Leave Type**; pick **Leave Period**; enter **Entitlement** (e.g. 14)
5. Click **Save** → confirmation modal showing affected employee count → confirm
6. **Assertion**: toast `"Successfully Saved"`; navigating to any affected employee's `/leave/viewLeaveEntitlements/empNumber/<n>` shows the new entitlement row

---

## Test Data

### Default Demo Credentials (`opensource-demo.orangehrmlive.com`)
| Role             | Username                         | Password                                       |
|------------------|----------------------------------|------------------------------------------------|
| Admin            | `Admin`                          | `admin123`                                     |
| ESS (sample)     | varies per reset, e.g. `linda.anderson` | (set via Admin or use password reset) — see note below |

> The demo resets every 24 hours. The Admin/admin123 pair is guaranteed; specific ESS users are NOT. Tests should either:
> - Create their own ESS user as part of setup (Flow 2), or
> - Use the **Admin → User Management → Users** list to pick an existing ESS user at runtime and reset their password.

### Seeded Employees (typically present on demo reset)
- Paul Collings — Director / IT
- Russel Hudson — IT Specialist
- Linda Anderson — Account Assistant
- Lisa Andrews — HR Administrator
- Sales / Engineering sample employees in various subunits
- Approximate count: **~24 sample employees** after each reset

### Recommended Local Test Data (when running against your own install)
| Entity            | Suggested seed values                                          |
|-------------------|----------------------------------------------------------------|
| Job Titles        | QA Engineer, Software Engineer, HR Manager, Sales Executive    |
| Employment Status | Full-Time Permanent, Part-Time Contract, Freelance             |
| Subunits          | Engineering, Sales, HR, Finance, Operations                    |
| Locations         | Colombo HQ, Mumbai Branch, Remote                              |
| Leave Types       | Annual (14d), Casual (7d), Sick (10d), Maternity (84d), Bereavement (3d) |
| Holidays          | New Year, May Day, Independence Day, Christmas                 |
| Work Week         | Mon–Fri full, Sat half (or Sat/Sun off — common config)        |

### Edge / Boundary Test Values
| Field             | Boundary cases                                                  |
|-------------------|-----------------------------------------------------------------|
| First/Last Name   | 1 char (rejected, min 2), 30 chars (max), 31 chars (rejected)   |
| Username          | 5 chars (min), 40 chars (max), `Admin` (duplicate → error)     |
| Password          | < 7 chars rejected, no upper-case rejected, valid: `Test@123`  |
| Employee ID       | Empty (auto), explicit value (must be unique)                  |
| Leave date range  | `fromDate > toDate` rejected; spanning weekend computes excluded days |
| Timesheet hours   | `0:00`, `24:00`, `25:00` (rejected), negative (rejected)       |
| KPI weights       | Sum must equal exactly 100; 99 or 101 rejected                 |
| Vacancy positions | 0 rejected, 1 minimum, large values accepted                   |

### Useful "Stable" URLs for Test Anchors
- `/web/index.php/auth/login`
- `/web/index.php/dashboard/index`
- `/web/index.php/admin/viewSystemUsers`
- `/web/index.php/pim/viewEmployeeList`
- `/web/index.php/pim/addEmployee`
- `/web/index.php/leave/applyLeave`
- `/web/index.php/leave/viewLeaveList`
- `/web/index.php/time/viewMyTimesheet`
- `/web/index.php/recruitment/viewCandidates`
- `/web/index.php/performance/searchEvaluatePerformanceReview`
