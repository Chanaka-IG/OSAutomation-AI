# Test Scenarios — Claim → Events

**Feature:** Admin → Claim → Configuration → Events (claim event master data)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8)

**Routes:** list `/web/index.php/claim/viewEvents` · add `/claim/saveEvents` · edit `/claim/saveEvents/{id}`
**API:** GET/POST `/api/v2/claim/events` · PUT `/api/v2/claim/events/{id}` · DELETE `/api/v2/claim/events` `{ids}`
**Record shape:** `{ id, name, description, status: boolean }` (status `true`=Active / `false`=Inactive)

---

## Happy Path (TC-001–099)

### TC-001: Admin adds a new active event with name + description
**Category**: Happy Path
**Preconditions**: Logged in as Admin; on Events list.
**Steps**: 1) Click **Add**. 2) Enter unique Event Name. 3) Enter Description. 4) Leave **Active** checked. 5) Save.
**Expected Results**: Toast "Successfully Saved"; event appears in list with Status = **Active**.
**Business Rule**: Event master data is created with name + optional description + active flag.
**Suggested Layer**: E2E

### TC-002: Admin adds an event with only the required Event Name
**Category**: Happy Path
**Preconditions**: Admin on Add Event form.
**Steps**: 1) Enter unique Event Name. 2) Leave Description blank. 3) Save.
**Expected Results**: Toast "Successfully Saved"; event listed as Active.
**Business Rule**: Description is optional; Active defaults to checked.
**Suggested Layer**: E2E

### TC-003: Admin adds an inactive event (Active unchecked)
**Category**: Happy Path
**Preconditions**: Admin on Add Event form.
**Steps**: 1) Enter unique name. 2) Uncheck **Active**. 3) Save.
**Expected Results**: Event listed with Status = **Inactive**.
**Business Rule**: Status flag is set from the Active checkbox.
**Suggested Layer**: E2E

### TC-004: Admin edits an event's name/description
**Category**: Happy Path
**Preconditions**: An event exists.
**Steps**: 1) Click pencil (edit) on the row. 2) Change name + description. 3) Save.
**Expected Results**: Heading "Edit Event"; toast "Successfully Updated"; list reflects new values.
**Business Rule**: Events are editable.
**Suggested Layer**: E2E

### TC-005: Admin toggles an event's status via edit (Active → Inactive)
**Category**: Happy Path
**Preconditions**: An active event exists.
**Steps**: 1) Edit the event. 2) Uncheck Active. 3) Save.
**Expected Results**: List Status column shows Inactive.
**Business Rule**: Status is mutable via edit.
**Suggested Layer**: E2E

### TC-006: Admin deletes an event via the confirmation dialog
**Category**: Happy Path
**Preconditions**: An event exists.
**Steps**: 1) Click trash on the row. 2) Confirm "Yes, Delete".
**Expected Results**: Toast "Successfully Deleted"; row removed; count decremented.
**Business Rule**: Events are hard-deleted.
**Suggested Layer**: E2E

### TC-007: Cancel on Add form returns to list without creating
**Category**: Happy Path
**Preconditions**: Admin on Add Event form.
**Steps**: 1) Enter a name. 2) Click **Cancel**.
**Expected Results**: Returns to Events list; no new record.
**Business Rule**: Cancel discards input.
**Suggested Layer**: E2E

### TC-008: A new active event becomes selectable in Submit Claim
**Category**: Happy Path
**Preconditions**: An active event exists.
**Steps**: 1) Go to Claim → Submit Claim. 2) Open the Event dropdown.
**Expected Results**: The active event is listed as an option.
**Business Rule**: Active events feed the claim-submission Event dropdown.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Event Name must be unique
**Category**: Business Rule
**Preconditions**: An event named X exists.
**Steps**: 1) Add a new event with name X. 2) Save.
**Expected Results**: Inline "Already exists" under Event Name; not saved.
**Business Rule**: Name uniqueness enforced (API 422 `invalidParamKeys:["name"]`).
**Suggested Layer**: E2E (UI message) + API (422 contract)

### TC-101: Event Name is required
**Category**: Business Rule
**Preconditions**: Admin on Add Event form.
**Steps**: 1) Leave name empty. 2) Save.
**Expected Results**: Inline "Required" under Event Name; not saved.
**Business Rule**: Name is mandatory.
**Suggested Layer**: E2E (inline) + API (422)

### TC-102: Active is the default status on Add
**Category**: Business Rule
**Preconditions**: Admin opens Add Event form.
**Steps**: 1) Observe the Active checkbox.
**Expected Results**: Active is checked by default.
**Business Rule**: New events default to Active.
**Suggested Layer**: Component / E2E

### TC-103: Only active events are selectable when submitting a claim
**Category**: Business Rule
**Preconditions**: One active and one inactive event exist.
**Steps**: 1) Submit Claim → open Event dropdown.
**Expected Results**: Active event present; inactive event absent.
**Business Rule**: Status governs availability downstream.
**Suggested Layer**: E2E

### TC-104: Description is optional
**Category**: Business Rule
**Preconditions**: Admin on Add Event form.
**Steps**: 1) Enter name only. 2) Save.
**Expected Results**: Saved successfully (no description required).
**Business Rule**: Description nullable.
**Suggested Layer**: API

