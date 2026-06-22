# Test Scenarios — Claim → Expense Types

**Feature:** Admin → Claim → Configuration → Expense Types (claim expense-type master data)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8)

**Routes:** list `/web/index.php/claim/viewExpense` · add `/claim/saveExpense` · edit `/claim/saveExpense/{id}`
**API:** GET/POST `/api/v2/claim/expenses/types` · PUT `/api/v2/claim/expenses/types/{id}` · DELETE `/api/v2/claim/expenses/types` `{ids}`
**Record shape:** `{ id, name, description, status: boolean }` (status `true`=Active / `false`=Inactive)
**Form:** `Name*` (required), `Description` (optional), `Active` (OXD switch, on by default)

---

## Happy Path (TC-001–099)

### TC-001: Admin adds a new active expense type with name + description
**Category**: Happy Path
**Preconditions**: Logged in as Admin; on Expense Types list.
**Steps**: 1) Click **Add**. 2) Enter unique Name. 3) Enter Description. 4) Leave **Active** on. 5) Save.
**Expected Results**: Toast "Successfully Saved"; type appears in list with Status = **Active**.
**Business Rule**: Expense-type master data is created with name + optional description + active flag.
**Suggested Layer**: E2E

### TC-002: Admin adds an expense type with only the required Name
**Category**: Happy Path
**Preconditions**: Admin on Add Expense Type form.
**Steps**: 1) Enter unique Name. 2) Leave Description blank. 3) Save.
**Expected Results**: Toast "Successfully Saved"; listed as Active.
**Business Rule**: Description is optional; Active defaults on.
**Suggested Layer**: E2E

### TC-003: Admin adds an inactive expense type (Active off)
**Category**: Happy Path
**Steps**: 1) Enter unique name. 2) Turn **Active** off. 3) Save.
**Expected Results**: Listed with Status = **Inactive**.
**Business Rule**: Status flag set from the Active switch.
**Suggested Layer**: E2E

### TC-004: Admin edits an expense type's name/description
**Category**: Happy Path
**Preconditions**: A type exists.
**Steps**: 1) Click pencil (edit). 2) Change name + description. 3) Save.
**Expected Results**: Heading "Edit Expense Type"; toast "Successfully Updated"; list reflects new values.
**Business Rule**: Types are editable.
**Suggested Layer**: E2E

### TC-005: Admin toggles status via edit (Active → Inactive)
**Category**: Happy Path
**Steps**: 1) Edit an active type. 2) Turn Active off. 3) Save.
**Expected Results**: List Status shows Inactive.
**Business Rule**: Status is mutable via edit.
**Suggested Layer**: E2E

### TC-006: Admin deletes an expense type via the confirmation dialog
**Category**: Happy Path
**Steps**: 1) Click trash. 2) Confirm "Yes, Delete".
**Expected Results**: Toast "Successfully Deleted"; row removed; count decremented.
**Business Rule**: Types are hard-deleted.
**Suggested Layer**: E2E

### TC-007: Cancel on Add form returns to list without creating
**Category**: Happy Path
**Steps**: 1) Enter a name. 2) Click **Cancel**.
**Expected Results**: Returns to list; no new record.
**Business Rule**: Cancel discards input.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Name must be unique
**Category**: Business Rule
**Preconditions**: A type named X exists.
**Steps**: 1) Add a new type named X. 2) Save.
**Expected Results**: Inline "Already exists"; not saved.
**Business Rule**: Uniqueness enforced (API 422 `invalidParamKeys:["name"]`).
**Suggested Layer**: E2E (message) + API (422)

### TC-101: Name is required
**Category**: Business Rule
**Steps**: 1) Leave name empty. 2) Save.
**Expected Results**: Inline "Required"; not saved.
**Business Rule**: Name mandatory.
**Suggested Layer**: E2E (inline) + API (422)

### TC-102: Active is the default status on Add
**Category**: Business Rule
**Steps**: 1) Open Add form. 2) Observe Active switch.
**Expected Results**: Active is on by default.
**Business Rule**: New types default Active.
**Suggested Layer**: Component / E2E

### TC-104: Description is optional
**Category**: Business Rule
**Steps**: 1) Create with name only.
**Expected Results**: Saved; description nullable.
**Suggested Layer**: API

