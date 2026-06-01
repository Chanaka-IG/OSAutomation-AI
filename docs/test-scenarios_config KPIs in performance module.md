# Test Scenarios: Configure KPIs (Performance Module)

**Feature**: Performance → Configure → KPIs
**List page**: `/web/index.php/performance/searchKpi`
**Add/Edit page**: `/web/index.php/performance/saveKpi`
**API**: `GET /api/v2/performance/kpis?jobTitleId`, `POST /api/v2/performance/kpis`, `PUT/DELETE /api/v2/performance/kpis/{id}`
**Generated**: 2026-05-31

---

## ⚠️ Domain-knowledge correction (discovered on live demo)

The `orangehrm-opensource-domain` skill states *"KPI weights must sum to exactly 100; otherwise the form blocks save with `Total weight should be 100`"*. **This is NOT the Open Source (Starter) behavior.** There is **no weight field** on the Configure KPIs screen in Open Source — weighting is an Enterprise feature. The real Open Source KPI record consists of:

- **Key Performance Indicator** (title, required)
- **Job Title** (required)
- **Minimum Rating** (required, numeric 0–100, defaults to `0`)
- **Maximum Rating** (required, numeric 0–100, defaults to `100`)
- **Make Default Scale** (checkbox → "Is Default" column)

Scenarios below trace to **observed live behavior** plus the corrected data model, not the (incorrect) weight rule.

---

## Discovered behavior (live demo, Admin session)

### List page (`/performance/searchKpi`)
- Heading: **"Key Performance Indicators for Job Title"**
- Filter panel: **Job Title** OXD dropdown (`-- Select --` default) + **Reset** / **Search** buttons
- **Add** button (top of results)
- **"(N) Records Found"** banner (51 on demo)
- Table columns: `[select checkbox] | Key Performance Indicator | Job Title | Min Rate | Max Rate | Is Default | Actions`
- Sortable: **Key Performance Indicator** and **Job Title** columns show sort carets
- **Is Default** cell shows `Yes` when set, blank otherwise
- Most rows show **Edit + Delete** action icons; some KPIs (observed on HR Manager) show **Edit only** (no Delete) — see TC-103
- Pagination: ~50 rows/page; demo shows 2 pages

### Add/Edit form (`/performance/saveKpi`)
- Fields: `Key Performance Indicator*`, `Job Title*`, `Minimum Rating*` (default `0`), `Maximum Rating*` (default `100`), `Make Default Scale` checkbox
- Buttons: **Cancel** / **Save**; legend `* Required`

### Validation messages (exact strings captured live)
| Trigger | Field | Message |
|---|---|---|
| Empty title | KPI | `Required` |
| No job title | Job Title | `Required` |
| Empty rating | Min/Max Rating | `Required` |
| Non-numeric / out-of-range | Min/Max Rating | `Should be a number between 0-100` |
| Max ≤ Min | Max Rating | `Maximum Rating should be greater than Minimum Rating` |

### Observed data facts
- Same KPI title legitimately repeats across **different** job titles (e.g. *"Decision-Making Analysis"* exists for Software Architect, QA Lead, IT Manager, HR Associate)
- Custom scale example present: *"targeted new customer"* (QA Engineer) with Min `50` / Max `90`

---

## Happy Path Scenarios (TC-001–099)

### TC-001: Configure KPIs list loads with correct columns and records
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one KPI exists
**Steps**:
1. Navigate to `/web/index.php/performance/searchKpi`
2. Wait for the table loader to disappear
**Expected Results**: Heading "Key Performance Indicators for Job Title" visible; columns `Key Performance Indicator, Job Title, Min Rate, Max Rate, Is Default, Actions` present; "(N) Records Found" banner shown; ≥1 row rendered
**Business Rule**: KPI configuration is an Admin-only Performance screen
**Suggested Layer**: E2E

