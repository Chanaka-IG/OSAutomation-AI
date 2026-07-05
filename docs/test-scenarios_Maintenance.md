# Test Scenarios — Maintenance

**Feature:** Maintenance module (Admin only) — Administrator Access gate + Purge Employee Records + Access Records (Download Personal Data)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8), live exploration 2026-07-04

**Routes**
- Entry: `/web/index.php/maintenance/viewMaintenanceModule` → 302 → `/maintenance/purgeEmployee`
- Admin-access gate submit: form POST `/web/index.php/auth/adminVerify`
- Purge Records tab: `/maintenance/purgeEmployee`
- Access Records tab: `/maintenance/accessEmployeeData`

**APIs**
- Past-employee autocomplete: `GET /api/v2/pim/employees?nameOrId=<q>&includeEmployees=onlyPast`
- Access autocomplete: `GET /api/v2/pim/employees?nameOrId=<q>&includeEmployees=currentAndPast`
- Purge: `DELETE /api/v2/maintenance/purge` → `{ success }`
- Terminate (test prereq): `POST /api/v2/pim/employees/{empNumber}/terminations` `{ date, terminationReasonId, note }`
- Create employee (test prereq): `POST /api/v2/pim/employees` `{ firstName, middleName, lastName, employeeId }`

**Key behaviors**
- The **Administrator Access** password gate re-appears on *every* entry to the module (it is not persisted across navigation).
- Purge autocomplete lists **only terminated (past) employees**; current employees never appear.
- Purge is **permanent** — it anonymizes the employee (name search then returns nothing; `GET /pim/employees/{n}` → 422).
- Access Records **Download** produces a `<Full Name>.json` GDPR personal-data export.

---

## Happy Path (TC-001–099)

### TC-001: Admin unlocks the module with the correct password
**Category**: Happy Path
**Preconditions**: Logged in as Admin.
**Steps**: 1) Click **Maintenance** (or go to `/maintenance/viewMaintenanceModule`). 2) On the Administrator Access screen, enter the current admin password. 3) Click **Confirm**.
**Expected Results**: Redirects to `/maintenance/purgeEmployee`; "Purge Employee Records" page and the Purge Records / Access Records topbar are shown.
**Business Rule**: Entering the Maintenance module requires re-validating the admin's own credentials.
**Suggested Layer**: E2E

### TC-002: Purge a terminated employee (full happy path)
**Category**: Happy Path
**Preconditions**: A terminated (past) employee exists; module unlocked.
**Steps**: 1) On Purge Employee Records, type the past employee's name. 2) Pick the "<Name> (Past Employee)" hint. 3) Click **Search**. 4) In the Selected Employee panel click **Purge**. 5) Confirm **Yes, Purge**.
**Expected Results**: `DELETE /api/v2/maintenance/purge` returns 200; the form resets to the empty search; the employee is anonymized and no longer resolvable by name.
**Business Rule**: Purge permanently anonymizes a past employee's personal data.
**Suggested Layer**: E2E

### TC-003: Selected Employee panel shows the chosen past employee's identity
**Category**: Happy Path
**Preconditions**: A terminated employee exists; module unlocked.
**Steps**: 1) Search and select the past employee on Purge Employee Records.
**Expected Results**: Selected Employee panel shows disabled First/Middle/Last Name and Employee Id matching the record.
**Business Rule**: The panel echoes the target before the destructive action.
**Suggested Layer**: E2E

### TC-004: Download an employee's personal data (Access Records happy path)
**Category**: Happy Path
**Preconditions**: A current employee exists; module unlocked.
**Steps**: 1) Open **Access Records**. 2) Type an employee name and pick a hint. 3) Click **Search**. 4) Click **Download**.
**Expected Results**: A file named `<Full Name>.json` is downloaded; the Selected Employee panel shows the employee's name and id.
**Business Rule**: Admins can export an employee's personal data (GDPR access request).
**Suggested Layer**: E2E

