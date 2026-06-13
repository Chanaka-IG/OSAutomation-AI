# Test Scenarios — PIM → Custom Fields

**Feature**: PIM → Configuration → Custom Fields
**List URL**: `/web/index.php/pim/listCustomFields` · **Add URL**: `/web/index.php/pim/saveCustomFields`
**List API**: `GET /api/v2/pim/custom-fields?limit=50&offset=0` · **Save API**: `POST /api/v2/pim/custom-fields`
**Payload**: `{ fieldName, screen, fieldType, extraData }` — `fieldType` 0 = Text or Number, 1 = Drop Down; `screen` is a lowercased key (e.g. "personal"); `extraData` = comma-separated options (Drop Down only).

## Page Facts (discovered live, OrangeHRM OS 5.8)
- List heading "Custom Fields" (`<h6>`); a `<p>` reads **"Remaining number of custom fields: N"** — **maximum 10** custom fields per instance. Columns: **Custom Field Name | Screen | Field Type**. Each row has edit + delete (trash) icon buttons.
- Add form ("Add Custom Field"):
  - **Field Name*** — text. Empty → "Required"; duplicate → live **"Already exists"** (unique).
  - **Screen*** — OXD select: Personal Details, Contact Details, Emergency Contacts, Dependents, Immigration, Job, Salary, Tax Exemptions, Report-to, Qualifications, Memberships.
  - **Type*** — OXD select: **"Text or Number"** | **"Drop Down"**. Selecting Drop Down reveals **Select Options*** ("Enter allowed options separated by commas").
- Empty save → three "Required" errors (Field Name, Screen, Type). Save → success toast `.oxd-toast--success` **"Successfully Saved"**, redirect to list.
- Delete → confirm dialog ("Are you Sure?" / "No, Cancel" / "Yes, Delete"). The Remaining counter **decrements on create, increments on delete** (instance-wide, cap 10).
- Access: **Admin only**. ESS has no PIM/Admin menu; deep-link → "Credential Required", no Add.

---

## Happy Path (TC-001–099)

### TC-001: Add a Text-or-Number custom field
**Category**: Happy Path
**Preconditions**: Admin on the Add form; < 10 fields exist.
**Steps**:
1. Enter a unique Field Name.
2. Select Screen = Personal Details.
3. Select Type = Text or Number.
4. Save.
**Expected Results**: "Successfully Saved"; redirect to list; new row shows Name / Screen "Personal Details" / Field Type "Text or Number"; Remaining counter decremented by 1. POST body `{fieldName, screen:"personal", fieldType:0, extraData:null/""}`.
**Business Rule**: A text custom field needs only Name + Screen + Type.
**Suggested Layer**: E2E

### TC-002: Add a Drop Down custom field with options
**Category**: Happy Path
**Preconditions**: Admin on the Add form.
**Steps**:
1. Enter a unique Field Name; Screen = Personal Details.
2. Select Type = Drop Down → the Select Options field appears.
3. Enter "Red, Green, Blue"; Save.
**Expected Results**: Toast; list row shows Field Type "Drop Down"; POST `fieldType:1, extraData:"Red, Green, Blue"`.
**Business Rule**: Drop Down requires options.
**Suggested Layer**: E2E

### TC-003: Newly created field is retrievable via the list API
**Category**: Happy Path
**Preconditions**: A field was just created.
**Steps**:
1. `GET /api/v2/pim/custom-fields`.
**Expected Results**: Response contains the field with matching fieldName/screen/fieldType/extraData.
**Business Rule**: Saved field persists.
**Suggested Layer**: API

### TC-004: Created field appears on the target Screen of an employee record
**Category**: Happy Path
**Preconditions**: A Text field on "Personal Details" exists.
**Steps**:
1. Open an employee's Personal Details.
**Expected Results**: The custom field renders (by its name) on that screen; not on other screens.
**Business Rule**: A custom field is scoped to its selected Screen.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Duplicate Field Name is rejected (live)
**Category**: Business Rule
**Preconditions**: A field named "X" exists.
**Steps**:
1. On Add, type "X" in Field Name.
**Expected Results**: Inline "Already exists"; save blocked / no second record.
**Business Rule**: Field Name is unique.
**Suggested Layer**: E2E

### TC-101: Drop Down requires options (Select Options is mandatory)
**Category**: Business Rule
**Preconditions**: On Add, Type = Drop Down.
**Steps**:
1. Fill Name + Screen; leave Select Options empty; Save.
**Expected Results**: "Required" on Select Options; save blocked.
**Business Rule**: Drop Down fields must define options.
**Suggested Layer**: E2E

### TC-102: Maximum of 10 custom fields enforced
**Category**: Business Rule
**Preconditions**: 10 fields exist (Remaining = 0).
**Steps**:
1. Attempt to add an 11th (open Add / Save).
**Expected Results**: Add is blocked or errors; Remaining shows 0; no 11th record created.
**Business Rule**: Hard cap of 10 custom fields.
**Suggested Layer**: E2E / API

### TC-103: Remaining counter reflects current field count
**Category**: Business Rule
**Preconditions**: Known count N.
**Steps**:
1. Create one; observe counter. Delete one; observe counter.
**Expected Results**: Counter = 10 − count; decrements on create, increments on delete.
**Business Rule**: Counter = cap − used.
**Suggested Layer**: E2E

