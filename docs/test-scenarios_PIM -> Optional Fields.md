# Test Scenarios — PIM → Optional Fields

**Feature**: PIM → Configuration → Optional Fields
**URL**: `/web/index.php/pim/configurePim`
**Config API**: `GET /api/v2/pim/optional-field` · **Save API**: `PUT /api/v2/pim/optional-field`
**Payload**: `{ pimShowDeprecatedFields, showSIN, showSSN, showTaxExemptions }` (all boolean)

## Page Facts (discovered live, OrangeHRM OS 5.8)
- Page title is a `<p>` "Optional Fields" (not a heading). Sections are `<h6>`: **Show Deprecated Fields** and **Country Specific Information**.
- Four **OXD switch** toggles (hidden `input[type=checkbox]` behind a `span.oxd-switch-input` that intercepts clicks — toggle via the span; each lives in a `.orangehrm-optional-field-row`):
  | Toggle label | Payload key | Downstream effect |
  |---|---|---|
  | Show Nick Name, Smoker and Military Service in Personal Details | `pimShowDeprecatedFields` | Nick Name / Smoker / Military Service fields appear in Personal Details |
  | Show SSN field in Personal Details | `showSSN` | "SSN Number" field appears in Personal Details |
  | Show SIN field in Personal Details | `showSIN` | "SIN Number" field appears in Personal Details |
  | Show US Tax Exemptions menu | `showTaxExemptions` | US Tax Exemptions menu appears in the employee record |
- **Save** persists via PUT; success toast `.oxd-toast--success` = **"Successfully Saved"** (~3s auto-dismiss). No redirect (stays on the page).
- No required fields / no validation errors — pure boolean config.
- **The configuration is a single instance-wide singleton** (default on this instance: all four `false`). There is no per-record state.
- Access: **Admin only**. ESS has no PIM/Admin menu; deep-link renders "Credential Required" with no Save.

---

## Happy Path (TC-001–099)

### TC-001: Enable a single optional field and save
**Category**: Happy Path
**Preconditions**: Admin on `/pim/configurePim`; target toggle currently off.
**Steps**:
1. Toggle "Show SSN field in Personal Details" on.
2. Click Save.
**Expected Results**: "Successfully Saved" toast; PUT body has `showSSN:true` (others unchanged); on reload the SSN toggle is still on; `GET` reflects `showSSN:true`.
**Business Rule**: Each optional field can be independently enabled.
**Suggested Layer**: E2E

### TC-002: Disable a previously enabled field and save
**Category**: Happy Path
**Preconditions**: A toggle is currently on.
**Steps**:
1. Toggle it off.
2. Save.
**Expected Results**: Toast; the field's key becomes `false`; persists across reload.
**Business Rule**: Toggling is reversible.
**Suggested Layer**: E2E

### TC-003: Enable all four toggles in one save
**Category**: Happy Path
**Preconditions**: All toggles off.
**Steps**:
1. Toggle all four on.
2. Save.
**Expected Results**: Toast; PUT body all `true`; reload shows all four on.
**Business Rule**: Toggles are saved together in one request.
**Suggested Layer**: E2E

### TC-004: Saved state persists across navigation/reload
**Category**: Happy Path
**Preconditions**: A known mix saved (e.g. SSN on, SIN off).
**Steps**:
1. Navigate away and back to `/pim/configurePim`.
**Expected Results**: Toggle states match what was saved (driven by the GET).
**Business Rule**: Persistence + correct hydration from API.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Enabling "Show SSN" surfaces the SSN field in Personal Details
**Category**: Business Rule
**Preconditions**: Admin; `showSSN` off.
**Steps**:
1. Enable Show SSN, save.
2. Open an employee's Personal Details (`/pim/viewPersonalDetails/empNumber/{n}`).
**Expected Results**: An "SSN Number" field is rendered; it is absent when the toggle is off.
**Business Rule**: `showSSN` gates the SSN field visibility in PIM.
**Suggested Layer**: E2E

### TC-101: Enabling "Show Deprecated Fields" surfaces Nick Name/Smoker/Military Service
**Category**: Business Rule
**Preconditions**: `pimShowDeprecatedFields` off.
**Steps**:
1. Enable Show Deprecated Fields, save.
2. Open an employee's Personal Details.
**Expected Results**: Nick Name (and Smoker / Military Service) fields appear; absent when off.
**Business Rule**: Deprecated-fields toggle gates those three fields.
**Suggested Layer**: E2E

### TC-102: Enabling "Show US Tax Exemptions menu" surfaces the menu in the employee record
**Category**: Business Rule
**Preconditions**: `showTaxExemptions` off.
**Steps**:
1. Enable, save.
2. Open an employee record.
**Expected Results**: A "Tax Exemptions" menu item appears in the employee's left record menu; absent when off.
**Business Rule**: `showTaxExemptions` gates the Tax Exemptions menu.
**Suggested Layer**: E2E