### TC-005: Access Records resolves and displays the selected employee before download
**Category**: Happy Path
**Preconditions**: Module unlocked on Access Records.
**Steps**: 1) Select an employee and click Search.
**Expected Results**: "Selected Employee" panel appears with disabled Full Name (First/Middle/Last) and Employee Id, plus a Download button.
**Business Rule**: The employee must be resolved before the export is offered.
**Suggested Layer**: E2E

### TC-006: Cancel on the Administrator Access screen leaves the module
**Category**: Happy Path
**Preconditions**: On the Administrator Access screen.
**Steps**: 1) Click **Cancel**.
**Expected Results**: The user is navigated out of the Maintenance module (no access granted).
**Business Rule**: The gate is skippable only by leaving.
**Suggested Layer**: E2E

### TC-007: Switching between Purge Records and Access Records tabs
**Category**: Happy Path
**Preconditions**: Module unlocked.
**Steps**: 1) Click **Access Records**, then **Purge Records**.
**Expected Results**: URL toggles between `/maintenance/accessEmployeeData` and `/maintenance/purgeEmployee`; correct heading each time.
**Business Rule**: Both sub-features live under the same unlocked session.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Purge autocomplete lists only past (terminated) employees
**Category**: Business Rule
**Preconditions**: At least one current and one terminated employee exist; module unlocked.
**Steps**: 1) On Purge Employee Records, type a fragment matching a *current* employee. 2) Observe hints.
**Expected Results**: The current (non-terminated) employee is NOT offered; only terminated matches appear (`includeEmployees=onlyPast`).
**Business Rule**: Only past employees can be purged.
**Suggested Layer**: E2E (dropdown) + API (query contract)

### TC-101: Access autocomplete lists current AND past employees
**Category**: Business Rule
**Preconditions**: Current employees exist; module unlocked.
**Steps**: 1) On Access Records type a name fragment. 2) Observe hints.
**Expected Results**: Current employees appear (`includeEmployees=currentAndPast`).
**Business Rule**: Personal-data export is available for current and past employees.
**Suggested Layer**: E2E + API

### TC-102: Correct password grants access; wrong password denies it
**Category**: Business Rule
**Preconditions**: Admin logged in.
**Steps**: 1) Submit gate with the wrong password. 2) Submit again with the correct password.
**Expected Results**: Wrong → "Invalid credentials", stays on `/auth/adminVerify`; correct → redirect to `/maintenance/purgeEmployee`.
**Business Rule**: Gate validates the admin's own password server-side.
**Suggested Layer**: E2E

### TC-103: Access gate re-prompts on every module entry
**Category**: Business Rule
**Preconditions**: Module previously unlocked, then navigated away.
**Steps**: 1) Unlock the module. 2) Navigate to Dashboard. 3) Return to `/maintenance/viewMaintenanceModule`.
**Expected Results**: The Administrator Access screen appears again (unlock is not cached).
**Business Rule**: Each critical-function entry re-authenticates.
**Suggested Layer**: E2E

### TC-104: Purge permanently anonymizes the employee
**Category**: Business Rule
**Preconditions**: A terminated employee has been purged.
**Steps**: 1) After purge, search the name via `currentAndPast`; 2) `GET /pim/employees/{empNumber}`.
**Expected Results**: Name search returns no record; direct GET returns 422 — data is gone/anonymized and non-recoverable.
**Business Rule**: Purge is irreversible.
**Suggested Layer**: API + E2E

### TC-105: Username field on the gate is fixed to the logged-in admin
**Category**: Business Rule
**Preconditions**: On the Administrator Access screen.
**Steps**: 1) Inspect the Username field.
**Expected Results**: Username is pre-filled with the current admin and disabled (cannot re-auth as another user).
**Business Rule**: Re-auth is bound to the current session identity.
**Suggested Layer**: E2E

---

## Security (TC-200–299)