### TC-002: Filter KPIs by Job Title returns only that title's KPIs
**Category**: Happy Path
**Preconditions**: Admin logged in; KPIs exist for ≥2 distinct job titles
**Steps**:
1. Open Configure KPIs
2. Select a Job Title (e.g. "QA Engineer") in the filter dropdown
3. Click **Search**
**Expected Results**: Every result row shows the selected job title in the Job Title column; other job titles absent; count reflects the filtered subset
**Business Rule**: `GET /performance/kpis?jobTitleId=<id>` filters server-side by job title
**Suggested Layer**: E2E

### TC-003: Reset clears the Job Title filter and restores full list
**Category**: Happy Path
**Preconditions**: Admin logged in; a filter has been applied
**Steps**:
1. Apply a Job Title filter and Search (note filtered count)
2. Click **Reset**
**Expected Results**: Job Title dropdown returns to `-- Select --`; record count returns to the full total
**Business Rule**: Reset reverts the query to unfiltered
**Suggested Layer**: E2E

### TC-004: Add button navigates to the Add KPI form
**Category**: Happy Path
**Preconditions**: Admin on Configure KPIs list
**Steps**:
1. Click **Add**
**Expected Results**: URL becomes `/web/index.php/performance/saveKpi`; "Add Key Performance Indicator" form with all five fields rendered
**Business Rule**: List → Add navigation
**Suggested Layer**: E2E

### TC-005: Add a KPI with all valid fields
**Category**: Happy Path
**Preconditions**: Admin on Add KPI form; target job title exists
**Steps**:
1. Enter Key Performance Indicator title (e.g. "Code Review Quality")
2. Select a Job Title
3. Set Minimum Rating `0`, Maximum Rating `100`
4. Click **Save**
**Expected Results**: Success toast "Successfully Saved"; redirect to list; the new KPI appears under its job title
**Business Rule**: `POST /performance/kpis { title, jobTitleId, minRating, maxRating, isDefault }`
**Suggested Layer**: E2E + API

### TC-006: Add a KPI using the default rating scale (0–100)
**Category**: Happy Path
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter title + Job Title, leave Min/Max at defaults `0`/`100`
2. Save
**Expected Results**: Saved with Min Rate `0`, Max Rate `100` shown in list
**Business Rule**: Min/Max default to 0/100
**Suggested Layer**: E2E

### TC-007: Add a KPI as the default scale for its Job Title
**Category**: Happy Path
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter title + Job Title + valid ratings
2. Check **Make Default Scale**
3. Save
**Expected Results**: New KPI's row shows **Yes** in the Is Default column
**Business Rule**: `isDefault: true` flags the KPI as the default scale
**Suggested Layer**: E2E

### TC-008: Edit an existing KPI's title
**Category**: Happy Path
**Preconditions**: Admin; an editable (non-locked) KPI exists
**Steps**:
1. Click the Edit (pencil) icon on a KPI row
2. Change the title
3. Save
**Expected Results**: Success toast "Successfully Updated"; list reflects the new title
**Business Rule**: `PUT /performance/kpis/{id}`
**Suggested Layer**: E2E

### TC-009: Edit a KPI's Min/Max rating
**Category**: Happy Path
**Preconditions**: Admin; editable KPI exists
**Steps**:
1. Edit a KPI, change Min to `50`, Max to `90`
2. Save
**Expected Results**: List shows Min Rate `50`, Max Rate `90`
**Business Rule**: Rating range is mutable on edit
**Suggested Layer**: E2E

### TC-010: Delete a single KPI via the row action
**Category**: Happy Path
**Preconditions**: Admin; a deletable KPI (not in use) exists
**Steps**:
1. Click the Delete (trash) icon on a KPI row
2. Confirm in the "Are you Sure?" dialog
**Expected Results**: Success toast "Successfully Deleted"; row removed; "Records Found" count decremented
**Business Rule**: `DELETE /performance/kpis/{id}`
**Suggested Layer**: E2E

### TC-011: Bulk delete KPIs via row checkboxes
**Category**: Happy Path
**Preconditions**: Admin; ≥2 deletable KPIs exist
**Steps**:
1. Tick the checkboxes of two KPI rows
2. Click the "Delete Selected" button that appears
3. Confirm the dialog
**Expected Results**: Both removed; success toast; count decremented by 2
**Business Rule**: Bulk delete supported via selection
**Suggested Layer**: E2E

