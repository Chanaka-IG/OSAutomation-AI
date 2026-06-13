# Test Review (re-review) — `tests/pim/reporting-methods.spec.ts`

**Reviewer**: Lead QA Automation (code review)
**Checklist**: `playwright-best-practices` skill — **re-read in full for this pass**, including the updated **§"Common Test Validation"** (line 336): *"For toast message validation always use predefined methods in BasePage rather than getting the toast message text and validate it."*
**Files reviewed**: `tests/pim/reporting-methods.spec.ts` + imports — `src/pages/pim/ReportingMethodsPage.ts`, `src/pages/pim/ReportToPage.ts`, `src/api/orangehrmOSAPI/ReportingMethodsApi.ts`, `test-data/pim/{frontend,api}/reportingMethods.ts`, `src/pages/BasePage.ts`, fixture wiring.
**Correction note**: my prior review of this file **missed the §"Common Test Validation" rule** (I had not re-read the skill). `BasePage` now ships `verifySuccessToastForSave()`, `verifySuccessToastForUpdate()`, `verifySuccessToastforDeletion()`, `VerifyNoRecords()`, `verifyCustomToast()`, `verifyCustomToastforError()` (BasePage.ts:61–107). The toast findings below are the substantive change in this re-review.

---

## What's Good
- **Default-data protection** (§5/§8): "Direct"/"Indirect" used read-only; `afterEach` deletes only created names.
- **POM discipline** (§2.90/§4): no element locators in the spec body (bar the XSS scan); `expect` in the spec.
- **Robust integration locator**: `ReportToPage.addSupervisorButton` scoped to the `.orangehrm-action-header` of "Assigned Supervisors".
- **Hydration handled** in `gotoAddForm`; **case-sensitivity** documented via a two-step (TC-101).
- **Strong integration test** (TC-003) and **delete-dialog** coverage (TC-402); **security** (TC-200).
- No `waitForTimeout`/`console.log`; dynamic names; `serial` scoped to the stateful describe.

---

## Issues Found

### [IMPORTANT] Toast validated by text instead of the BasePage toast methods — spec lines 65–66 and 166
**Rule violated**: §"Common Test Validation" — *"always use predefined methods in BasePage rather than getting the toast message text and validate it."*
**Current (TC-001, 65–66)**:
```ts
const toast = await reportingMethodsPage.saveAndWaitForToast();
expect(toast).toContain(rmData.messages.successToast);
```
**Current (TC-202, 166)**:
```ts
expect(await reportingMethodsPage.saveAndWaitForToast()).toContain(rmData.messages.successToast);
```
**Why**: both pull the toast's text (`saveAndWaitForToast()` → `BasePage.waitForSuccessToast()` returns `innerText`) and assert on it — exactly the pattern the rule forbids. The codified method `verifySuccessToastForSave()` (BasePage.ts:61) asserts the Success header + "Successfully Saved" message and should be used instead.
**Fix**:
- In `ReportingMethodsPage`, replace the text-returning `saveAndWaitForToast()` with a save that delegates verification to BasePage, e.g.:
  ```ts
  async saveAndVerifyToast(): Promise<void> {
    await this.saveButton.click();
    await this.verifySuccessToastForSave();
    await this.waitUntilTableLoaderDissapear();
  }
  ```
- In TC-001/TC-202, call `await reportingMethodsPage.saveAndVerifyToast();` and drop the `expect(toast).toContain(...)` lines (and the now-unused `successToast` message constant if nothing else uses it).

### [IMPORTANT] Delete success is never asserted — TC-402 (spec lines 202–203)
**Rule violated**: §"Common Test Validation" (deletion variant) + §4 "Always assert outcomes."
**Current**:
```ts
await reportingMethodsPage.deleteRowByName(name);
await expect(reportingMethodsPage.rowByName(name)).toHaveCount(0);
```
**Why**: the row-gone check is good, but the delete toast is not verified and `BasePage.verifySuccessToastforDeletion()` (BasePage.ts:85, asserts "Successfully Deleted") exists for exactly this. The deletion path's user feedback is currently unasserted.
**Fix**: after confirming the dialog, call `await reportingMethodsPage.verifySuccessToastforDeletion();` (e.g. inside `deleteRowByName`, between the confirm click and the table-loader wait), then keep the row-count assertion.

### [SUGGESTION] `recordsFoundCount()` read is single-shot, not web-first — spec line 71
**Current**: `expect(await reportingMethodsPage.recordsFoundCount()).toBe(countBefore + 1);`
**Fix**: prefer a retrying assertion, e.g. `await expect(reportingMethodsPage.recordsFoundText).toContainText(\`(${countBefore + 1})\`)`. Low risk (row-visible on line 70 is the primary signal). (§9)

### [SUGGESTION] XSS scan uses an inline raw locator — spec lines 173–177
`page.locator('script:not([src])')` in the spec body (§2.90). Matches the established `add-job-title` convention, so consistent; optionally factor into a `BasePage` helper. Low priority.

### [SUGGESTION] Name input/error scoped by `hasText: 'Name'` substring — ReportingMethodsPage.ts
Correct on the single-field form; tighten to an exact label only if the form grows. Very low priority.

---

## Score: 7.5/10
Functionally correct and well-structured (passes 9/9), but it **violates the codified §"Common Test Validation" toast standard** in two tests and leaves the delete success feedback unasserted — two [IMPORTANT] items. The remainder are minor.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Replace text-based toast assertions (TC-001, TC-202) with `verifySuccessToastForSave()` via a `saveAndVerifyToast()` page method.
2. **[IMPORTANT]** Assert the delete toast in TC-402 using `verifySuccessToastforDeletion()`.
3. **[SUGGESTION]** Make TC-001's counter check web-first.
4. **[SUGGESTION, optional]** Factor the XSS inline-script scan into a BasePage helper; exact-label scoping for the Name field if it grows.

> Cross-suite note: the same text-based toast pattern (`saveAndWaitForToast()` + `toContain`) exists in `add-work-shift`, `optional-fields`, and `custom-fields`. They warrant the same fix for consistency with §"Common Test Validation", though this review is scoped to `reporting-methods.spec.ts`.
