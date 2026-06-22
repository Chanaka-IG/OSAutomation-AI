# Test Scenarios — Submit Claim as ESS

**Feature:** Claim → Submit Claim (an ESS employee creates a claim request, adds expenses, and submits it)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8)

**Routes (ESS):** create `/web/index.php/claim/submitClaim` · detail `/claim/submitClaim/id/{id}` · my claims `/claim/viewClaim`
**API:** `POST /api/v2/claim/requests` · `GET /api/v2/claim/requests/{id}` · `GET/POST /api/v2/claim/requests/{id}/expenses` · `PUT /api/v2/claim/requests/{id}/action` `{action}` · `GET /api/v2/claim/requests` (self)
**Lifecycle:** Initiated → (Submit) → Submitted; (Cancel) → Cancelled.
**Constraint:** claim requests cannot be deleted (`DELETE` → 405) — they are permanent.

---

## Happy Path (TC-001–099)

### TC-001: ESS creates a claim request (Initiated)
**Category**: Happy Path
**Preconditions**: ESS login; an active event + currency exist.
**Steps**: 1) Claim → Submit Claim. 2) Select Event. 3) Select Currency. 4) Enter Remarks. 5) Create.
**Expected Results**: Lands on claim detail (`/submitClaim/id/{id}`); Status = **Initiated**; Reference Id generated; Total Amount 0.00; Expenses "No Records Found".
**Business Rule**: A claim request is created with event + currency + remarks.
**Suggested Layer**: E2E

### TC-002: ESS adds an expense to the claim
**Category**: Happy Path
**Preconditions**: An Initiated claim; an active expense type exists.
**Steps**: 1) Expenses → Add. 2) Select Expense Type. 3) Enter Date. 4) Enter Amount. 5) Save.
**Expected Results**: Expense row appears; Total Amount reflects the amount.
**Business Rule**: Expenses are line items under a claim.
**Suggested Layer**: E2E

### TC-003: ESS submits the claim
**Category**: Happy Path
**Preconditions**: An Initiated claim with ≥1 expense.
**Steps**: 1) Click Submit.
**Expected Results**: Status = **Submitted**; Submit/Add controls disappear (Back/Cancel remain).
**Business Rule**: Submission finalizes the claim (`PUT action {SUBMIT}`).
**Suggested Layer**: E2E

### TC-004: Submitted claim appears in My Claims
**Category**: Happy Path
**Preconditions**: A submitted claim.
**Steps**: 1) Go to My Claims. 2) Filter by the claim's Reference Id.
**Expected Results**: A row with that Reference Id, the event, amount, and Status = Submitted.
**Business Rule**: My Claims lists the employee's own requests.
**Suggested Layer**: E2E

### TC-005: End-to-end — create → add expense → submit → verify in My Claims
**Category**: Happy Path
**Steps**: Full flow in one journey.
**Expected Results**: All stages succeed; final state Submitted and listed.
**Business Rule**: The complete ESS claim-submission journey.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Only active events appear in the Event dropdown
**Category**: Business Rule
**Preconditions**: One active + one inactive event.
**Steps**: 1) Create form → open Event dropdown.
**Expected Results**: Active event present; inactive absent.
**Business Rule**: `GET events?status=true`.
**Suggested Layer**: E2E

### TC-101: Only active expense types appear in the Expense Type dropdown
**Category**: Business Rule
**Preconditions**: One active + one inactive expense type; an Initiated claim.
**Steps**: 1) Claim detail → Expenses → Add → open Expense Type dropdown.
**Expected Results**: Active type present; inactive absent.
**Business Rule**: `GET expenses/types?status=true`.
**Suggested Layer**: E2E

### TC-102: Total Amount sums the expense line items
**Category**: Business Rule
**Preconditions**: A claim with ≥2 expenses.
**Steps**: 1) Add two expenses. 2) Read Total Amount.
**Expected Results**: Total = sum of amounts, in the claim currency.
**Business Rule**: Total is the aggregate of expenses.
**Suggested Layer**: E2E