### TC-012: Sort the list by Job Title / KPI name
**Category**: Happy Path
**Preconditions**: Admin; multiple KPIs exist
**Steps**:
1. Click the sort caret on the "Job Title" column header
**Expected Results**: Rows reorder by job title (asc then desc on repeat click)
**Business Rule**: Sortable columns: Key Performance Indicator, Job Title
**Suggested Layer**: E2E

### TC-013: Pagination navigates between result pages
**Category**: Happy Path
**Preconditions**: Admin; >50 KPIs exist (demo has 51)
**Steps**:
1. On the list, click page "2" in the pagination control
**Expected Results**: Second page of KPIs renders; page 1 rows replaced
**Business Rule**: ~50 records per page
**Suggested Layer**: E2E

### TC-014: Cancel on the Add form returns to list without saving
**Category**: Happy Path
**Preconditions**: Admin on Add KPI form with data entered
**Steps**:
1. Enter a title
2. Click **Cancel**
**Expected Results**: Returns to KPI list; no new KPI created; record count unchanged
**Business Rule**: Cancel discards unsaved input
**Suggested Layer**: E2E

### TC-015: Select-all header checkbox selects every row on the page
**Category**: Happy Path
**Preconditions**: Admin; multiple KPIs on the page
**Steps**:
1. Click the header checkbox in the first column
**Expected Results**: All page rows become checked; "Delete Selected" action available
**Business Rule**: Standard OXD table bulk-select
**Suggested Layer**: E2E

---

## Business Rule Scenarios (TC-100–199)

### TC-100: Maximum Rating must be greater than Minimum Rating
**Category**: Business Rule
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Set Minimum Rating `80`, Maximum Rating `50`
**Expected Results**: Inline error under Max Rating: `Maximum Rating should be greater than Minimum Rating`; Save blocked
**Business Rule**: Max > Min enforced (observed live)
**Suggested Layer**: E2E + Component

### TC-101: Ratings are constrained to the 0–100 range
**Category**: Business Rule
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter `150` in Minimum Rating
**Expected Results**: Inline error `Should be a number between 0-100`; Save blocked
**Business Rule**: Rating bounds 0–100 (observed live)
**Suggested Layer**: E2E + Component

### TC-102: Only one default scale should apply per Job Title
**Category**: Business Rule
**Preconditions**: Admin; a Job Title already has a default-scale KPI
**Steps**:
1. Add/edit another KPI for the same Job Title with **Make Default Scale** checked
2. Save and re-inspect the list filtered by that Job Title
**Expected Results**: Verify whether the default flag moves to the new KPI (single default per title) or multiple "Yes" rows are allowed — assert the actual product rule
**Business Rule**: Default scale semantics per job title (verify)
**Suggested Layer**: E2E + API

### TC-103: A KPI used by an existing review cannot be deleted (Edit only)
**Category**: Business Rule
**Preconditions**: Admin; a KPI linked to a created/activated performance review exists (e.g. HR Manager KPIs on demo show Edit only)
**Steps**:
1. Locate a KPI whose job title has existing reviews
2. Inspect its Actions cell
**Expected Results**: Only the Edit icon is present — no Delete icon (and/or delete attempt is rejected), preserving referential integrity with reviews
**Business Rule**: KPIs referenced by reviews are protected from deletion (observed)
**Suggested Layer**: E2E

### TC-104: Job Title dropdown lists only existing job titles
**Category**: Business Rule
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Open the Job Title dropdown
**Expected Results**: Options equal the Admin → Job → Job Titles list; no free-text entry
**Business Rule**: jobTitleId must reference a real job title
**Suggested Layer**: E2E

### TC-105: Unchecked "Make Default Scale" yields a non-default KPI
**Category**: Business Rule
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Add a KPI leaving "Make Default Scale" unchecked; Save
**Expected Results**: Is Default column blank for that row (`isDefault: false`)
**Business Rule**: Default flag defaults to false
**Suggested Layer**: E2E + API

