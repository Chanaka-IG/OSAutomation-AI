# Test Scenarios — PIM → Reporting Methods

**Feature**: PIM → Configuration → Reporting Methods
**List URL**: `/web/index.php/pim/viewReportingMethods` · **Add URL**: `/web/index.php/pim/saveReportingMethod`
**List API**: `GET /api/v2/pim/reporting-methods?limit=50&offset=0` · **Save API**: `POST /api/v2/pim/reporting-methods`
**Payload**: `{ name }`

## Page Facts (discovered live, OrangeHRM OS 5.8)
- List title is a `<p>` "Reporting Methods"; " Add" button; "(N) Records Found"; single **Name** column; each row has edit + delete (trash) icon buttons. **Default seeded data: "Direct", "Indirect"** (treat read-only).
- Add form (title `<p>` "Add Reporting Method"): single **Name*** text field; Cancel + Save.
- Empty save → inline **"Required"**; duplicate name → live **"Already exists"** (unique).
- Save → success toast `.oxd-toast--success` **"Successfully Saved"**, redirect to list.
- Delete → confirm dialog ("Are you Sure?" / "No, Cancel" / "Yes, Delete").
- **Integration**: a created method appears in the employee **Report-to** tab → Add Supervisor/Subordinate inline form → **Reporting Method** dropdown.
- Access: **Admin only**. ESS has no PIM/Admin menu; deep-link → "Credential Required", no Add.

---

## Happy Path (TC-001–099)

### TC-001: Add a reporting method
**Category**: Happy Path
**Preconditions**: Admin on the Add form.
**Steps**:
1. Enter a unique Name.
2. Save.
**Expected Results**: "Successfully Saved"; redirect to list; new row visible; record count incremented. POST body `{name}`.
**Business Rule**: A reporting method needs only a unique name.
**Suggested Layer**: E2E

### TC-002: Newly created method is retrievable via the list API
**Category**: Happy Path
**Steps**:
1. `GET /api/v2/pim/reporting-methods`.
**Expected Results**: Response contains the created method with matching name + an id.
**Business Rule**: Saved method persists.
**Suggested Layer**: API

### TC-003: Created method appears in the Report-to dropdown
**Category**: Happy Path
**Preconditions**: A method "X" exists.
**Steps**:
1. Open an employee's Report-to tab → Add (Assigned Supervisors).
2. Open the Reporting Method dropdown.
**Expected Results**: "X" is listed as an option.
**Business Rule**: Reporting methods feed the Report-to relationship form.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Duplicate name rejected (live)
**Category**: Business Rule
**Preconditions**: A method named "Direct" exists (default).
**Steps**:
1. On Add, type "Direct".
**Expected Results**: Inline "Already exists"; save blocked; no second record.
**Business Rule**: Reporting-method name is unique.
**Suggested Layer**: E2E

### TC-101: Duplicate is case-insensitive
**Category**: Business Rule
**Steps**:
1. Type "direct" (lower-case) on Add.
**Expected Results**: "Already exists" (case-insensitive uniqueness) — or documents the actual behavior.
**Business Rule**: Uniqueness ignores case.
**Suggested Layer**: E2E

### TC-102: name maps 1:1 in the payload
**Category**: Business Rule
**Steps**:
1. Save a new method; inspect POST.
**Expected Results**: Body `{name:"<typed>"}`; trimmed if leading/trailing spaces.
**Business Rule**: UI value maps to the API contract.
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-200: ESS cannot access the Reporting Methods page
**Category**: Security
**Preconditions**: Logged in as ESS.
**Steps**:
1. Confirm no PIM/Admin menu.
2. Deep-link to `/pim/viewReportingMethods` and `/pim/saveReportingMethod`.
**Expected Results**: "Credential Required"; no Add; no Save.
**Business Rule**: Configuration is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a method via the API
**Category**: Security
**Steps**:
1. `POST /api/v2/pim/reporting-methods` as ESS.
**Expected Results**: 403/401; no record created.
**Business Rule**: API enforces the role restriction.
**Suggested Layer**: API

### TC-202: Script payload in Name stored inert (no XSS)
**Category**: Security
**Steps**:
1. Save Name `<script>alert('xss')</script>`; view the list.
**Expected Results**: Rendered as literal text; no dialog; no inline script executes.
**Business Rule**: Output is escaped.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Empty save shows Required
**Category**: Negative
**Steps**:
1. Click Save on an empty Add form.
**Expected Results**: "Required" on Name; stays on form; no record.
**Business Rule**: Name is mandatory.
**Suggested Layer**: E2E

### TC-301: Whitespace-only name rejected
**Category**: Negative
**Steps**:
1. Name = spaces; Save.
**Expected Results**: Treated as empty → "Required" (or trimmed and rejected); no record.
**Business Rule**: Name must be meaningful.
**Suggested Layer**: E2E

### TC-302: Duplicate error clears when name is edited
**Category**: Negative
**Steps**:
1. Type "Direct" → "Already exists"; change to a unique value.
**Expected Results**: Error clears; Save enabled.
**Business Rule**: Validation re-runs on change.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Maximum-length name
**Category**: Edge Case
**Steps**:
1. Enter a very long name (100+ chars); Save.
**Expected Results**: Saved up to the schema limit or an inline length error; UI and stored value consistent.
**Business Rule**: Name length bounded.
**Suggested Layer**: E2E

### TC-401: Name with surrounding spaces / unicode
**Category**: Edge Case
**Steps**:
1. Name = " Région ✦ " ; Save.
**Expected Results**: Saved (trimmed); list shows stored value; uniqueness compares normalized value.
**Business Rule**: Name normalization on save.
**Suggested Layer**: E2E

### TC-402: Delete a method removes it and updates the count
**Category**: Edge Case
**Preconditions**: A deletable (non-default) method exists.
**Steps**:
1. Delete it via the trash icon + confirm.
**Expected Results**: Row removed; count decremented; it no longer appears in the Report-to dropdown.
**Business Rule**: Deletion is immediate and propagates.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Add form default layout
**Category**: UI State
**Steps**:
1. Open the Add form.
**Expected Results**: "Add Reporting Method" title; empty Name; "* Required"; Cancel + Save.
**Business Rule**: Minimal single-field form.
**Suggested Layer**: E2E

### TC-501: List shows default methods
**Category**: UI State
**Steps**:
1. Open the list.
**Expected Results**: "Direct" and "Indirect" rows present; "(N) Records Found" counter.
**Business Rule**: Seeded defaults render.
**Suggested Layer**: E2E

### TC-502: Cancel returns to list without creating
**Category**: UI State
**Steps**:
1. Fill the form; Cancel.
**Expected Results**: Redirect to list; no new row; count unchanged.
**Business Rule**: Cancel discards input.
**Suggested Layer**: E2E

### TC-503: Delete confirmation dialog (No keeps, Yes removes)
**Category**: UI State
**Steps**:
1. Open delete dialog for a method; click "No, Cancel"; then "Yes, Delete".
**Expected Results**: No keeps the row; Yes removes it.
**Business Rule**: Destructive action is confirmed.
**Suggested Layer**: E2E

---

## Coverage Summary
- **Happy Path**: 3 (TC-001–003)
- **Business Rules**: 3 (TC-100–102)
- **Security**: 3 (TC-200–202)
- **Negative**: 3 (TC-300–302)
- **Edge Cases**: 3 (TC-400–402)
- **UI State**: 4 (TC-500–503)
- **Total**: 19