### TC-104: Field type & screen map correctly in the payload
**Category**: Business Rule
**Steps**:
1. Save Drop Down on "Contact Details"; inspect POST.
**Expected Results**: `fieldType:1`, `screen:"contact"` (lowercased key), `extraData` set.
**Business Rule**: UI selections map 1:1 to the API contract.
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-200: ESS cannot access the Custom Fields page
**Category**: Security
**Preconditions**: Logged in as ESS.
**Steps**:
1. Confirm no PIM/Admin menu.
2. Deep-link to `/pim/listCustomFields` and `/pim/saveCustomFields`.
**Expected Results**: "Credential Required"; no Add; no Save.
**Business Rule**: Configuration is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a custom field via the API
**Category**: Security
**Steps**:
1. `POST /api/v2/pim/custom-fields` as ESS.
**Expected Results**: 403/401; no record created.
**Business Rule**: API enforces the same role restriction.
**Suggested Layer**: API

### TC-202: Script payload in Field Name stored inert (no XSS)
**Category**: Security
**Steps**:
1. Save Field Name `<script>alert('xss')</script>`; view the list.
**Expected Results**: Rendered as literal text; no dialog; no inline script executes.
**Business Rule**: Output is escaped.
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Empty save shows Required on all three fields
**Category**: Negative
**Steps**:
1. Click Save on an empty Add form.
**Expected Results**: "Required" on Field Name, Screen, and Type; stays on form; no record.
**Business Rule**: All three are mandatory.
**Suggested Layer**: E2E

### TC-301: Only Field Name filled — Screen/Type still required
**Category**: Negative
**Steps**:
1. Fill Name only; Save.
**Expected Results**: "Required" on Screen and Type; no record.
**Business Rule**: Partial completion is rejected.
**Suggested Layer**: E2E

### TC-302: Switching Type from Drop Down to Text hides/clears options
**Category**: Negative
**Steps**:
1. Type = Drop Down, enter options; switch Type = Text or Number; Save.
**Expected Results**: Select Options field disappears; saved as Text with no extraData.
**Business Rule**: Options only apply to Drop Down.
**Suggested Layer**: E2E

### TC-303: Whitespace-only Field Name rejected
**Category**: Negative
**Steps**:
1. Field Name = spaces; Screen + Type set; Save.
**Expected Results**: Treated as empty → "Required"; no record.
**Business Rule**: Name must be meaningful.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Maximum-length Field Name
**Category**: Edge Case
**Steps**:
1. Enter a very long name (100+ chars); Save.
**Expected Results**: Saved up to the schema limit or an inline length error; UI and stored value consistent.
**Business Rule**: Name length bounded.
**Suggested Layer**: E2E

### TC-401: Drop Down with a single option
**Category**: Edge Case
**Steps**:
1. Type = Drop Down, options = "Only"; Save.
**Expected Results**: Saved; extraData = "Only"; the dropdown later offers that single option.
**Business Rule**: One option is valid.
**Suggested Layer**: E2E

### TC-402: Drop Down options with extra spaces / trailing comma
**Category**: Edge Case
**Steps**:
1. Options = "A,  B , C," ; Save.
**Expected Results**: Options normalized/trimmed (no empty option from the trailing comma).
**Business Rule**: Option parsing trims and ignores empties.
**Suggested Layer**: E2E

### TC-403: Same Field Name allowed on a different Screen?
**Category**: Edge Case
**Steps**:
1. Create "Tier" on Personal Details; attempt "Tier" on Contact Details.
**Expected Results**: Documents whether uniqueness is global (live "Already exists") or per-screen.
**Business Rule**: Clarifies the scope of the uniqueness rule.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Add form default layout
**Category**: UI State
**Steps**:
1. Open the Add form.
**Expected Results**: "Add Custom Field" heading; Field Name empty; Screen + Type both "-- Select --"; no Select Options field; "* Required"; Cancel + Save.
**Business Rule**: Options field is conditional on Type.
**Suggested Layer**: E2E

### TC-501: Select Options appears only for Drop Down
**Category**: UI State
**Steps**:
1. Select Type = Drop Down → field appears; switch to Text or Number → field disappears.
**Expected Results**: Conditional rendering of Select Options.
**Business Rule**: Type drives the visible fields.
**Suggested Layer**: E2E

### TC-502: Empty list state
**Category**: UI State
**Preconditions**: No custom fields.
**Steps**:
1. Open the list.
**Expected Results**: "No Records Found"; Remaining = 10; Add present.
**Business Rule**: Empty-state messaging.
**Suggested Layer**: E2E

### TC-503: Cancel returns to list without creating
**Category**: UI State
**Steps**:
1. Fill the form; Cancel.
**Expected Results**: Redirect to list; no new row; counter unchanged.
**Business Rule**: Cancel discards input.
**Suggested Layer**: E2E

---

## Coverage Summary
- **Happy Path**: 4 (TC-001–004)
- **Business Rules**: 5 (TC-100–104)
- **Security**: 3 (TC-200–202)
- **Negative**: 4 (TC-300–303)
- **Edge Cases**: 4 (TC-400–403)
- **UI State**: 4 (TC-500–503)
- **Total**: 24