### TC-106: Newly added KPI is scoped to its selected Job Title
**Category**: Business Rule
**Preconditions**: Admin; KPI just added for Job Title X
**Steps**:
1. Filter the list by Job Title X
**Expected Results**: New KPI appears; filtering by a different job title excludes it
**Business Rule**: KPIs belong to exactly one job title
**Suggested Layer**: E2E + API

### TC-107: Boundary ratings 0 (min) and 100 (max) are accepted
**Category**: Business Rule
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Set Minimum Rating `0`, Maximum Rating `100`; complete required fields; Save
**Expected Results**: Saved successfully; list shows `0` / `100`
**Business Rule**: 0 and 100 are inclusive bounds
**Suggested Layer**: E2E

### TC-108: Duplicate KPI title is allowed across different Job Titles
**Category**: Business Rule
**Preconditions**: Admin; KPI title "Planning Methodologies" exists for several titles
**Steps**:
1. Add "Planning Methodologies" for a job title that doesn't yet have it
**Expected Results**: Saved successfully (no "Already exists"); uniqueness is per (title, jobTitle), not global
**Business Rule**: Same KPI name may repeat across job titles (observed)
**Suggested Layer**: E2E + API

### TC-109: Duplicate KPI title within the SAME Job Title
**Category**: Business Rule
**Preconditions**: Admin; a KPI exists for Job Title X
**Steps**:
1. Add the identical title for the same Job Title X
**Expected Results**: Verify product behavior — either rejected as duplicate or allowed; assert the actual response (toast / error)
**Business Rule**: Per-(title,jobTitle) uniqueness (verify)
**Suggested Layer**: E2E + API

---

## Security Scenarios (TC-200–299)

### TC-200: ESS user has no access to Configure KPIs menu
**Category**: Security
**Preconditions**: ESS (non-supervisor) user logged in
**Steps**:
1. Open the Performance top menu
**Expected Results**: No "Configure" / "KPIs" item; ESS sees only their own My Reviews/Trackers as permitted
**Business Rule**: KPI configuration is Admin-only
**Suggested Layer**: E2E

### TC-201: ESS direct-URL navigation to searchKpi is blocked
**Category**: Security
**Preconditions**: ESS user logged in
**Steps**:
1. Navigate directly to `/web/index.php/performance/searchKpi`
**Expected Results**: Forbidden page / redirect; no KPI data rendered
**Business Rule**: Server-side authorization, not just menu hiding
**Suggested Layer**: E2E

### TC-202: ESS API call to create a KPI is rejected
**Category**: Security
**Preconditions**: Valid ESS session/token
**Steps**:
1. `POST /api/v2/performance/kpis` with a valid body using the ESS session
**Expected Results**: `403 Unauthorized`; no KPI created
**Business Rule**: Data-group permissions block ESS writes
**Suggested Layer**: API

### TC-203: Unauthenticated access redirects to login
**Category**: Security
**Preconditions**: No active session
**Steps**:
1. Navigate to `/web/index.php/performance/searchKpi`
**Expected Results**: Redirect to `/auth/login?next=<original-url>`
**Business Rule**: Session required for all module pages
**Suggested Layer**: E2E

### TC-204: State-changing KPI request requires a valid CSRF token
**Category**: Security
**Preconditions**: Authenticated UI/cookie session
**Steps**:
1. Submit a KPI create/delete (cookie flow) with missing/invalid `_token`
**Expected Results**: `401 Invalid CSRF token`; no mutation
**Business Rule**: CSRF protection on all mutating actions
**Suggested Layer**: API

### TC-205: Supervisor role cannot configure KPIs
**Category**: Security
**Preconditions**: ESS user who is a supervisor
**Steps**:
1. Attempt to reach Configure KPIs via menu and direct URL
**Expected Results**: No access (supervisor privileges extend to subordinate reviews, not KPI config)
**Business Rule**: Supervisor ≠ Admin for configuration screens
**Suggested Layer**: E2E

### TC-206: XSS payload in KPI title is escaped on render
**Category**: Security
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Save a KPI with title `<script>alert(1)</script>`
2. View it in the list (and in review screens that pull KPIs)
**Expected Results**: Rendered as literal text; no script execution; stored/escaped safely
**Business Rule**: Output encoding of user input
**Suggested Layer**: E2E

