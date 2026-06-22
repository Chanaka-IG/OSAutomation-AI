# Test Scenarios — Performance → Manage Reviews

**Feature:** Performance → Manage Reviews (an Admin creates, searches, activates, and manages formal performance review records; the assigned **Supervisor Reviewer** later evaluates them via *My Reviews* / *Employee Reviews*)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8), live via Playwright MCP, 2026-06-22

**Topbar (Performance module):** `Configure` · **`Manage Reviews`** (dropdown → *Manage Reviews*, *My Reviews*, *Employee Reviews*) · `My Trackers` · `More`
**Routes (Admin):**
- Manage Reviews list: `/web/index.php/performance/searchPerformanceReview` (heading **"Manage Performance Reviews"**)
- Add / Edit review: `/web/index.php/performance/saveReview` (heading **"Add Review"**)
- Employee Reviews (review evaluation list): `/web/index.php/performance/searchEvaluatePerformanceReview` (heading **"Employee Reviews"**)
**API:**
- List: `GET /api/v2/performance/manage/reviews?limit=50&offset=0&sortField=performanceReview.statusId&sortOrder=ASC&fromDate=&toDate=&includeEmployees=onlyCurrent` (+ filter params: employee, jobTitleId, statusId, reviewerEmpNumber)
- Create/Update: `POST/PUT /api/v2/performance/manage/reviews` (payload: empNumber, reviewerEmpNumber, reviewPeriodStart, reviewPeriodEnd, dueDate)
- Employee autocomplete: `GET /api/v2/pim/employees?nameOrId=`
- **Reviewer autocomplete: `GET /api/v2/performance/supervisors?nameOrId=&empNumber={empNumber}`** — scoped to the selected employee's supervisors
- Evaluation list: `GET /api/v2/performance/employees/reviews`

**Add Review form fields (all required):** Employee Name\*, Supervisor Reviewer\*, Review Period Start Date\*, Review Period End Date\*, Due Date\*. Buttons: **Cancel / Save / Activate**.
**Review states (live "Review Status" dropdown):** `Inactive → Activated → In Progress → Completed`. **Save** creates an *Inactive* review; **Activate** creates and immediately moves it to *Activated*. A *Completed* review is locked (cannot be edited).

> **Corrections to the domain skill (verified live 2026-06-22):**
> 1. The Manage Reviews search form has **no Sub Unit filter**; it exposes **Employee Name, Job Title, Review Status, Include, Reviewer, From Date, To Date**.
> 2. **Review Status** and **Include** are single-select **dropdowns** — not the "Include checkboxes (Activated/In Progress/Completed)" the skill describes. `Include` defaults to **"Current Employees Only"**.
> 3. The **Add Review form has no Job Title field** (the skill says it auto-fills); Job Title appears only as a *search filter*. There is **no "additional reviewers"** field — exactly **one Supervisor Reviewer**.
> 4. The Supervisor Reviewer list is **restricted to the selected employee's supervisor(s)**; an employee with no supervisor returns **"No Records Found"** and cannot be assigned a reviewer (creation blocker).
> 5. KPI weights "must sum to 100" is **Enterprise-only** and does not apply to Open Source review evaluation (Open Source KPIs use a Min/Max rating scale, not weights — see `performance-kpi-config` memory).

---

## Happy Path (TC-001–099)

### TC-001: Admin creates a review (saved as Inactive)
**Category**: Happy Path
**Preconditions**: Admin login; target employee exists **and has at least one supervisor**.
**Steps**: 1) Performance → Manage Reviews → **Add**. 2) Select **Employee Name**. 3) Select **Supervisor Reviewer** (from the employee's supervisors). 4) Enter **Review Period Start Date**, **End Date**, **Due Date**. 5) Click **Save**.
**Expected Results**: Success toast `"Successfully Saved"`; returns to the list; new row appears with status **Inactive**.
**Business Rule**: A performance review is a scheduled formal evaluation with a period, due date, and a mandatory supervisor reviewer.
**Suggested Layer**: E2E

### TC-002: Admin creates and immediately activates a review
**Category**: Happy Path
**Preconditions**: As TC-001.
**Steps**: 1) Add → fill all 5 fields. 2) Click **Activate** (instead of Save).
**Expected Results**: Toast `"Successfully Saved"`; row created with status **Activated** (skips Inactive).
**Business Rule**: `Inactive → Activated` transition; Activate is available directly from the Add form.
**Suggested Layer**: E2E