### TC-105: Uniqueness enforced on edit (rename collision)
**Category**: Business Rule
**Preconditions**: Types X and Y exist.
**Steps**: 1) Edit Y → rename to X → Save.
**Expected Results**: "Already exists"; not saved.
**Business Rule**: Uniqueness applies to updates.
**Suggested Layer**: E2E + API

### TC-106: Only active expense types are selectable when adding a claim expense
**Category**: Business Rule
**Preconditions**: One active + one inactive type; an active event; a submitted claim.
**Steps**: 1) Submit Claim → open the claim → Add Expense → open the Expense Type dropdown.
**Expected Results**: Active type present; inactive absent.
**Business Rule**: Status governs downstream availability.
**Suggested Layer**: E2E (deferred — see priority doc; requires creating persistent claim data)

---

## Security (TC-200–299)

### TC-200: ESS user has no Expense Types configuration access
**Category**: Security
**Steps**: 1) As ESS, navigate to `/claim/viewExpense`.
**Expected Results**: "Credential Required"; no Add button.
**Business Rule**: Config is admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a type via API
**Category**: Security
**Steps**: 1) ESS POST `/api/v2/claim/expenses/types`.
**Expected Results**: 403 / Forbidden.
**Suggested Layer**: API

### TC-202: ESS direct access to Add/Edit URL blocked
**Category**: Security
**Steps**: 1) As ESS, navigate to `/claim/saveExpense`.
**Expected Results**: "Credential Required".
**Suggested Layer**: E2E

### TC-203: XSS / special chars in name escaped on display
**Category**: Security
**Steps**: 1) Create type named `<script>alert(1)</script>`. 2) View list.
**Expected Results**: Rendered as inert text; no script executes.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Whitespace-only name rejected
**Category**: Negative
**Steps**: 1) Enter "   ". 2) Save.
**Expected Results**: "Required"; not saved.
**Suggested Layer**: E2E

### TC-301: Duplicate name on add → no partial save
**Category**: Negative
**Steps**: 1) Add duplicate name. 2) Save.
**Expected Results**: "Already exists"; count unchanged.
**Suggested Layer**: E2E

### TC-302: Over-long name rejected by server
**Category**: Negative
**Steps**: 1) POST a name beyond column limit.
**Expected Results**: 422 Invalid Parameter.
**Suggested Layer**: API

### TC-303: Create via API with missing name
**Category**: Negative
**Steps**: 1) POST `{ description, status }` without name.
**Expected Results**: 422 `invalidParamKeys:["name"]`.
**Suggested Layer**: API

### TC-304: Cancel on Delete dialog keeps the record
**Category**: Negative
**Steps**: 1) Click trash. 2) "No, Cancel".
**Expected Results**: Dialog closes; record present.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Name at maximum allowed length boundary
**Category**: Edge Case
**Suggested Layer**: API

### TC-401: Unicode / special characters in name accepted
**Category**: Edge Case
**Steps**: 1) Create "Per-diem — Café ☕ 出張".
**Expected Results**: Saved and rendered verbatim.
**Suggested Layer**: E2E

### TC-402: Leading/trailing spaces trimmed on save
**Category**: Edge Case
**Suggested Layer**: API

### TC-403: Case-variant name vs existing (uniqueness sensitivity)
**Category**: Edge Case
**Suggested Layer**: API

### TC-404: Many types render with pagination (> 50)
**Category**: Edge Case
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Empty list shows "No Records Found"
**Category**: UI State
**Suggested Layer**: E2E

### TC-501: Record count reflects list size
**Category**: UI State
**Suggested Layer**: E2E

### TC-502: Inline "Required" appears then clears
**Category**: UI State
**Suggested Layer**: Component / E2E

### TC-503: Delete confirmation dialog content
**Category**: UI State
**Suggested Layer**: E2E

### TC-504: Success toast on add / edit / delete
**Category**: UI State
**Suggested Layer**: E2E

### TC-505: Active/Inactive rendered in Status column
**Category**: UI State
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 31**
- Happy Path: 7 · Business Rules: 6 · Security: 4 · Negative: 5 · Edge Cases: 5 · UI State: 6 (TC-502 counted under UI State)