### TC-207: Editing/deleting a KPI by tampered id you shouldn't reach
**Category**: Security
**Preconditions**: ESS session/token
**Steps**:
1. `PUT`/`DELETE /api/v2/performance/kpis/{id}` for an existing KPI id via ESS session
**Expected Results**: `403 Unauthorized`; record unchanged
**Business Rule**: Authorization enforced per request, not per UI
**Suggested Layer**: API

---

## Negative / Error Scenarios (TC-300–399)

### TC-300: Save with empty KPI title
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Leave the Key Performance Indicator field blank; click Save
**Expected Results**: Inline `Required` under the title field; Save blocked
**Business Rule**: Title is mandatory (observed)
**Suggested Layer**: E2E + Component

### TC-301: Save with no Job Title selected
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Leave Job Title at `-- Select --`; click Save
**Expected Results**: Inline `Required` under Job Title; Save blocked
**Business Rule**: Job Title is mandatory (observed)
**Suggested Layer**: E2E + Component

### TC-302: Save with empty Minimum Rating
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Clear the Minimum Rating field; click Save
**Expected Results**: Inline `Required` under Minimum Rating
**Business Rule**: Min Rating mandatory (observed)
**Suggested Layer**: E2E + Component

### TC-303: Save with empty Maximum Rating
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Clear the Maximum Rating field; click Save
**Expected Results**: Inline `Required` under Maximum Rating
**Business Rule**: Max Rating mandatory
**Suggested Layer**: E2E + Component

### TC-304: Non-numeric rating input
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Type `abc` in Minimum Rating
**Expected Results**: Inline `Should be a number between 0-100`
**Business Rule**: Rating must be numeric (observed)
**Suggested Layer**: E2E + Component

### TC-305: Rating above 100
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter `150` in a rating field
**Expected Results**: Inline `Should be a number between 0-100`
**Business Rule**: Upper bound 100 (observed)
**Suggested Layer**: E2E + Component

### TC-306: Negative rating
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter `-5` in Minimum Rating
**Expected Results**: Inline `Should be a number between 0-100`
**Business Rule**: Lower bound 0
**Suggested Layer**: E2E + Component

### TC-307: Maximum Rating equal to Minimum Rating
**Category**: Negative
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Set both Minimum and Maximum to `50`
**Expected Results**: Inline `Maximum Rating should be greater than Minimum Rating` (equality is rejected — strictly greater)
**Business Rule**: Max strictly > Min (observed)
**Suggested Layer**: E2E + Component

### TC-308: API create with a missing required field
**Category**: Negative
**Preconditions**: Admin token
**Steps**:
1. `POST /api/v2/performance/kpis` omitting `title` (or `jobTitleId`)
**Expected Results**: `400`/`422` validation error; no KPI created
**Business Rule**: Server-side validation mirrors UI required rules
**Suggested Layer**: API

### TC-309: Delete a KPI that no longer exists (stale id)
**Category**: Negative
**Preconditions**: Admin; KPI id already deleted
**Steps**:
1. `DELETE /api/v2/performance/kpis/{deletedId}`
**Expected Results**: `404 Record Not Found`
**Business Rule**: 404 on missing resource
**Suggested Layer**: API

### TC-310: API create with out-of-range ratings
**Category**: Negative
**Preconditions**: Admin token
**Steps**:
1. `POST /performance/kpis` with `minRating: -1` or `maxRating: 101`
**Expected Results**: Validation error rejecting the value (server enforces 0–100)
**Business Rule**: Server enforces the same 0–100 bounds as the UI
**Suggested Layer**: API

### TC-311: API create with maxRating ≤ minRating
**Category**: Negative
**Preconditions**: Admin token
**Steps**:
1. `POST /performance/kpis` with `minRating: 80, maxRating: 50`
**Expected Results**: Validation error; no KPI created
**Business Rule**: Server enforces Max > Min
**Suggested Layer**: API

---

## Edge Case Scenarios (TC-400–499)

