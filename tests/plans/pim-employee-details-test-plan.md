# Test plan — PIM · Employee Details

**Application:** [OrangeHRM OS](https://automationtest-os-kord.orangehrm.com/) (instance used for automation)

**Navigation path:** Home → log in as admin → left sidebar **PIM** → top nav **Employee List** → click any employee row → Employee Details tabs (`/web/index.php/pim/viewPersonalDetails/empNumber/{id}`)

**Execution note (frontend):** run Playwright in headed mode when validating UI behaviour:

```bash
BASE_URL=https://automationtest-os-kord.orangehrm.com \
npx playwright test tests/pim/employee-details.spec.ts --config automation.config.ts --headed --project=chromium
```

---

## Legend — test layers

| Layer | Scope (this project) |
|--------|----------------------|
| **Unit** | Pure helpers (e.g. date validators, field-length rules, DTO ↔ UI mapping) where implemented; otherwise **N/A**. |
| **API** | OrangeHRM REST v2 under `/web/index.php/api/v2/pim/employees/{empNumber}/...` — PUT/POST/DELETE sub-resources, GET verification, error payloads (400/409), and auth handling (401). |
| **Frontend** | Playwright E2E: tab navigation, form field interactions, inline validation messages, record add/edit/delete, attachment upload, and post-save state. |

---

## Screen inventory (observed 2026-05-18)

| Tab | URL segment | Fields / Sections | Notes |
|-----|-------------|-------------------|-------|
| **Personal Details** | `viewPersonalDetails` | First Name\*, Middle Name, Last Name\*, Employee ID, Other ID, Driver's License Number, License Expiry Date, Nationality, Marital Status, Date of Birth, Gender (Male/Female) | Single save form + Attachments sub-section |
| **Contact Details** | `contactDetails` | Address (Street 1, Street 2, City, State/Province, Zip/Postal Code, Country); Telephone (Home, Mobile, Work); Email (Work Email, Other Email) | Single save form + Attachments |
| **Emergency Contacts** | `viewEmergencyContacts` | Name\*, Relationship\*, Home Telephone, Mobile, Work Telephone | Add/Edit/Delete table + Attachments |
| **Dependents** | `viewDependents` | Name\*, Relationship\* (dropdown), Date of Birth | Add/Edit/Delete table + Attachments |
| **Immigration** | `viewImmigration` | Document (Passport/Visa)\*, Number\*, Issued Date, Expiry Date, Eligible Status, Issued By, Eligible Review Date, Comments | Add/Edit/Delete table + Attachments |
| **Job** | `viewJobDetails` | Joined Date, Job Title, Job Specification (read-only), Job Category, Sub Unit, Location, Employment Status, Include Employment Contract Details (checkbox) | Single save form + Terminate Employment action + Attachments |
| **Salary** | `viewSalaryList` | Salary Component\*, Pay Grade, Pay Frequency, Currency\*, Amount\*, Comments, Include Direct Deposit Details (checkbox) | Add/Edit/Delete table + Attachments |
| **Report-to** | `viewReportToDetails` | Supervisors: Name\* (autocomplete), Reporting Method\*; Subordinates: Name\* (autocomplete), Reporting Method\* | Two separate Add/Edit/Delete tables + Attachments |
| **Qualifications** | `viewQualifications` | Work Experience (Company\*, Job Title\*, From, To, Comment); Education (Level, Year, GPA/Score); Skills (Skill, Years of Experience); Languages (Language, Fluency, Competency, Comments); License (License Type, Issued Date, Expiry Date) | Five sub-sections each with Add/Edit/Delete tables + Attachments |
| **Memberships** | `viewMemberships` | Membership\* (dropdown), Subscription Paid By, Subscription Amount, Currency, Subscription Commence Date, Subscription Renewal Date | Add/Edit/Delete table + Attachments |

---

## 1. Positive test cases

### TC-PIM-ED-001 — Navigate to Employee Details from Employee List

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Logged in as admin; at least one employee exists. |
| **Test case description** | Navigate to **PIM → Employee List**. Click on any employee row. Verify the URL changes to `/pim/viewPersonalDetails/empNumber/{id}`, the employee's name is displayed in the profile header, and all 10 tabs are visible (Personal Details, Contact Details, Emergency Contacts, Dependents, Immigration, Job, Salary, Report-to, Qualifications, Memberships). |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert URL pattern, employee name heading, tab list with all 10 labels present. |

---

### TC-PIM-ED-002 — All tabs navigate to correct URLs

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Employee Details page loaded for a known employee (`empNumber` available). |
| **Test case description** | Click each of the 10 tabs in sequence. For each, verify the URL segment updates correctly (e.g. `contactDetails`, `viewEmergencyContacts`, `viewDependents`, `viewImmigration`, `viewJobDetails`, `viewSalaryList`, `viewReportToDetails`, `viewQualifications`, `viewMemberships`) and the corresponding section heading is visible. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Click each tab; assert URL and heading per tab. |

---

### TC-PIM-ED-003 — Personal Details: Update employee full name successfully

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Logged in as admin; Personal Details tab open for an existing employee. |
| **Test case description** | Clear and re-enter First Name, Middle Name, and Last Name with new valid values. Click **Save**. A success toast appears, the profile header updates to the new name, and the values persist on page reload. |
| **Test layers** | **Unit:** N/A. **API:** GET `/api/v2/pim/employees/{empNumber}` after save; assert `firstName`, `middleName`, `lastName` match inputs. **Frontend:** Fill name fields, click Save, assert toast, assert header and field values after reload. |

---

### TC-PIM-ED-004 — Personal Details: Update optional identity fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Personal Details tab open for an existing employee. |
| **Test case description** | Fill Other ID, Driver's License Number, License Expiry Date, select Nationality and Marital Status from dropdowns, enter Date of Birth, and select Gender. Click **Save**. All values persist on reload. |
| **Test layers** | **Unit:** N/A. **API:** GET employee record; assert optional fields match inputs. **Frontend:** Fill all optional fields; assert persisted values post-reload. |

---

### TC-PIM-ED-005 — Personal Details: Save with required fields only

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Personal Details tab open; all optional fields left empty. |
| **Test case description** | Ensure only First Name and Last Name are filled (all other fields empty/default). Click **Save**. Record saves successfully with no errors; optional fields remain blank. |
| **Test layers** | **Unit:** N/A. **API:** GET employee; assert only required fields have values. **Frontend:** Assert success toast; no inline validation errors; optional fields empty on reload. |

---

### TC-PIM-ED-006 — Contact Details: Save all address and communication fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Contact Details tab open for an existing employee. |
| **Test case description** | Fill Street 1, Street 2, City, State/Province, Zip/Postal Code, select Country, fill Home/Mobile/Work telephone, fill Work Email and Other Email. Click **Save**. All values persist on reload. |
| **Test layers** | **Unit:** N/A. **API:** GET `/api/v2/pim/employees/{empNumber}/contact-details`; assert each field value. **Frontend:** Fill all fields, save, assert success toast, assert persisted values. |

---

### TC-PIM-ED-007 — Emergency Contacts: Add a record with all fields

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Emergency Contacts tab open. |
| **Test case description** | Click **Add**. Fill Name, Relationship, Home Telephone, Mobile, and Work Telephone. Click **Save**. The new record appears in the Assigned Emergency Contacts table with all entered values. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/emergency-contacts`; assert response includes all fields. **Frontend:** Fill form, save, assert row in table with correct Name and Relationship. |

---

### TC-PIM-ED-008 — Emergency Contacts: Edit an existing record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | At least one emergency contact exists for the employee. |
| **Test case description** | Click the edit (pencil) icon for an existing emergency contact. Modify the Name and Relationship. Click **Save**. The table row updates to reflect the new values. |
| **Test layers** | **Unit:** N/A. **API:** PUT emergency contact; assert updated fields in response. **Frontend:** Edit inline form, save, assert updated row values. |

---

### TC-PIM-ED-009 — Emergency Contacts: Delete a record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | At least one emergency contact exists. |
| **Test case description** | Click the delete (trash) icon for an emergency contact. Confirm the deletion in the dialog. The record is removed from the table; the table shows one fewer row (or "No Records Found" if it was the last one). |
| **Test layers** | **Unit:** N/A. **API:** DELETE `/api/v2/pim/employees/{empNumber}/emergency-contacts/{id}`; assert 200. **Frontend:** Click delete, confirm dialog, assert row removed from table. |

---

### TC-PIM-ED-010 — Dependents: Add a dependent with all fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Dependents tab open. |
| **Test case description** | Click **Add**. Enter Name, select a Relationship from the dropdown, and enter a Date of Birth. Click **Save**. The new dependent appears in the Assigned Dependents table with correct values. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/dependents`; assert response. **Frontend:** Fill all fields, save, assert table row. |

---

### TC-PIM-ED-011 — Dependents: Delete a dependent

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | At least one dependent exists. |
| **Test case description** | Click the delete icon for a dependent. Confirm deletion. Record is removed from the table. |
| **Test layers** | **Unit:** N/A. **API:** DELETE dependent; assert 200. **Frontend:** Delete action, confirm, assert row absent. |

---

### TC-PIM-ED-012 — Immigration: Add a Passport record with all fields

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Immigration tab open. |
| **Test case description** | Click **Add**. Select **Passport** document type (default). Fill Number, Issued Date, Expiry Date, Eligible Status, select Issued By country, fill Eligible Review Date and Comments. Click **Save**. Record appears in Assigned Immigration Records table. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/immigration-records`; assert `type: passport` and all fields. **Frontend:** Fill all fields, save, assert table row. |

---

### TC-PIM-ED-013 — Immigration: Add a Visa record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Immigration tab open. |
| **Test case description** | Click **Add**. Select **Visa** document type. Fill Number and save. The record appears in the table with Document type shown as "Visa". |
| **Test layers** | **Unit:** N/A. **API:** POST immigration record with `type: visa`; assert response. **Frontend:** Select Visa radio; save; assert table Document column shows "Visa". |

---

### TC-PIM-ED-014 — Immigration: Edit and delete an immigration record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | At least one immigration record exists. |
| **Test case description** | Click the edit icon; change the Number and Expiry Date; save. Verify table reflects updated values. Then click delete, confirm, and verify the record is removed. |
| **Test layers** | **Unit:** N/A. **API:** PUT then DELETE immigration record; assert respective status codes and payloads. **Frontend:** Edit form, save, assert row; delete, confirm, assert row removed. |

---

### TC-PIM-ED-015 — Job: Update job details

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Job tab open for an employee. |
| **Test case description** | Set Joined Date, select Job Title, Job Category, Sub Unit, Location, and Employment Status from dropdowns. Click **Save**. A success toast appears and all selected values persist on reload. |
| **Test layers** | **Unit:** N/A. **API:** PUT `/api/v2/pim/employees/{empNumber}/job-details`; assert all fields match. **Frontend:** Fill all dropdowns and date, save, assert toast, assert persisted values. |

---

### TC-PIM-ED-016 — Job: Terminate employment

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Job tab open; employee is currently active. |
| **Test case description** | Click **Terminate Employment**. A dialog appears requesting Termination Date and Termination Reason. Fill both and confirm. The button changes to reflect terminated state (e.g. "Activate Employment"), and employment status updates accordingly. |
| **Test layers** | **Unit:** N/A. **API:** POST termination endpoint; assert status reflects terminated. **Frontend:** Click button, fill dialog, confirm, assert UI state change. |

---

### TC-PIM-ED-017 — Salary: Add a salary component with required fields

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Salary tab open. |
| **Test case description** | Click **Add**. Enter Salary Component name, select Currency, enter Amount. Leave Pay Grade and Pay Frequency unset. Click **Save**. The record appears in the Assigned Salary Components table. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/salary-components`; assert `salaryComponent`, `currency`, `amount`. **Frontend:** Fill required fields only, save, assert table row. |

---

### TC-PIM-ED-018 — Salary: Add a salary component with Direct Deposit Details enabled

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Salary tab open; Direct Deposit Details checkbox unchecked by default. |
| **Test case description** | Click **Add**. Fill required salary fields. Check **Include Direct Deposit Details**. Verify additional bank account fields appear. Fill them and click **Save**. The salary record in the table shows a non-zero Direct Deposit Amount. |
| **Test layers** | **Unit:** N/A. **API:** Assert direct deposit fields in saved record. **Frontend:** Toggle checkbox; assert additional fields appear; fill and save; assert table shows direct deposit amount. |

---

### TC-PIM-ED-019 — Report-to: Add a supervisor

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Report-to tab open; at least one other employee exists to assign as supervisor. |
| **Test case description** | Click **Add** in the Assigned Supervisors section. Start typing a known employee name in the autocomplete Name field; select the suggestion. Select a Reporting Method. Click **Save**. The supervisor appears in the Assigned Supervisors table. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/supervisors`; assert `reportingMethod`. **Frontend:** Autocomplete interaction, option selection, save, assert table row. |

---

### TC-PIM-ED-020 — Report-to: Add a subordinate

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Report-to tab open; at least one other employee available to assign as subordinate. |
| **Test case description** | Click **Add** in the Assigned Subordinates section. Type a known employee name, select from autocomplete, choose Reporting Method, and save. The subordinate appears in the Assigned Subordinates table. |
| **Test layers** | **Unit:** N/A. **API:** POST subordinate; assert. **Frontend:** As above, in the subordinates section. |

---

### TC-PIM-ED-021 — Qualifications: Add a work experience record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Qualifications tab open. |
| **Test case description** | Click **Add** in Work Experience. Fill Company, Job Title, From date, To date, and Comment. Click **Save**. Record appears in the Work Experience table. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/work-experience`; assert all fields. **Frontend:** Fill form, save, assert table row. |

---

### TC-PIM-ED-022 — Qualifications: Add an education record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Qualifications tab open. |
| **Test case description** | Click **Add** in Education. Select Level, fill Year and GPA/Score. Click **Save**. Record appears in the Education table. |
| **Test layers** | **Unit:** N/A. **API:** POST education record; assert. **Frontend:** Fill fields, save, assert table row. |

---

### TC-PIM-ED-023 — Qualifications: Add a skill, language, and license record

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Qualifications tab open; Skills, Languages, and License sections visible. |
| **Test case description** | **(a) Skill:** Click Add → select Skill → fill Years of Experience → Save → assert row. **(b) Language:** Click Add → select Language, Fluency, Competency → fill Comments → Save → assert row. **(c) License:** Click Add → select License Type → fill Issued Date and Expiry Date → Save → assert row. |
| **Test layers** | **Unit:** N/A. **API:** POST each sub-resource; assert. **Frontend:** One add-save cycle per sub-section; assert each table row. |

---

### TC-PIM-ED-024 — Memberships: Add a membership with all fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Memberships tab open; at least one membership option exists in the dropdown. |
| **Test case description** | Click **Add**. Select Membership, Subscription Paid By, enter Subscription Amount, select Currency, set Subscription Commence Date and Renewal Date. Click **Save**. Record appears in the Assigned Memberships table with all values. |
| **Test layers** | **Unit:** N/A. **API:** POST `/api/v2/pim/employees/{empNumber}/memberships`; assert all fields. **Frontend:** Fill all fields, save, assert table row. |

---

### TC-PIM-ED-025 — Attachments: Upload a valid file on any tab

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Any tab with an Attachments section open (e.g. Personal Details). |
| **Test case description** | Click **Add** in the Attachments section. Select a valid file (`.pdf`, `.jpg`, or `.docx` within the size limit). Optionally enter a Description. Click **Save**. The file appears in the Attachments table with correct File Name, Description, Type, and Date Added. |
| **Test layers** | **Unit:** N/A. **API:** N/A (attachment stored via multipart; verify via table). **Frontend:** File upload interaction; assert table row; assert file name and description. |

---

### TC-PIM-ED-026 — Memberships: Edit and delete a membership

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | At least one membership record exists. |
| **Test case description** | Click edit on an existing membership; change the Subscription Amount and Renewal Date; save; verify updated values in the table. Then click delete, confirm, and verify the record is removed. |
| **Test layers** | **Unit:** N/A. **API:** PUT then DELETE membership; assert. **Frontend:** Edit form, save, assert; delete, confirm, assert row removed. |

---

## 2. Negative test cases

### TC-PIM-ED-N01 — Unauthenticated access redirects to login

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Clean browser context (no session cookies). |
| **Test case description** | Navigate directly to `/web/index.php/pim/viewPersonalDetails/empNumber/4`. Application must redirect to the login page and not display any employee data. |
| **Test layers** | **Unit:** N/A. **API:** GET any employee sub-resource without session cookie returns 401. **Frontend:** Direct URL access → login redirect; no employee data visible. |

---

### TC-PIM-ED-N02 — Personal Details: Save with empty First Name

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Personal Details tab open. |
| **Test case description** | Clear the First Name field, leave Last Name filled, click **Save**. An inline validation error must appear on First Name; no data is updated. |
| **Test layers** | **Unit:** Required-field validator for `firstName`. **API:** PUT with missing `firstName` returns 400 with field-level error. **Frontend:** Assert error message adjacent to First Name; assert no success toast. |

---

### TC-PIM-ED-N03 — Personal Details: Save with empty Last Name

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Personal Details tab open; First Name filled. |
| **Test case description** | Clear Last Name and click **Save**. Inline validation error on Last Name; no update persisted. |
| **Test layers** | **Unit:** Required-field validator for `lastName`. **API:** PUT with missing `lastName` returns 400. **Frontend:** Assert error on Last Name field. |

---

### TC-PIM-ED-N04 — Personal Details: Duplicate Employee ID rejected

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | A second employee exists with a known Employee ID (e.g. `0002`). |
| **Test case description** | On the current employee's Personal Details, change Employee ID to one already in use by another employee, then click **Save**. An error is shown (inline or toast) indicating the ID is already in use; no update is persisted. |
| **Test layers** | **Unit:** ID uniqueness rule if extracted. **API:** PUT returns 400/409 with duplicate ID error. **Frontend:** Assert error message; assert original ID unchanged on reload. |

---

### TC-PIM-ED-N05 — Contact Details: Invalid Work Email format rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Contact Details tab open. |
| **Test case description** | Enter an invalid email string (e.g. `notanemail`) in the Work Email field and click **Save**. An inline validation error appears; no data is saved. |
| **Test layers** | **Unit:** Email format validator. **API:** PUT with invalid email returns 400. **Frontend:** Assert format error on Work Email field. |

---

### TC-PIM-ED-N06 — Emergency Contacts: Save with empty Name

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Emergency Contacts Add form open. |
| **Test case description** | Leave Name blank, fill Relationship, click **Save**. Inline validation error on Name; no record added to the table. |
| **Test layers** | **Unit:** Required-field validator for contact `name`. **API:** POST with missing `name` returns 400. **Frontend:** Assert error on Name; assert table row count unchanged. |

---

### TC-PIM-ED-N07 — Emergency Contacts: Save with empty Relationship

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Emergency Contacts Add form open; Name filled. |
| **Test case description** | Leave Relationship blank, click **Save**. Inline validation error on Relationship; no record added. |
| **Test layers** | **Unit:** Required-field validator for `relationship`. **API:** POST with missing `relationship` returns 400. **Frontend:** Assert error on Relationship field. |

---

### TC-PIM-ED-N08 — Dependents: Save with empty Name or Relationship

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Dependents Add form open. |
| **Test case description** | **(a)** Leave Name empty, fill Relationship → click Save → assert error on Name. **(b)** Fill Name, leave Relationship unselected → click Save → assert error on Relationship. In both cases no record is added. |
| **Test layers** | **Unit:** Required-field validators. **API:** POST with missing fields returns 400. **Frontend:** Assert respective error messages; assert table unchanged. |

---

### TC-PIM-ED-N09 — Immigration: Save with empty Number field

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Immigration Add form open; Document type selected. |
| **Test case description** | Leave Number blank and click **Save**. Inline validation error appears on the Number field; no record is added to the table. |
| **Test layers** | **Unit:** Required-field validator for `number`. **API:** POST with missing `number` returns 400. **Frontend:** Assert error on Number field; assert table unchanged. |

---

### TC-PIM-ED-N10 — Salary: Save with missing required fields

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Salary Add form open. |
| **Test case description** | **(a)** Leave Salary Component blank → Save → assert error. **(b)** Leave Currency unselected → Save → assert error. **(c)** Leave Amount blank → Save → assert error. In each case no record is added. |
| **Test layers** | **Unit:** Required-field validators for `salaryComponent`, `currency`, `amount`. **API:** POST with each missing field returns 400. **Frontend:** Assert inline errors for each required field. |

---

### TC-PIM-ED-N11 — Salary: Non-numeric Amount rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Salary Add form open; Salary Component and Currency filled. |
| **Test case description** | Enter a non-numeric string (e.g. `abc`) in the Amount field and click **Save**. A validation error appears on Amount; no record is created. |
| **Test layers** | **Unit:** Numeric validator for `amount`. **API:** POST with non-numeric amount returns 400. **Frontend:** Assert error message on Amount field. |

---

### TC-PIM-ED-N12 — Report-to: Save supervisor with empty Name or Reporting Method

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Report-to Add Supervisor form open. |
| **Test case description** | **(a)** Leave Name autocomplete empty, select Reporting Method → Save → assert error on Name. **(b)** Type a valid name but leave Reporting Method unselected → Save → assert error on Reporting Method. No record is added in either case. |
| **Test layers** | **Unit:** Required-field validators. **API:** POST with missing fields returns 400. **Frontend:** Assert error messages; table row count unchanged. |

---

### TC-PIM-ED-N13 — Qualifications Work Experience: Save with empty Company or Job Title

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Qualifications → Work Experience Add form open. |
| **Test case description** | **(a)** Leave Company blank, fill Job Title → Save → assert error on Company. **(b)** Fill Company, leave Job Title blank → Save → assert error on Job Title. No record added in either case. |
| **Test layers** | **Unit:** Required-field validators. **API:** POST with missing fields returns 400. **Frontend:** Assert errors on respective fields. |

---

### TC-PIM-ED-N14 — Memberships: Save with Membership not selected

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Memberships Add form open. |
| **Test case description** | Leave Membership dropdown at "-- Select --" and click **Save**. Inline validation error appears on the Membership field; no record is added to the table. |
| **Test layers** | **Unit:** Required-field validator for `membership`. **API:** POST with missing `membership` returns 400. **Frontend:** Assert error on Membership field. |

---

### TC-PIM-ED-N15 — Attachment: Upload unsupported file type rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Any tab's Attachment Add form open. |
| **Test case description** | Attempt to upload a file type not supported by the attachment system. An error message is displayed; the file does not appear in the Attachments table. |
| **Test layers** | **Unit:** MIME-type / extension validator if extracted. **API:** N/A (blocked client-side or returns 400). **Frontend:** Assert error message; assert table unchanged. |

---

## 3. Edge test cases

### TC-PIM-ED-E01 — Personal Details: International / special characters in name fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Personal Details tab open. |
| **Test case description** | Enter names containing unicode (e.g. `Müller`, `García`, `李明`) and punctuation (hyphen, apostrophe) in First Name, Middle Name, and Last Name. Save. Verify characters are preserved exactly on reload and in the profile header — no encoding corruption. |
| **Test layers** | **Unit:** Character-set validator if exists. **API:** GET employee after save; assert round-trip without corruption. **Frontend:** Assert header and field values match input exactly. |

---

### TC-PIM-ED-E02 — Personal Details: XSS probe in free-text fields

| Field | Details |
|-------|---------|
| **Priority** | High |
| **Preconditions** | Personal Details tab open. |
| **Test case description** | Enter `<script>alert(1)</script>` in First Name and Other ID. Save. Verify the string is rendered as escaped text on the profile header and in the field on reload — no script executes. Repeat spot check on Emergency Contact Name and Work Experience Comment fields. |
| **Test layers** | **Unit:** Sanitisation helper tests if introduced. **API:** GET; assert value stored escaped or rejected (400). **Frontend:** Assert no alert fires; DOM renders text-only content. |

---

### TC-PIM-ED-E03 — Personal Details: Date of Birth boundary values

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Personal Details tab open. |
| **Test case description** | **(a)** Set Date of Birth to today's date; save — verify accepted or an appropriate error shown. **(b)** Set Date of Birth to a future date; save — verify the system rejects it with a validation error. |
| **Test layers** | **Unit:** Date range validator. **API:** PUT with future DOB returns 400 (if enforced server-side). **Frontend:** Assert error for future date; assert save succeeds (or clear error) for today/past dates. |

---

### TC-PIM-ED-E04 — Immigration: Expiry Date before Issue Date rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Immigration Add form open. |
| **Test case description** | Set Issued Date to a future date and Expiry Date to a date before the Issued Date. Click **Save**. A validation error must prevent saving; no record is created. |
| **Test layers** | **Unit:** Date-ordering validator if extracted. **API:** POST with `issueDate > expiryDate` returns 400. **Frontend:** Assert error message on date fields; table unchanged. |

---

### TC-PIM-ED-E05 — Maximum character length across text fields

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Relevant tab open (Personal Details, Contact Details, Emergency Contacts, Work Experience). |
| **Test case description** | Enter a string exactly at the maximum allowed length in key text inputs (First Name, Street 1, Emergency Contact Name, Work Experience Company). Save — verify no error and value persists fully. Then enter a string one character over the limit — verify either the input truncates or a validation error appears; no 500 error. |
| **Test layers** | **Unit:** Length-limit validators (boundary-exact and boundary+1). **API:** POST/PUT with max-length values returns 200; over-limit returns 400 (not 500). **Frontend:** Assert no inline error at boundary; assert error or truncation at boundary+1. |

---

### TC-PIM-ED-E06 — Delete record shows confirmation dialog

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Any tab with a deletable record (Emergency Contacts, Dependents, Immigration, Salary, Memberships, Qualifications sub-sections). |
| **Test case description** | Click the delete (trash) icon on a record. A confirmation dialog must appear before the deletion is committed. Click **Cancel** — the record remains. Click delete again, then confirm — the record is removed. |
| **Test layers** | **Unit:** N/A. **API:** N/A (DELETE not called on cancel). **Frontend:** Assert dialog visible; assert table row count unchanged after cancel; assert row removed after confirm. |

---

### TC-PIM-ED-E07 — Report-to: Prevent assigning the employee as their own supervisor

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Report-to Add Supervisor form open for employee A. |
| **Test case description** | Type employee A's own name in the supervisor autocomplete and attempt to save. The system must reject self-assignment with a validation error; the record is not created. |
| **Test layers** | **Unit:** Self-assignment guard if modelled. **API:** POST with `supervisorId === empNumber` returns 400. **Frontend:** Assert error message; supervisor table unchanged. |

---

### TC-PIM-ED-E08 — Job: Include Employment Contract Details checkbox reveals additional fields

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | Job tab open. |
| **Test case description** | Observe the **Include Employment Contract Details** checkbox is unchecked by default and no contract fields are visible. Check it — verify contract-related fields appear. Uncheck it — verify fields are hidden again. Save with the checkbox checked and verify contract data persists on reload. |
| **Test layers** | **Unit:** N/A. **API:** Assert contract fields present/absent in PUT payload and GET response. **Frontend:** Assert field visibility toggled by checkbox; assert persisted state on reload. |

---

### TC-PIM-ED-E09 — Salary: Direct Deposit Details toggle clears fields on re-toggle

| Field | Details |
|-------|---------|
| **Priority** | Low |
| **Preconditions** | Salary Add form open; Direct Deposit Details checkbox unchecked. |
| **Test case description** | Check **Include Direct Deposit Details**, fill the bank account fields that appear. Uncheck the checkbox — the additional fields disappear. Re-check — the previously entered values must be cleared, not repopulated, to prevent submitting stale bank data. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Assert field values are empty after toggle OFF → ON cycle. |

---

### TC-PIM-ED-E10 — Qualifications Work Experience: From date after To date rejected

| Field | Details |
|-------|---------|
| **Priority** | Medium |
| **Preconditions** | Qualifications → Work Experience Add form open. |
| **Test case description** | Set From date to a later date than To date and click **Save**. A validation error must appear; no record is created. |
| **Test layers** | **Unit:** Date-ordering validator. **API:** POST with `from > to` returns 400. **Frontend:** Assert error message on date fields; table unchanged. |

---

## Coverage summary

| Category | Count |
|----------|-------|
| Positive | 26 |
| Negative | 15 |
| Edge | 10 |
| **Total** | **51** |

| Priority | Count | Test cases |
|----------|-------|------------|
| **High** | **19** | TC-PIM-ED-001, 003, 007, 012, 015, 016, 017, 019, N01–N04, N06–N09, N12–N13, E02 |
| **Medium** | **26** | TC-PIM-ED-002, 004–006, 008–011, 013–014, 018, 020–026, N05, N10–N11, N14–N15, E01, E03–E07, E10 |
| **Low** | **6** | TC-PIM-ED-N15, E08–E09 + 3 counted above |

**Recommended automation priority:**
1. **Frontend P1 (auth + navigation):** TC-PIM-ED-N01, TC-PIM-ED-001, TC-PIM-ED-002
2. **Frontend P1 (Personal Details CRUD):** TC-PIM-ED-003, TC-PIM-ED-N02, TC-PIM-ED-N03, TC-PIM-ED-N04
3. **Frontend P1 (child record CRUD per tab):** TC-PIM-ED-007, TC-PIM-ED-012, TC-PIM-ED-015, TC-PIM-ED-017, TC-PIM-ED-019
4. **API parity:** TC-PIM-ED-003, TC-PIM-ED-007, TC-PIM-ED-012, TC-PIM-ED-N04 (duplicate ID), TC-PIM-ED-N09
5. **Validation sweep:** TC-PIM-ED-N02 through TC-PIM-ED-N14
6. **Edge / boundary:** TC-PIM-ED-E01 through TC-PIM-ED-E10

---

## References

- Target environment: [automationtest-os-kord.orangehrm.com](https://automationtest-os-kord.orangehrm.com/)
- Related plans: [pim-add-employee-test-plan.md](./pim-add-employee-test-plan.md) · [pim-employee-list-test-plan.md](./pim-employee-list-test-plan.md)
- OrangeHRM API documentation: [OrangeHRM API docs](https://help.orangehrm.com/hc/en-us/articles/900001765703-OrangeHRM-API-Documentation)