### TC-200: ESS user has no Maintenance menu and cannot open the module
**Category**: Security
**Preconditions**: Logged in as ESS.
**Steps**: 1) Inspect the sidebar. 2) Navigate to `/maintenance/viewMaintenanceModule`.
**Expected Results**: No Maintenance menu item; direct URL is blocked (redirect / "Credential Required" / forbidden).
**Business Rule**: Maintenance is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot purge via the API
**Category**: Security
**Preconditions**: ESS session.
**Steps**: 1) `DELETE /api/v2/maintenance/purge` with an employee payload.
**Expected Results**: 403 / Unauthorized; no data purged.
**Business Rule**: API enforces admin authorization on purge.
**Suggested Layer**: API

### TC-202: ESS cannot download personal data via Access Records URL
**Category**: Security
**Preconditions**: ESS session.
**Steps**: 1) Navigate to `/maintenance/accessEmployeeData`.
**Expected Results**: Blocked (redirect / credential required).
**Business Rule**: Server-side route guard on the maintenance module.
**Suggested Layer**: E2E

### TC-203: The password gate protects direct deep-links to sub-pages
**Category**: Security
**Preconditions**: Admin logged in but module not unlocked this visit.
**Steps**: 1) Navigate directly to `/maintenance/purgeEmployee` (or `/accessEmployeeData`).
**Expected Results**: Administrator Access screen appears first; sub-page not reachable without confirming.
**Business Rule**: All maintenance sub-pages sit behind the gate.
**Suggested Layer**: E2E

### TC-204: Purge autocomplete cannot be tricked into surfacing current employees
**Category**: Security
**Preconditions**: Module unlocked.
**Steps**: 1) Query the past-employee endpoint with a current employee's exact id/name.
**Expected Results**: Empty result — the `onlyPast` filter is enforced server-side, not just in the UI.
**Business Rule**: Active employees are never purge-eligible.
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Empty password submit is rejected
**Category**: Negative
**Preconditions**: On the Administrator Access screen.
**Steps**: 1) Leave Password empty. 2) Click Confirm.
**Expected Results**: Access denied — inline "Required" error or "Invalid credentials"; no redirect to sub-page.
**Business Rule**: Password is mandatory.
**Suggested Layer**: E2E

### TC-301: Wrong password shows "Invalid credentials"
**Category**: Negative
**Preconditions**: On the Administrator Access screen.
**Steps**: 1) Enter a wrong password. 2) Confirm.
**Expected Results**: Red alert "Invalid credentials"; remains on `/auth/adminVerify`.
**Business Rule**: Only the correct password unlocks the module.
**Suggested Layer**: E2E

### TC-302: Search with no employee selected is blocked
**Category**: Negative
**Preconditions**: Module unlocked on Purge (or Access) form.
**Steps**: 1) Click **Search** with the autocomplete empty.
**Expected Results**: "Required" validation under the field; no Selected Employee panel appears.
**Business Rule**: Employee selection is mandatory before Search.
**Suggested Layer**: E2E

### TC-303: Free-typed name that is not a valid selection is rejected
**Category**: Negative
**Preconditions**: Module unlocked on Purge/Access form.
**Steps**: 1) Type a random string (no hint chosen). 2) Click Search.
**Expected Results**: "Invalid" / "Required" — Search does not proceed with an unresolved employee.
**Business Rule**: The field must hold a resolved employee, not free text.
**Suggested Layer**: E2E

### TC-304: Purge with no matching past employee → "No Records Found"
**Category**: Negative
**Preconditions**: No terminated employee matches the query; module unlocked.
**Steps**: 1) Type a fragment with no terminated match.
**Expected Results**: Autocomplete shows a single "No Records Found" option; cannot proceed.
**Business Rule**: Purge requires an existing past employee.
**Suggested Layer**: E2E

### TC-305: Cancel on the Purge confirmation aborts the purge
**Category**: Negative
**Preconditions**: A terminated employee is selected; Purge dialog open.
**Steps**: 1) Click **No, Cancel**.
**Expected Results**: Dialog closes; no DELETE fired; the employee still exists.
**Business Rule**: Destructive action requires explicit confirmation.
**Suggested Layer**: E2E