### TC-400: KPI title at and beyond the max-length boundary
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter a title at the field's max length, then one character over
**Expected Results**: At limit → saved; over limit → `Should be less than N characters` (assert actual N)
**Business Rule**: Length-limited text field
**Suggested Layer**: E2E + Component

### TC-401: KPI title with special characters / unicode
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Save title containing an apostrophe/curly quote and accents (e.g. `Maintain company’s systems — 24/7`)
**Expected Results**: Saved and displayed faithfully (matches demo data containing `’`); no corruption
**Business Rule**: Unicode-safe storage/render
**Suggested Layer**: E2E

### TC-402: Smallest valid rating gap (Min 0, Max 1)
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Set Min `0`, Max `1`; Save
**Expected Results**: Saved (Max strictly greater than Min by 1)
**Business Rule**: Any gap ≥1 valid
**Suggested Layer**: E2E

### TC-403: Top-of-range gap (Min 99, Max 100)
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Set Min `99`, Max `100`; Save
**Expected Results**: Saved
**Business Rule**: Boundary values combine validly
**Suggested Layer**: E2E

### TC-404: Decimal rating value
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter `50.5` in a rating field
**Expected Results**: Assert actual behavior — accepted as decimal, truncated/rounded, or rejected by the 0–100 numeric rule
**Business Rule**: Numeric precision handling (verify)
**Suggested Layer**: E2E + Component

### TC-405: Leading/trailing whitespace in the title
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Save title `  Quality  ` with surrounding spaces
**Expected Results**: Stored trimmed; list shows `Quality`; no duplicate created vs an existing trimmed match
**Business Rule**: Input trimming
**Suggested Layer**: E2E + API

### TC-406: Rating entered with leading zeros
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter `050` in Maximum Rating
**Expected Results**: Treated as `50`; saved normalized
**Business Rule**: Numeric normalization
**Suggested Layer**: Component

### TC-407: Very long KPI title display in the table
**Category**: Edge Case
**Preconditions**: A KPI with a long title exists (demo has 80+ char titles)
**Steps**:
1. View the list
**Expected Results**: Title wraps/displays without breaking the table layout or truncating data silently
**Business Rule**: Table rendering of long content
**Suggested Layer**: E2E

### TC-408: Adding a KPI crosses a pagination boundary
**Category**: Edge Case
**Preconditions**: Admin; record count at a page boundary (e.g. exactly 50)
**Steps**:
1. Add one KPI to push the total to 51
**Expected Results**: Pagination control now shows a second page; new total reflected in "Records Found"
**Business Rule**: Pagination recalculated on count change
**Suggested Layer**: E2E

### TC-409: Setting a new default scale when one already exists
**Category**: Edge Case
**Preconditions**: Admin; Job Title X already has a default KPI
**Steps**:
1. Add/edit a second KPI for X with Make Default Scale checked; Save
2. Filter by X
**Expected Results**: Assert whether the previous default is cleared (single default) or both show "Yes" — capture the real rule (links to TC-102)
**Business Rule**: Default scale uniqueness per job title (verify)
**Suggested Layer**: E2E + API

### TC-410: Whitespace-only title
**Category**: Edge Case
**Preconditions**: Admin on Add KPI form
**Steps**:
1. Enter only spaces in the title; click Save
**Expected Results**: Treated as empty → `Required` (after trim); Save blocked
**Business Rule**: Required validation applies post-trim
**Suggested Layer**: E2E + Component

---

## UI State Scenarios (TC-500–599)

### TC-500: Table shows a loading shimmer before rows render
**Category**: UI State
**Preconditions**: Admin
**Steps**:
1. Navigate to Configure KPIs
**Expected Results**: Skeleton/`.oxd-loading-spinner` shows briefly, then resolves to the table
**Business Rule**: Async table load
**Suggested Layer**: E2E

### TC-501: Empty state when a filter yields no KPIs
**Category**: UI State
**Preconditions**: Admin; a Job Title with zero KPIs exists
**Steps**:
1. Filter by that Job Title; Search
**Expected Results**: "No Records Found"; empty table; count shows 0
**Business Rule**: Empty-result handling
**Suggested Layer**: E2E

