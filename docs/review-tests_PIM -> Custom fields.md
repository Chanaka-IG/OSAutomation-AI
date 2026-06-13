# Test Review — PIM → Custom Fields

**File under review**: `tests/pim/custom-fields.spec.ts`
**Supporting files**: `src/pages/pim/CustomFieldsPage.ts`, `src/api/orangehrmOSAPI/CustomFieldsApi.ts`, `test-data/pim/frontend/customFields.ts`, `test-data/pim/api/customFields.ts`, `PersonalDetailsPage.fieldGroupByLabel` (reused), fixture wiring in `src/fixtures/index.ts`, barrel in `test-data/index.ts`.
**Checklist**: `playwright-best-practices` skill.
**Selector verification**: all selectors (`.oxd-input-group`-by-label, `.oxd-select-wrapper`, the conditional `Select Options` input, `.oxd-table-card`, `.orangehrm-dialog-popup`, the Remaining `<p>`) confirmed live via Playwright MCP. The Screen/Type option labels, the POST schema (`fieldType`/`screen`/`extraData`), the toast, the 10-cap counter, the duplicate "Already exists" trigger, and the on-screen rendering of a created field were each verified on the live instance.
**Run status**: 10/10 passing in Chromium (after fixing a hydration race + a cross-page navigation race during generation).

---

## What's Good
- **Cap-aware cleanup** (§5/§8): custom fields are instance-wide and capped at 10. `afterEach` resolves the test's created names → ids → DELETE, so the cap and empty-state never drift. This is the key correctness concern for this feature and it's handled well.
- **Hydration race diagnosed and fixed properly**: the live field-name uniqueness validator is async; `gotoAddForm` now waits for the form loader + the input before any fill (root-cause fix), with a `blur()` in the duplicate test to deterministically trigger validation. Diagnosed via the three-way check, not papered over.
- **Robust counter assertion**: TC-001 asserts the invariant `Remaining = 10 − recordsFound` rather than hardcoded numbers — resilient to residue.
- **Strong downstream test** (TC-004): proves a created field actually renders on the employee's Personal Details screen (cross-module), reusing `PersonalDetailsPage.fieldGroupByLabel`.
- **Conditional-field coverage**: TC-002/302 verify the Select Options field appears for Drop Down and disappears on switch to Text, with the persisted `fieldType`/`extraData` checked via API.
- **Security** (TC-200): PIM+Admin menu absence and `Credential Required` + no Add/Save on both deep links.
- **Toast race handled**; **no `waitForTimeout`**, **no `console.log`**; data-driven from `test-data`; `serial` scoped to the stateful admin describe.
- **Stray-data defense**: TC-100 tracks the unique error-clearing name for cleanup after discovering the form can complete a previously-clicked (blocked) save once the name becomes valid.

---

## Issues Found

### [IMPORTANT] Raw locator in the spec body — TC-300 (spec ~lines 168, 175)
**Current**:
```ts
await expect(page.locator('.oxd-input-field-error-message')).toHaveCount(3);
...
await expect(page.locator('.oxd-input-field-error-message')).toHaveCount(2);
```
**Problem**: a raw CSS locator is used directly in the test. Best-practices §2.90 requires locators to live in the page object for maintainability/reuse (other pages expose `allValidationErrors` for exactly this).
**Fix**: add `readonly allValidationErrors = page.locator('.oxd-input-field-error-message')` to `CustomFieldsPage` and assert `customFieldsPage.allValidationErrors` here.

### [SUGGESTION] `recordsFoundText` regex also matches the empty-state span — CustomFieldsPage line ~71
**Current**:
```ts
this.recordsFoundText = page.locator('span').filter({ hasText: /Record(s)? Found/ });
```
**Problem**: "No Records Found" also contains "Records Found". Harmless today (`recordsFoundCount()` is only read when records exist, and it uses `.first()`), but latently ambiguous.
**Fix**: anchor on the counter shape: `/\(\d+\)\s*Record/`.

### [SUGGESTION] TC-100 depends on a subtle app behavior (deferred submit)
**Observation**: the duplicate test clicks Save while the "Already exists" error is showing (expects to stay on the form), then renames to a unique value. The app can then **complete that blocked save** once the name is valid, creating a stray record — the test now tracks that name for cleanup, which is correct, but the coupling is subtle.
**Fix (optional)**: to make intent explicit and avoid the deferred-submit entirely, split the "duplicate blocks save" assertion and the "error clears on edit" assertion so the second one doesn't follow a Save click; or assert the dup count `=== 1` (already done) as the authoritative guard. Low priority — the behavior is handled and verified.

---

## Score: 8.5/10
Thorough, live-verified coverage with excellent cap-aware cleanup and a correctly-diagnosed hydration fix. One real best-practice violation (raw locator in the spec) and two minor/cosmetic items.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Move the `.oxd-input-field-error-message` locator into `CustomFieldsPage` (`allValidationErrors`) and use it in TC-300.
2. **[SUGGESTION]** Anchor `recordsFoundText` on the `(N)` counter pattern.
3. **[SUGGESTION, optional]** Decouple TC-100's "error clears" step from the blocked Save click.

---

# Review Fixes Applied (Step 6)

## Fixed Issues
1. **[IMPORTANT] Raw locator in spec (TC-300)** — Added `allValidationErrors` to `CustomFieldsPage` and replaced both `page.locator('.oxd-input-field-error-message')` calls in TC-300 with `customFieldsPage.allValidationErrors`. POM rule (§2.90) satisfied. `src/pages/pim/CustomFieldsPage.ts`, `tests/pim/custom-fields.spec.ts`.
2. **[SUGGESTION] `recordsFoundText` ambiguity** — Anchored to `/\(\d+\)\s*Record/` so it can never match the "No Records Found" empty-state span. `src/pages/pim/CustomFieldsPage.ts`.
3. **[SUGGESTION, optional] TC-100 deferred-submit coupling** — *Accepted as-is.* The duplicate-blocks-save assertion is intentional, the stray name is tracked for cleanup, and the authoritative `dup count === 1` check already guards correctness. Decoupling would weaken the "blocked save" assertion for no real gain. Documented, not changed.

## Score Improvement: 8.5/10 → 9.5/10
The best-practice violation (raw locator) is resolved and the selector-ambiguity suggestion applied; the remaining item is a deliberate, documented trade-off.

## Summary of Changes
- `src/pages/pim/CustomFieldsPage.ts`: added `allValidationErrors`; anchored `recordsFoundText`.
- `tests/pim/custom-fields.spec.ts`: TC-300 uses the page-object error locator.
- **Re-run after fixes: 10/10 passing in Chromium; all created fields cleaned up in `afterEach` (instance verified back to 0 fields).**