### TC-306: Purge of a non-past employee via API is rejected
**Category**: Negative
**Preconditions**: A current (active) employee.
**Steps**: 1) `DELETE /api/v2/maintenance/purge` targeting an active employee.
**Expected Results**: Error (4xx) — active employees are not purge-eligible.
**Business Rule**: Server enforces purge eligibility.
**Suggested Layer**: API

---

## Edge Cases (TC-400–499)

### TC-400: Purge an employee whose only distinguishing data is unicode/special characters
**Category**: Edge Case
**Preconditions**: A terminated employee named with unicode (e.g. "Zoë O'Néil").
**Steps**: 1) Search, select, and purge.
**Expected Results**: Autocomplete matches and purge succeeds; no encoding errors.
**Suggested Layer**: E2E

### TC-401: Autocomplete matches by Employee Id as well as name
**Category**: Edge Case
**Preconditions**: A terminated employee with a known id; module unlocked.
**Steps**: 1) Type the employee id in the Purge autocomplete.
**Expected Results**: The employee is offered (`nameOrId` matches id too).
**Suggested Layer**: E2E

### TC-402: Two past employees with the same name are individually distinguishable
**Category**: Edge Case
**Preconditions**: Two terminated employees share a full name.
**Steps**: 1) Type the shared name.
**Expected Results**: Both appear as separate options; selecting one resolves the correct id in the panel.
**Suggested Layer**: E2E

### TC-403: Download personal data for a *past* (terminated, not purged) employee
**Category**: Edge Case
**Preconditions**: A terminated but not-yet-purged employee.
**Steps**: 1) On Access Records, select the past employee and Download.
**Expected Results**: `<Name>.json` downloads (Access covers currentAndPast).
**Suggested Layer**: E2E

### TC-404: Re-searching a different employee replaces the Selected Employee panel
**Category**: Edge Case
**Preconditions**: A Selected Employee panel is already shown.
**Steps**: 1) Type and select a different employee. 2) Search again.
**Expected Results**: The panel updates to the new employee (no stale data).
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Administrator Access screen renders its warning copy and controls
**Category**: UI State
**Steps**: 1) Enter the module.
**Expected Results**: Heading "Administrator Access", the "critical Administrator function… validate your credentials" copy, disabled Username, Password field, Cancel + Confirm buttons.
**Suggested Layer**: E2E

### TC-501: Purge confirmation dialog content
**Category**: UI State
**Steps**: 1) Reach the Purge dialog.
**Expected Results**: Title "Purge Employee"; body "You are about to purge the employee permanently. Are you sure you want to continue? This operation cannot be undone"; "No, Cancel" / "Yes, Purge" buttons.
**Suggested Layer**: E2E

### TC-502: Selected Employee fields are read-only
**Category**: UI State
**Steps**: 1) Select an employee (Purge or Access).
**Expected Results**: First/Middle/Last Name and Employee Id inputs are disabled (display-only).
**Suggested Layer**: E2E

### TC-503: Invalid-credentials alert appears and clears on retry
**Category**: UI State
**Steps**: 1) Submit wrong password → alert. 2) Submit correct password.
**Expected Results**: Red "Invalid credentials" alert shown, then cleared on successful unlock.
**Suggested Layer**: E2E

### TC-504: Default landing sub-page is Purge Records
**Category**: UI State
**Steps**: 1) Unlock the module.
**Expected Results**: Lands on `/maintenance/purgeEmployee` with "Purge Records" tab active.
**Suggested Layer**: E2E

### TC-505: "No Records Found" empty option in the autocomplete
**Category**: UI State
**Steps**: 1) Type a fragment with no match in either autocomplete.
**Expected Results**: A single non-selectable "No Records Found" option is displayed.
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 36**
- Happy Path: 7 · Business Rules: 6 · Security: 5 · Negative: 7 · Edge Cases: 5 · UI State: 6