### TC-502: Inline validation errors clear once valid input is entered
**Category**: UI State
**Preconditions**: Admin on Add form showing a Required error
**Steps**:
1. Trigger `Required` on the title; then type a valid title
**Expected Results**: The error message disappears as the field becomes valid
**Business Rule**: Reactive validation
**Suggested Layer**: Component

### TC-503: Add form pre-fills Min `0` and Max `100`
**Category**: UI State
**Preconditions**: Admin
**Steps**:
1. Open the Add KPI form
**Expected Results**: Minimum Rating shows `0`, Maximum Rating shows `100` by default
**Business Rule**: Default scale prefilled (observed)
**Suggested Layer**: E2E

### TC-504: Default-scale KPIs show "Yes" in the Is Default column
**Category**: UI State
**Preconditions**: A default-scale KPI exists (e.g. HR Manager "Formal management…")
**Steps**:
1. View the list
**Expected Results**: That row's Is Default cell reads "Yes"; non-default rows are blank
**Business Rule**: Is Default reflects isDefault flag (observed)
**Suggested Layer**: E2E

### TC-505: KPIs in use show only the Edit action (no Delete)
**Category**: UI State
**Preconditions**: A KPI linked to existing reviews (HR Manager rows on demo)
**Steps**:
1. Inspect the Actions cell of such a KPI
**Expected Results**: Edit icon present, Delete icon absent (and the row may also lack a delete checkbox affordance)
**Business Rule**: Protected-from-delete display state (observed)
**Suggested Layer**: E2E

### TC-506: "Records Found" count updates after add/delete
**Category**: UI State
**Preconditions**: Admin
**Steps**:
1. Note the count; add a KPI; return to list; delete a KPI
**Expected Results**: Banner increments on add and decrements on delete to the correct total
**Business Rule**: Count reflects live total
**Suggested Layer**: E2E

### TC-507: Selecting a row checkbox reveals the "Delete Selected" button
**Category**: UI State
**Preconditions**: Admin; deletable KPIs present
**Steps**:
1. Tick one row checkbox
**Expected Results**: A "Delete Selected" (trash) button appears in the toolbar
**Business Rule**: Conditional bulk-action toolbar
**Suggested Layer**: E2E

### TC-508: List heading reads "Key Performance Indicators for Job Title"
**Category**: UI State
**Preconditions**: Admin
**Steps**:
1. Open Configure KPIs
**Expected Results**: Heading text exactly "Key Performance Indicators for Job Title"
**Business Rule**: Page identity (observed)
**Suggested Layer**: E2E

### TC-509: Delete confirmation dialog can be cancelled
**Category**: UI State
**Preconditions**: Admin; a deletable KPI exists
**Steps**:
1. Click Delete on a row → "Are you Sure?" dialog
2. Click No/Cancel
**Expected Results**: Dialog closes; KPI not deleted; count unchanged
**Business Rule**: Destructive action requires confirmation
**Suggested Layer**: E2E

### TC-510: Save button shows a busy/disabled state during submit
**Category**: UI State
**Preconditions**: Admin on Add form with valid data
**Steps**:
1. Click Save and observe the button during the request
**Expected Results**: Save shows loading/disabled state; no double-submit (single KPI created)
**Business Rule**: Submit-in-progress guard
**Suggested Layer**: E2E

---

## Coverage Summary

| Lens | Count | TC range |
|---|---|---|
| Happy Path | 15 | TC-001–015 |
| Business Rule | 10 | TC-100–109 |
| Security | 8 | TC-200–207 |
| Negative / Error | 12 | TC-300–311 |
| Edge Case | 11 | TC-400–410 |
| UI State | 11 | TC-500–510 |
| **Total** | **67** | |

**Items flagged for verification during automation** (real behavior to confirm, not yet asserted from docs): TC-102 / TC-409 (single default per job title?), TC-103 / TC-505 (delete-protection reason), TC-109 (same-title-same-jobtitle uniqueness), TC-400 (max title length N), TC-404 (decimal rating handling).