### TC-103: PUT payload reflects exactly the on-screen toggle states
**Category**: Business Rule
**Preconditions**: A specific combination set on screen.
**Steps**:
1. Set SSN on, SIN off, deprecated on, tax off; Save; inspect PUT body.
**Expected Results**: Body = `{pimShowDeprecatedFields:true, showSIN:false, showSSN:true, showTaxExemptions:false}`.
**Business Rule**: UI state maps 1:1 to the API contract.
**Suggested Layer**: API / E2E

### TC-104: GET hydrates toggles to match stored config
**Category**: Business Rule
**Preconditions**: Known stored config.
**Steps**:
1. Load the page; compare each toggle's checked state to the GET response.
**Expected Results**: Each toggle reflects its stored boolean.
**Business Rule**: Read contract drives initial UI.
**Suggested Layer**: API / E2E

---

## Security (TC-200–299)

### TC-200: ESS user cannot access the Optional Fields page
**Category**: Security
**Preconditions**: Logged in as ESS (non-admin).
**Steps**:
1. Confirm no PIM/Admin item in the side menu.
2. Deep-link to `/pim/configurePim`.
**Expected Results**: "Credential Required" rendered; no toggles; no Save button.
**Business Rule**: Configuration is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot read/write the optional-field config via API
**Category**: Security
**Preconditions**: ESS session/token.
**Steps**:
1. `GET` and `PUT` `/api/v2/pim/optional-field` as ESS.
**Expected Results**: 403/401; no change to config.
**Business Rule**: API enforces the same role restriction as the UI.
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Save with no change still succeeds (idempotent PUT)
**Category**: Negative
**Preconditions**: Admin on the page; no toggle changed.
**Steps**:
1. Click Save without changing anything.
**Expected Results**: PUT fires with current state; "Successfully Saved" toast; config unchanged.
**Business Rule**: Save is idempotent; no dirty-check gate.
**Suggested Layer**: E2E

### TC-301: Toggle change without Save is not persisted
**Category**: Negative
**Preconditions**: A toggle off.
**Steps**:
1. Toggle it on but do NOT save.
2. Reload the page.
**Expected Results**: The toggle reverts to its last saved (off) state; no PUT was sent.
**Business Rule**: Unsaved UI changes are discarded.
**Suggested Layer**: E2E

### TC-302: Malformed PUT payload is rejected
**Category**: Negative
**Preconditions**: Admin token.
**Steps**:
1. `PUT` with a non-boolean / missing key (e.g. `showSSN:"yes"`).
**Expected Results**: 4xx validation error; stored config unchanged.
**Business Rule**: API validates the boolean schema.
**Suggested Layer**: API

---

## Edge Cases (TC-400–499)

### TC-400: Rapid double-save does not corrupt state
**Category**: Edge Case
**Preconditions**: Admin on the page.
**Steps**:
1. Toggle SSN on; click Save twice in quick succession.
**Expected Results**: Final stored state is consistent (`showSSN:true`); no error toast; no duplicate side effects.
**Business Rule**: Concurrent saves converge.
**Suggested Layer**: E2E

### TC-401: Toggle on then off then save nets to off
**Category**: Edge Case
**Preconditions**: SSN off.
**Steps**:
1. Toggle SSN on, then off again; Save.
**Expected Results**: PUT body `showSSN:false`; no field appears in Personal Details.
**Business Rule**: Only the final state at Save time matters.
**Suggested Layer**: E2E

### TC-402: SIN and SSN are independent
**Category**: Edge Case
**Preconditions**: Both off.
**Steps**:
1. Enable SIN only; Save; open Personal Details.
**Expected Results**: SIN field shows, SSN field does not; payload `showSIN:true, showSSN:false`.
**Business Rule**: Each country-specific field is independent.
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: Default page layout and controls
**Category**: UI State
**Preconditions**: Admin opens the page.
**Steps**:
1. Observe the page.
**Expected Results**: "Optional Fields" title; "Show Deprecated Fields" section with 1 toggle; "Country Specific Information" section with 3 toggles (SSN, SIN, US Tax Exemptions); a Save button.
**Business Rule**: Page renders all four documented toggles under two sections.
**Suggested Layer**: E2E

### TC-501: Toggle visually reflects on/off after click
**Category**: UI State
**Preconditions**: A toggle off.
**Steps**:
1. Click the switch.
**Expected Results**: The switch flips to the active state and the underlying checkbox `:checked` becomes true (before save).
**Business Rule**: Switch control reflects state immediately.
**Suggested Layer**: E2E

### TC-502: Toggles reflect stored state on load (no flicker to wrong state)
**Category**: UI State
**Preconditions**: A known stored config (e.g. SSN on).
**Steps**:
1. Open the page after the GET resolves.
**Expected Results**: SSN switch renders active; others inactive — matching stored config.
**Business Rule**: Initial render hydrated from GET.
**Suggested Layer**: E2E

---

## Coverage Summary
- **Happy Path**: 4 (TC-001–004)
- **Business Rules**: 5 (TC-100–104)
- **Security**: 2 (TC-200–201)
- **Negative**: 3 (TC-300–302)
- **Edge Cases**: 3 (TC-400–402)
- **UI State**: 3 (TC-500–502)
- **Total**: 20
