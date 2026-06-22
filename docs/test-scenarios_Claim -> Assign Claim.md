# Test Scenarios — Claim → Assign Claim

**Feature:** Claim → Assign Claim (an Admin creates/assigns a claim request on behalf of an employee, adds expenses, and submits)
**Verified against:** `https://automationtest-os-kord.orangehrm.com` (OrangeHRM OS 5.8)

**Routes (Admin):** employee-claims list `/web/index.php/claim/viewAssignClaim` · assign form `/claim/assignClaim` · detail `/claim/assignClaim/id/{id}`
**API:** `POST /api/v2/claim/employees/{empNumber}/requests` · `GET /api/v2/claim/employees/{empNumber}/requests/{id}` · `GET /api/v2/claim/employees/requests` (list) · `POST /api/v2/claim/requests/{id}/expenses` · `PUT /api/v2/claim/requests/{id}/action {SUBMIT}`
**Constraint:** claim requests cannot be deleted (`DELETE` → 405) — permanent. Admin Submit auto-advances status (observed "Paid").

---

## Happy Path (TC-001–099)

### TC-001: Admin assigns a claim to an employee (Initiated)
**Category**: Happy Path
**Preconditions**: Admin login; an active event + currency exist; a target employee exists.
**Steps**: 1) Employee Claims → Assign Claim. 2) Select Employee. 3) Select Event. 4) Select Currency. 5) Remarks. 6) Create.
**Expected Results**: Lands on detail (`/assignClaim/id/{id}`); Status = **Initiated**; the **Employee** summary field shows the assignee; Reference Id generated.
**Business Rule**: Admin can create a claim on behalf of an employee.
**Suggested Layer**: E2E

### TC-002: Admin adds an expense to the assigned claim
**Category**: Happy Path
**Steps**: 1) Expenses → Add. 2) Expense Type + Date + Amount. 3) Save.
**Expected Results**: Row added; Total Amount reflects the amount.
**Suggested Layer**: E2E

### TC-003: Admin submits the assigned claim
**Category**: Happy Path
**Steps**: 1) Click Submit.
**Expected Results**: Status leaves Initiated (admin submit auto-advances the workflow); editing controls disappear.
**Suggested Layer**: E2E

### TC-004: Assigned claim appears in the Employee Claims list
**Category**: Happy Path
**Steps**: 1) Employee Claims → filter by Reference Id.
**Expected Results**: A row with that Reference Id and the assignee's name.
**Suggested Layer**: E2E

### TC-005: End-to-end — assign → add expense → submit → verify in Employee Claims
**Category**: Happy Path
**Expected Results**: Full flow succeeds; claim listed for the employee.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Only active events appear in the Event dropdown
**Category**: Business Rule
**Suggested Layer**: E2E

### TC-101: Only active expense types appear in the Expense Type dropdown
**Category**: Business Rule
**Preconditions**: An Initiated assigned claim.
**Suggested Layer**: E2E

### TC-102: Total Amount sums the expense line items
**Category**: Business Rule
**Suggested Layer**: E2E

### TC-103: The assigned claim is attributed to the chosen employee
**Category**: Business Rule
**Steps**: 1) Assign to employee X. 2) Read the Employee summary field / list row.
**Expected Results**: Employee = X (not the admin).
**Business Rule**: Assignment records the target employee, not the actor.
**Suggested Layer**: E2E

### TC-104: Employee dropdown is an autocomplete over active employees
**Category**: Business Rule
**Steps**: 1) Type a partial name in Employee Name.
**Expected Results**: Matching employee hints appear.
**Suggested Layer**: E2E

### TC-105: Reference Id is auto-generated
**Category**: Business Rule
**Suggested Layer**: E2E

---

## Security (TC-200–299)

### TC-200: ESS cannot access Assign Claim
**Category**: Security
**Steps**: 1) As ESS, navigate to `/claim/viewAssignClaim` and `/claim/assignClaim`.
**Expected Results**: "Credential Required".
**Business Rule**: Assigning claims is admin-only.
**Suggested Layer**: E2E

### TC-201: ESS cannot create a claim for another employee via API
**Category**: Security
**Steps**: 1) ESS POST `/api/v2/claim/employees/{n}/requests`.
**Expected Results**: 403 / Forbidden.
**Suggested Layer**: API

---

## Negative / Error (TC-300–399)

### TC-300: Assign requires Employee, Event, and Currency
**Category**: Negative
**Steps**: 1) Create with all empty.
**Expected Results**: "Required" under Employee Name, Event, Currency.
**Suggested Layer**: E2E

### TC-301: Add Expense requires Expense Type, Date, and Amount
**Category**: Negative
**Suggested Layer**: E2E

### TC-302: Unknown/blank employee cannot be assigned
**Category**: Negative
**Steps**: 1) Type a non-matching name (no hint selected). 2) Create.
**Expected Results**: "Required"/invalid — free text is not accepted as an employee.
**Suggested Layer**: E2E

---

## Edge Cases (TC-400–499)

### TC-400: Decimal amount preserved in total
**Category**: Edge Case
**Suggested Layer**: E2E

### TC-401: Remarks optional on assign
**Category**: Edge Case
**Suggested Layer**: E2E

---

## UI State (TC-500–599)

### TC-500: New assigned claim shows empty expenses ("No Records Found", Total 0.00)
**Category**: UI State
**Suggested Layer**: E2E

### TC-501: Summary fields (Employee, Reference Id, Status, Currency) are read-only
**Category**: UI State
**Suggested Layer**: E2E

### TC-502: Employee Claims filter narrows the grid
**Category**: UI State
**Suggested Layer**: E2E

### TC-503: Success toast on assign / add-expense
**Category**: UI State
**Suggested Layer**: E2E

---

### Scenario Inventory
- **Total: 26**
- Happy Path: 5 · Business Rules: 6 · Security: 2 · Negative: 3 · Edge Cases: 2 · UI State: 4 (TC-503 grouped under UI State)