### TC-003: Admin activates an existing Inactive review from the list
**Category**: Happy Path
**Preconditions**: An **Inactive** review exists.
**Steps**: 1) Open/edit the Inactive review. 2) Click **Activate**.
**Expected Results**: Status changes to **Activated**; the assigned reviewer can now see it under *Employee Reviews*/*My Reviews*.
**Business Rule**: Only Activated reviews become visible/actionable to the reviewer.
**Suggested Layer**: E2E

### TC-004: Supervisor evaluates an Activated review → In Progress → Completed
**Category**: Happy Path
**Preconditions**: An **Activated** review whose reviewer is a real ESS/Supervisor login; that Job Title has KPIs configured.
**Steps**: 1) Login as the reviewer. 2) Performance → My Reviews / Employee Reviews → open the review. 3) Enter KPI ratings + comments. 4) **Save** (state → In Progress). 5) **Complete**.
**Expected Results**: After Save the status is **In Progress**; after Complete the status is **Completed** and the review is read-only.
**Business Rule**: `Activated → In Progress → Completed`; reviews cannot be edited once Completed.
**Suggested Layer**: E2E

### TC-005: Created review appears in the Manage Reviews list and is searchable
**Category**: Happy Path
**Steps**: 1) Create a review. 2) Search by the employee's name.
**Expected Results**: A row with the employee, reviewer, period, due date, and status.
**Suggested Layer**: E2E

### TC-006: Edit an Inactive review's period / due date / reviewer
**Category**: Happy Path
**Preconditions**: An Inactive (or Activated, pre-evaluation) review exists.
**Steps**: 1) Open the review for edit. 2) Change Due Date / dates / reviewer. 3) Save.
**Expected Results**: Toast `"Successfully Updated"`; the list reflects new values.
**Suggested Layer**: E2E

### TC-007: Delete a review from the Manage Reviews list
**Category**: Happy Path
**Preconditions**: A deletable (e.g. Inactive) review exists.
**Steps**: 1) Select the row checkbox → Delete (or row trash icon). 2) Confirm in the dialog.
**Expected Results**: Toast `"Successfully Deleted"`; row removed; Records count decrements.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Supervisor Reviewer options are restricted to the selected employee's supervisors
**Category**: Business Rule
**Preconditions**: Add Review form; an employee selected.
**Steps**: 1) Select Employee X. 2) Open the Supervisor Reviewer autocomplete and type a name that is NOT X's supervisor.
**Expected Results**: Only X's supervisor(s) appear as hints; a non-supervisor name → `"No Records Found"`. (API: `/performance/supervisors?empNumber={X}`.)
**Business Rule**: The reviewer must be a supervisor of the reviewee.
**Suggested Layer**: E2E + API

### TC-101: Employee with no supervisor cannot be given a reviewer (creation blocker)
**Category**: Business Rule
**Preconditions**: An employee with **no** supervisor (verified live: Marcus James Chen, Jacob Puntasa Oram).
**Steps**: 1) Select that employee. 2) Open Supervisor Reviewer and type any query.
**Expected Results**: `"No Records Found"` for every query → the mandatory reviewer cannot be set → the review cannot be saved.
**Business Rule**: A review requires a supervisor reviewer, which requires a reporting-to relationship.
**Suggested Layer**: E2E

### TC-102: Save creates Inactive; Activate creates Activated
**Category**: Business Rule
**Steps**: 1) Create one review via **Save**, another via **Activate**.
**Expected Results**: First is **Inactive**, second is **Activated**.
**Business Rule**: Save vs Activate determines the initial state.
**Suggested Layer**: E2E

### TC-103: A Completed review is locked (no further edits)
**Category**: Business Rule
**Preconditions**: A **Completed** review.
**Steps**: 1) Attempt to open/edit it as Admin or reviewer.
**Expected Results**: Read-only; rating/comment inputs and Save are unavailable (or `PUT` is rejected).
**Business Rule**: Reviews cannot be edited once Completed.
**Suggested Layer**: E2E + API

### TC-104: Review is attributed to the chosen employee and reviewer (not the admin actor)
**Category**: Business Rule
**Steps**: 1) As Admin, create a review for employee X with reviewer Y. 2) Inspect the row / API record.
**Expected Results**: empNumber = X, reviewerEmpNumber = Y; the creating admin is not recorded as reviewer.
**Suggested Layer**: API

### TC-105: List is sorted by status (statusId) by default
**Category**: Business Rule
**Steps**: 1) Have reviews across multiple statuses. 2) Load Manage Reviews.
**Expected Results**: Default `sortField=performanceReview.statusId, sortOrder=ASC` (Inactive first … Completed last).
**Suggested Layer**: API

### TC-106: Job Title filter narrows the list to that title's reviews
**Category**: Business Rule
**Steps**: 1) Select a **Job Title** filter. 2) Search.
**Expected Results**: Only reviews for employees with that job title; API carries `jobTitleId`.
**Suggested Layer**: E2E

### TC-107: Review Status filter returns only matching-status reviews
**Category**: Business Rule
**Steps**: 1) Pick Review Status = **Activated** → Search. 2) Repeat for In Progress / Completed / Inactive.
**Expected Results**: Each result set contains only reviews of the chosen status (API `statusId`).
**Suggested Layer**: E2E

### TC-108: Reviewer filter narrows to reviews assigned to that reviewer
**Category**: Business Rule
**Steps**: 1) Type a reviewer in the **Reviewer** filter (autocomplete) → Search.
**Expected Results**: Only reviews where that person is the supervisor reviewer.
**Suggested Layer**: E2E

### TC-109: Include = "Current Employees Only" hides terminated employees' reviews
**Category**: Business Rule
**Preconditions**: A review exists for a now-terminated employee.
**Steps**: 1) With Include = Current Employees Only, search. 2) Switch Include to include past employees, search again.
**Expected Results**: The terminated employee's review is hidden in (1), shown in (2). (API `includeEmployees=onlyCurrent` vs other.)
**Suggested Layer**: E2E

### TC-110: From/To Date filters scope by review period (default current year)
**Category**: Business Rule
**Steps**: 1) Note default From=`<year>-01-01`, To=`<year>-12-31`. 2) Narrow the range to exclude a known review.
**Expected Results**: Reviews outside the range are excluded; API carries `fromDate`/`toDate`.
**Suggested Layer**: E2E

---

## Security (TC-200–299)

### TC-200: ESS cannot access the Manage Reviews admin page
**Category**: Security
**Steps**: 1) As ESS, navigate directly to `/performance/searchPerformanceReview` and `/performance/saveReview`.
**Expected Results**: Access denied / redirect / "Credential Required" — no Add form, no other employees' reviews.
**Business Rule**: Managing reviews is admin-only; ESS only sees *My Trackers* and reviews assigned to them.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a review via the API
**Category**: Security
**Steps**: 1) With an ESS session, `POST /api/v2/performance/manage/reviews`.
**Expected Results**: `403 Unauthorized`; no record created.
**Suggested Layer**: API

### TC-202: ESS cannot list all employees' reviews via the manage API
**Category**: Security
**Steps**: 1) ESS `GET /api/v2/performance/manage/reviews`.
**Expected Results**: `403 Unauthorized` (or zero leakage of others' reviews).
**Suggested Layer**: API

### TC-203: A reviewer cannot evaluate a review they are not assigned to
**Category**: Security
**Steps**: 1) As supervisor Y, attempt to open/PUT a review whose reviewer is Z.
**Expected Results**: `403` / not visible in their *Employee Reviews* list.
**Suggested Layer**: API

### TC-204: CSRF / unauthenticated review creation is rejected
**Category**: Security
**Steps**: 1) `POST /api/v2/performance/manage/reviews` with no/expired token (or missing CSRF on the cookie flow).
**Expected Results**: `401 Unauthorized` / `Invalid CSRF token`.
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Saving an empty Add form shows 5× "Required"
**Category**: Negative
**Steps**: 1) Add → click **Save** with all fields blank.
**Expected Results**: `"Required"` under Employee Name, Supervisor Reviewer, Review Period Start Date, End Date, and Due Date (verified live: exactly 5 messages). No navigation.
**Suggested Layer**: E2E

### TC-301: Free-typed (unbound) employee name is rejected
**Category**: Negative
**Steps**: 1) Type a name in Employee Name without selecting a hint. 2) Save.
**Expected Results**: Field shows `"Required"`/invalid — free text is not accepted as an employee.
**Suggested Layer**: E2E

### TC-302: Review Period End Date earlier than Start Date is rejected
**Category**: Negative
**Steps**: 1) Set Start = `2026-06-30`, End = `2026-06-01`. 2) Save.
**Expected Results**: Validation error (End must be ≥ Start); save blocked.
**Business Rule**: Period end ≥ period start.
**Suggested Layer**: E2E

### TC-303: Reviewer required even after employee is chosen
**Category**: Negative
**Steps**: 1) Select Employee + all 3 dates, leave Supervisor Reviewer blank. 2) Save.
**Expected Results**: `"Required"` under Supervisor Reviewer; save blocked.
**Suggested Layer**: E2E

### TC-304: Malformed date input rejected by the picker/field
**Category**: Negative
**Steps**: 1) Type `2026-13-40` (or `abcd`) into a date field. 2) Blur/Save.
**Expected Results**: `"Should be a valid date"` / value rejected; save blocked.
**Suggested Layer**: E2E

### TC-305: Activating with missing required fields is blocked
**Category**: Negative
**Steps**: 1) Leave one required field blank. 2) Click **Activate**.
**Expected Results**: Same `"Required"` validation as Save; no record created/activated.
**Suggested Layer**: E2E

### TC-306: Cancel discards the Add form without creating a review
**Category**: Negative
**Steps**: 1) Fill some fields → click **Cancel**.
**Expected Results**: Returns to the list; no new row; no toast.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Single-day review period (Start = End)
**Category**: Edge Case
**Steps**: 1) Start = End = `2026-06-15`; Due = `2026-06-20`. 2) Save.
**Expected Results**: Accepted (a one-day period is valid).
**Suggested Layer**: E2E

### TC-401: Due Date before the review period start
**Category**: Edge Case
**Steps**: 1) Period `2026-07-01`→`2026-09-30`, Due = `2026-06-01`. 2) Save.
**Expected Results**: Document actual behavior — observe whether Open Source allows a due date preceding the period (no documented constraint); flag if accepted silently.
**Suggested Layer**: E2E

### TC-402: Reviewee who is also a supervisor elsewhere
**Category**: Edge Case
**Steps**: 1) Create a review for an employee who themselves supervises others.
**Expected Results**: Allowed; their own reviewer list is still only *their* supervisors (no self-review unless they report to themselves).
**Suggested Layer**: E2E

### TC-403: Self-review attempt (employee == reviewer)
**Category**: Edge Case
**Preconditions**: An employee who is their own supervisor (or appears in their own supervisor list).
**Steps**: 1) Set reviewer = the same person as employee. 2) Save.
**Expected Results**: Document behavior — verify whether self-review is permitted; flag as a finding if so.
**Suggested Layer**: E2E

### TC-404: Multiple concurrent reviews for the same employee
**Category**: Edge Case
**Steps**: 1) Create two reviews for the same employee with overlapping periods.
**Expected Results**: Observe whether duplicates/overlaps are allowed (no documented uniqueness rule) — both rows expected; note the absence of an overlap guard.
**Suggested Layer**: E2E

### TC-405: Boundary date values (period spanning year change / far-future due date)
**Category**: Edge Case
**Steps**: 1) Period `2026-12-01`→`2027-02-28`, Due `2027-03-15`. 2) Save, then search.
**Expected Results**: Saved; appears only when the From/To filter range overlaps the period (default `01-01`→`12-31` may exclude it — confirm filtering behavior).
**Suggested Layer**: E2E

### TC-406: Large result set pagination (50 per page)
**Category**: Edge Case
**Preconditions**: > 50 reviews.
**Steps**: 1) Load Manage Reviews.
**Expected Results**: 50 rows per page; pagination control present; API `limit=50&offset=` advances correctly.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Empty Manage Reviews list shows "No Records Found"
**Category**: UI State
**Steps**: 1) Open Manage Reviews with no matching reviews.
**Expected Results**: Heading "Manage Performance Reviews", an **Add** button, and `No Records Found` with an empty table.
**Suggested Layer**: E2E

### TC-501: Filter panel is collapsible via the header toggle
**Category**: UI State
**Steps**: 1) Click the filter-toggle icon next to the "Manage Performance Reviews" heading.
**Expected Results**: The search form (Employee Name, Job Title, Review Status, Include, Reviewer, From/To Date, Reset, Search) expands/collapses.
**Suggested Layer**: E2E

### TC-502: Date filters default to the current calendar year
**Category**: UI State
**Steps**: 1) Expand the filter panel on first load.
**Expected Results**: From Date = `<currentYear>-01-01`, To Date = `<currentYear>-12-31` (live: 2026-01-01 → 2026-12-31); Include = "Current Employees Only".
**Suggested Layer**: E2E

### TC-503: Review Status dropdown lists exactly the four states
**Category**: UI State
**Steps**: 1) Open the Review Status dropdown.
**Expected Results**: Options `-- Select --`, **Inactive, Activated, In Progress, Completed** (and nothing else).
**Suggested Layer**: E2E

### TC-504: Add Review form marks all five fields required (`*`) with "* Required" legend
**Category**: UI State
**Steps**: 1) Open Add Review.
**Expected Results**: Employee Name\*, Supervisor Reviewer\*, Review Period Start Date\*, Review Period End Date\*, Due Date\* labels carry `*`; footer shows "* Required"; buttons Cancel / Save / **Activate**.
**Suggested Layer**: E2E

### TC-505: Reset clears all search filters back to defaults
**Category**: UI State
**Steps**: 1) Set several filters → **Reset**.
**Expected Results**: Employee/Reviewer cleared; dropdowns back to `-- Select --` / "Current Employees Only"; dates back to year defaults.
**Suggested Layer**: E2E

### TC-506: Success toast appears on save / update / delete
**Category**: UI State
**Steps**: 1) Save a review; update one; delete one.
**Expected Results**: `"Successfully Saved"` / `"Successfully Updated"` / `"Successfully Deleted"` toasts in the bottom-right.
**Suggested Layer**: E2E

### TC-507: Status column reflects the review's lifecycle state
**Category**: UI State
**Steps**: 1) Observe a review's row through Save → Activate → reviewer Save → Complete.
**Expected Results**: Row status updates Inactive → Activated → In Progress → Completed accordingly.
**Suggested Layer**: E2E

### TC-508: Table shimmer/loader resolves before rows render
**Category**: UI State
**Steps**: 1) Trigger a search.
**Expected Results**: `.oxd-loading-spinner` appears then detaches; assertions should wait for it before counting rows.
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 41**
- Happy Path: 7 · Business Rules: 11 · Security: 5 · Negative: 7 · Edge Cases: 7 · UI State: 9 (TC-506 grouped under UI State)

### Notes for downstream skills (`test-strategy` / `create-tests`)
- **Hard precondition for any create/activate/evaluate test:** the reviewee must have a supervisor (reporting-to). On the current test instance, seeded employees (e.g. Marcus James Chen, Jacob Puntasa Oram) have **no** supervisor, so a test must first assign one in PIM (`POST /pim/employees/{empNumber}/supervisors`) or pick/seed an employee that already reports to someone.
- Reviewer autocomplete depends on the employee selection (`empNumber` query param) — fill **Employee first**, then Reviewer.
- For the evaluation half (TC-004, TC-103, TC-203) the reviewer needs a real login; reuse the *My Reviews* / *Employee Reviews* pages, distinct from this admin page.
- Prefer route-mocking `**/api/v2/performance/manage/reviews**` for the empty-state (TC-500) and status-filter (TC-107) UI-only checks, mirroring the My Trackers approach (`my-trackers` memory).