### TC-103: A submitted claim is read-only (no further expenses / re-submit)
**Category**: Business Rule
**Preconditions**: A submitted claim.
**Steps**: 1) View the submitted claim.
**Expected Results**: No Add (expense) / Submit controls; only Back/Cancel.
**Business Rule**: Submission locks editing.
**Suggested Layer**: E2E

### TC-104: ESS can cancel a claim (Initiated → Cancelled)
**Category**: Business Rule
**Preconditions**: An Initiated claim.
**Steps**: 1) Open the claim. 2) Click Cancel.
**Expected Results**: Status = Cancelled; only Back remains.
**Business Rule**: Cancel sets terminal Cancelled state (`PUT action {CANCEL}`).
**Suggested Layer**: E2E

### TC-105: Reference Id is auto-generated and unique
**Category**: Business Rule
**Steps**: 1) Create a claim. 2) Read Reference Id.
**Expected Results**: Non-empty Reference Id (date-sequenced).
**Suggested Layer**: E2E

---

## Security (TC-200–299)

### TC-200: ESS cannot access admin Assign Claim
**Category**: Security
**Steps**: 1) As ESS, navigate to `/claim/viewAssignClaim`.
**Expected Results**: "Credential Required" / no access.
**Business Rule**: Assigning claims to employees is admin-only.
**Suggested Layer**: E2E

### TC-201: My Claims is self-scoped (no other employees' claims)
**Category**: Security
**Steps**: 1) ESS opens My Claims.
**Expected Results**: Only the logged-in employee's requests are listed; the admin employee-claims API (`/claim/employees/requests`) is forbidden (403) to ESS.
**Business Rule**: Employee data isolation.
**Suggested Layer**: API + E2E

### TC-202: ESS cannot act on another employee's claim id
**Category**: Security
**Steps**: 1) ESS requests a claim id they don't own.
**Expected Results**: Forbidden / not found.
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Create requires Event and Currency
**Category**: Negative
**Steps**: 1) Create with both empty.
**Expected Results**: "Required" under Event and Currency; not created.
**Suggested Layer**: E2E

### TC-301: Add Expense requires Expense Type, Date, and Amount
**Category**: Negative
**Steps**: 1) Open Add Expense. 2) Save empty.
**Expected Results**: "Required" under all three; no expense added.
**Suggested Layer**: E2E

### TC-302: Non-numeric / invalid amount rejected
**Category**: Negative
**Steps**: 1) Enter a non-numeric amount.
**Expected Results**: Validation error; not saved.
**Suggested Layer**: E2E

### TC-303: Cancel on the create form discards (no claim created)
**Category**: Negative
**Steps**: 1) Fill create form. 2) Click Cancel.
**Expected Results**: Returns to a claim view; no new request persisted.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Amount with decimals is preserved
**Category**: Edge Case
**Steps**: 1) Add expense amount 125.50.
**Expected Results**: Stored/displayed as 125.50; total matches.
**Suggested Layer**: E2E

### TC-401: Remarks is optional
**Category**: Edge Case
**Steps**: 1) Create with Event + Currency only.
**Expected Results**: Claim created without remarks.
**Suggested Layer**: E2E

### TC-402: Submit a claim with zero expenses
**Category**: Edge Case
**Steps**: 1) Create. 2) Submit without adding expenses.
**Expected Results**: Document behavior (allowed with total 0.00, or blocked).
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: New claim shows empty expenses ("No Records Found", Total 0.00)
**Category**: UI State
**Suggested Layer**: E2E

### TC-501: Summary fields (Reference Id, Event, Status, Currency) are read-only
**Category**: UI State
**Suggested Layer**: E2E

### TC-502: Expense Add inline form shows Cancel/Save and inline validation
**Category**: UI State
**Suggested Layer**: E2E

### TC-503: My Claims filter narrows the grid (by Status / Reference Id)
**Category**: UI State
**Suggested Layer**: E2E

### TC-504: Success toast on create / add-expense
**Category**: UI State
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 31**
- Happy Path: 5 · Business Rules: 6 · Security: 3 · Negative: 4 · Edge Cases: 3 · UI State: 5
- (Counts: 5+6+3+4+3+5 = 26 unique IDs across 6 lenses; numbering leaves gaps per the create-scenarios convention.)
