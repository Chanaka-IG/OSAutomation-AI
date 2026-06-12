# Test Code Review — Organization Structure

**Files reviewed**
- `tests/admin/organization-structure.spec.ts` (primary)
- `src/pages/admin/OrganizationStructurePage.ts` (POM)
- `test-data/admin/frontend/organizationStructure.ts` (UI strings/data)
- `src/api/orangehrmOSAPI/SubunitsApi.ts` (seeding/cleanup additions)
- `src/fixtures/index.ts`, `test-data/index.ts` (registration)

**Checklist**: `playwright-best-practices` + `automation-framework`.
**Run status at review time**: 10/10 passing (no retries), HTML report generated.

---

## What's Good
- **POM discipline**: all locators live in `OrganizationStructurePage`; the spec calls business-level methods (`enableEditMode`, `openNodeAction`, `saveDialogExpectingClose`). No `expect()` in the page object (automation-framework rule honoured).
- **No-toast reality handled correctly**: `saveDialogExpectingClose()` waits for the dialog to detach and asserts success via tree-node text — it never calls `waitForSuccessToast()`, which would hang on this page. This is the single biggest porting hazard and it was avoided.
- **Responsive action area handled**: `openNodeAction` targets the inline `bi-trash-fill/pencil-fill/plus` icons at wide viewports and falls back to the kebab + dropdown at narrow widths — robust to viewport changes.
- **Lazy/collapsed tree handled**: `expandNode()` reveals children before asserting (TC-004, TC-102), matching the live behaviour.
- **Confirmed app bug asserted, not hidden** (TC-301): the `description:null → 422` defect and its stuck-loader symptom are asserted as-is and clearly flagged as a potential app bug — exactly per the generate-tests rule.
- **No anti-patterns**: no `waitForTimeout`, no `test.only`, no hardcoded DB ids; unique data via `stamp()` (best-practices §8); login via `loginAs('admin')` / `loginWithCredentials` for ESS (§loginAs).
- **Cleanup** is API-driven in `afterAll` and tolerant of cascade-deleted children (`deleteByNamesIfPresent` warns on 404, continues).
- **Duplicate-name validator quirk** correctly worked around — uses a seeded name that exists at page load and types char-by-char (`typeName`) to surface the async validator.

---

## Issues Found

### [IMPORTANT] Raw locator in the test body (TC-301)
**Line ~307**:
```ts
await expect(org.dialog.locator('.oxd-form-loader')).toBeVisible();
```
`.oxd-form-loader` is a raw CSS locator constructed inside the spec. Best-practices §2 "Locator definition rules": *locators should always be defined in the page class … never in the test body.*
**Fix**: add a `stuckDialogLoader` (or `dialogFormLoader`) locator to `OrganizationStructurePage` and assert against that.

### [IMPORTANT] API-path string manipulation inside the test (TC-301)
**Lines ~290–293**:
```ts
const putResponse = page.waitForResponse(
  (r) => r.url().includes(subunits.adminPath.replace('/web/index.php', '')) &&
         r.request().method() === 'PUT',
);
```
URL-shaping logic (`.replace('/web/index.php', '')`) lives in the spec. This is brittle (couples the test to the route prefix) and is the kind of low-level detail the POM/test-data should own. Best-practices §"Pass data to Page class".
**Fix**: expose the matcher from the page object (e.g. `org.waitForSubunitPut()`) or add a `subunitApiPathFragment` constant to `test-data/admin/frontend/organizationStructure.ts` and reference that.

### [SUGGESTION] Node locators use substring `hasText` rather than exact match
`card(name)` and `nodeLabel(name)` use `.filter({ hasText: name })`. Best-practices §2 "Use exact text match for reliability" — a stamped prefix like `OS E2E Root 178116` is a substring of `OS E2E Root 1781166…`, so two same-millisecond-prefixed nodes could theoretically collide. Risk is low (timestamps + serial run), but an exact match (`getByText(name, { exact: true })` scoped to the card) would be safer.

### [SUGGESTION] Inline literal `unitId` / name prefixes in the spec
Values like `unitId: 'OSE5'`, `unitId: 'E2E'`, `` `E301-${stamp()}` ``, and the `OS E2E …` name prefixes are literals in the spec. Best-practices §"Pass data to Page class" prefers sourcing fixed values from `test-data`. Consider centralizing the prefixes/unitIds under `adminOrganizationStructure.samples`.

### [SUGGESTION] `credentialRequired` matched by substring
TC-200 uses `page.getByText(os.messages.credentialRequired)` (substring). An `{ exact: true }` match would be marginally more precise. Minor.

---

## Score: 8.5/10
Strong, behaviour-accurate suite that correctly models three non-obvious page traits (no toast, responsive actions, lazy-collapsed tree) and a confirmed backend defect. Deductions are for two encapsulation leaks in the bug-guard test (raw `.oxd-form-loader` locator and inline API-path manipulation).

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Move `.oxd-form-loader` into a page-object locator.
2. **[IMPORTANT]** Encapsulate the PUT-response matcher (page-object method or test-data constant) instead of `replace('/web/index.php','')` in the spec.
3. **[SUGGESTION]** Exact-match node locators.
4. **[SUGGESTION]** Lift literal unitIds/name-prefixes into `test-data`.
5. **[SUGGESTION]** Exact-match `credentialRequired`.