### TC-105: Uniqueness is enforced on edit (rename collision)
**Category**: Business Rule
**Preconditions**: Events X and Y exist.
**Steps**: 1) Edit Y. 2) Rename to X. 3) Save.
**Expected Results**: "Already exists"; not saved.
**Business Rule**: Uniqueness applies to updates too.
**Suggested Layer**: E2E + API

---

## Security (TC-200–299)

### TC-200: ESS user has no Claim → Configuration access
**Category**: Security
**Preconditions**: Logged in as ESS.
**Steps**: 1) Inspect Claim topbar / navigate to `/claim/viewEvents`.
**Expected Results**: No Configuration menu; direct URL → "Credential Required" / redirect.
**Business Rule**: Event config is admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create an event via API
**Category**: Security
**Preconditions**: ESS session.
**Steps**: 1) POST `/api/v2/claim/events`.
**Expected Results**: 403 / Forbidden; no record created.
**Business Rule**: API enforces admin authorization.
**Suggested Layer**: API

### TC-202: ESS direct access to Add/Edit URL blocked
**Category**: Security
**Preconditions**: ESS session.
**Steps**: 1) Navigate to `/claim/saveEvents`.
**Expected Results**: "Credential Required" / redirect.
**Business Rule**: Server-side route guard.
**Suggested Layer**: E2E

### TC-203: XSS / special chars in name are escaped on display
**Category**: Security
**Preconditions**: Admin.
**Steps**: 1) Create event with name `<script>alert(1)</script>`. 2) View list.
**Expected Results**: Rendered as inert text; no script execution.
**Business Rule**: Output encoding.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Whitespace-only name rejected
**Category**: Negative
**Steps**: 1) Enter "   " as name. 2) Save.
**Expected Results**: Treated as empty → "Required" (or trimmed-invalid); not saved.
**Business Rule**: Name must contain meaningful content.
**Suggested Layer**: E2E

### TC-301: Duplicate name on add shows error, not partial save
**Category**: Negative
**Steps**: 1) Add duplicate name. 2) Save.
**Expected Results**: "Already exists"; list count unchanged.
**Business Rule**: No duplicate persisted.
**Suggested Layer**: E2E

### TC-302: Over-long name rejected by server
**Category**: Negative
**Steps**: 1) POST name far beyond column limit.
**Expected Results**: 422 Invalid Parameter.
**Business Rule**: Length bound enforced server-side.
**Suggested Layer**: API

### TC-303: Create via API with missing name
**Category**: Negative
**Steps**: 1) POST `{ description, status }` without name.
**Expected Results**: 422 `invalidParamKeys:["name"]`.
**Business Rule**: Required field enforced at API.
**Suggested Layer**: API

### TC-304: Cancel on Delete dialog keeps the record
**Category**: Negative
**Steps**: 1) Click trash. 2) Click "No, Cancel".
**Expected Results**: Dialog closes; record still present.
**Business Rule**: Delete requires explicit confirmation.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Name at maximum allowed length boundary
**Category**: Edge Case
**Steps**: 1) Create event with name at the documented max length.
**Expected Results**: Saved; full value rendered.
**Suggested Layer**: API

### TC-401: Unicode / special characters in name accepted
**Category**: Edge Case
**Steps**: 1) Create event "Travel — Café ☕ 出張".
**Expected Results**: Saved and rendered verbatim.
**Suggested Layer**: E2E

### TC-402: Leading/trailing spaces trimmed on save
**Category**: Edge Case
**Steps**: 1) Create "  Mileage  ". 2) Inspect stored value.
**Expected Results**: Stored/displayed as "Mileage".
**Suggested Layer**: API

### TC-403: Case-variant name vs existing (uniqueness sensitivity)
**Category**: Edge Case
**Steps**: 1) Event "Travel" exists. 2) Add "travel".
**Expected Results**: Document observed behavior (accepted or "Already exists").
**Suggested Layer**: API

### TC-404: Many events render with pagination
**Category**: Edge Case
**Steps**: 1) Seed > 50 events. 2) View list.
**Expected Results**: Pagination control appears; counts correct.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Empty list shows "No Records Found"
**Category**: UI State
**Steps**: 1) View Events with none present.
**Expected Results**: "No Records Found" message; empty grid.
**Suggested Layer**: E2E

### TC-501: Record count reflects list size
**Category**: UI State
**Steps**: 1) With N events, view list.
**Expected Results**: "(N) Record(s) Found".
**Suggested Layer**: E2E

### TC-502: Inline "Required" appears then clears
**Category**: UI State
**Steps**: 1) Save empty → "Required". 2) Type a name.
**Expected Results**: Message clears once valid.
**Suggested Layer**: Component / E2E

### TC-503: Delete confirmation dialog content
**Category**: UI State
**Steps**: 1) Click trash.
**Expected Results**: "Are you Sure?" + permanent-delete copy + "No, Cancel"/"Yes, Delete".
**Suggested Layer**: E2E

### TC-504: Success toast on add / edit / delete
**Category**: UI State
**Steps**: 1) Perform each action.
**Expected Results**: "Successfully Saved" / "Successfully Updated" / "Successfully Deleted".
**Suggested Layer**: E2E

### TC-505: Active/Inactive rendered in Status column
**Category**: UI State
**Steps**: 1) View an active and an inactive event.
**Expected Results**: Status column shows "Active" / "Inactive".
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 31**
- Happy Path: 8 · Business Rules: 6 · Security: 4 · Negative: 5 · Edge Cases: 5 · UI State: 6 (TC-502 counted under UI State)
