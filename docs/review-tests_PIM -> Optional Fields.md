# Test Review — PIM → Optional Fields

**File under review**: `tests/pim/optional-fields.spec.ts`
**Supporting files**: `src/pages/pim/OptionalFieldsPage.ts`, `src/pages/pim/PersonalDetailsPage.ts` (added helpers), `src/api/orangehrmOSAPI/PimOptionalFieldsApi.ts`, `test-data/pim/frontend/optionalFields.ts`, `test-data/pim/api/optionalFields.ts`, fixture wiring in `src/fixtures/index.ts`, barrel in `test-data/index.ts`.
**Checklist**: `playwright-best-practices` skill.
**Selector verification**: all selectors (`.orangehrm-optional-field-row`, `.oxd-switch-input`, `input[type=checkbox]`, the `<p>` title, `.oxd-grid-item`-by-label, `getByRole('tablist')` tab) confirmed against the live OS 5.8 DOM via Playwright MCP — not assumed. The SSN/SIN/Nickname/Tax-Exemptions effects and labels were each verified by enabling the toggle and observing Personal Details.
**Run status**: 10/10 passing in Chromium.

---

## What's Good
- **Excellent shared-state hygiene** (§5/§8): the optional-field config is an instance-wide singleton, and the suite handles it correctly — snapshot in `beforeAll`, **reset to a known baseline in `beforeEach`** (deterministic), and **restore the original snapshot in `afterAll`**. This is the standout strength; it prevents both cross-test coupling and instance pollution.
- **POM discipline** (§2.90/§4): no raw locators in the spec; `expect` only in the spec; the switch/checkbox/row locators and the click-the-span insight live in `OptionalFieldsPage`.
- **High-value downstream tests**: TC-100 proves the SSN field is **absent when off and present when on** (both directions); TC-101/102/402 prove the other gates. These assert the feature's real purpose, not just the toggle UI.
- **Correct toggle mechanics** (§2): the OXD switch is driven via `.oxd-switch-input` (the input is pointer-intercepted) — verified live and encoded once in the page object.
- **Toast race handled**: `saveAndWaitForToast()` arms the toast wait before clicking (the toast auto-dismisses ~3s).
- **Data-driven** (§5): captions, payload keys, downstream labels, and the sample empNumber all come from `test-data`; no magic strings in the spec body.
- **Serial only where needed**: `serial` is scoped to the stateful admin describe; the ESS describe is independent.
- **Security at the UI** (§): TC-200 checks PIM+Admin menu absence and `Credential Required` + no Save on the deep link.
- **No `waitForTimeout`, no `console.log`, dynamic-free** — config is boolean so no unique-data needed.

---

## Issues Found

### [SUGGESTION] `as string` cast in the spec body — spec line ~178
**Current**:
```ts
personalDetailsPage.recordMenuTab(ofData.fields.tax.recordMenuTab as string),
```
**Problem**: `recordMenuTab` is typed `string | null` in test-data (it's null for non-menu fields), forcing a cast at the call site. Casts in test bodies are a minor smell and can hide a future null.
**Violates**: §11 (clarity / avoid incidental type escapes).
**Fix**: pull the value into a `const taxTab = ofData.fields.tax.recordMenuTab;` with an `expect(taxTab).not.toBeNull()` guard, or narrow the type in test-data for the `tax` entry. Cosmetic.

### [SUGGESTION] `title` locator could be more specific — OptionalFieldsPage line ~25
**Current**:
```ts
this.title = page.locator('p').filter({ hasText: 'Optional Fields' });
```
**Problem**: scoping to any `<p>` containing "Optional Fields" is correct today (the page title is the only such `<p>`), but it's a broad anchor. If the page later adds a descriptive `<p>` mentioning "Optional Fields", this could resolve to >1.
**Violates**: §2 "exact text match for reliability."
**Fix**: use `{ hasText: /^Optional Fields$/ }` or scope within the page's card/header container. Low risk.

### [SUGGESTION] Downstream tests are coupled to a specific employee (empNumber 2)
**Current**: `EMP = ofData.sampleEmpNumber` (= 2, Marcus Chen, seeded master data), used read-only in TC-100/101/102/402.
**Problem**: the employee is only read (Personal Details visibility), never written, so this is safe — but it assumes empNumber 2 exists. If master-data seeding changes, these tests break.
**Violates**: §8 (in spirit — prefer not to hardcode record ids).
**Fix (optional)**: resolve a current employee via the employees API in `beforeAll` instead of hardcoding `2`. Given empNumber 2 is seeded master data and used read-only, this is low priority.

---

## Score: 9/10
A robust, best-practice-aligned suite whose handling of the shared-singleton config is exemplary. No CRITICAL or IMPORTANT issues. All findings are minor/cosmetic.

## Recommended Fixes (priority order)
1. **[SUGGESTION]** Remove the `as string` cast (guard the value or narrow the type).
2. **[SUGGESTION]** Tighten the `title` locator to an exact/anchored match.
3. **[SUGGESTION, optional]** Resolve the sample employee dynamically instead of hardcoding empNumber 2.

---

# Review Fixes Applied (Step 6)

## Fixed Issues
1. **[SUGGESTION] `as string` cast (spec ~line 178)** — Replaced with a narrowing guard: `const taxTab = ofData.fields.tax.recordMenuTab; if (!taxTab) throw …;` then `recordMenuTab(taxTab)`. TypeScript now narrows `taxTab` to `string` with no cast, and a misconfigured test-data entry fails loudly. `tests/pim/optional-fields.spec.ts`.
2. **[SUGGESTION] Broad `title` locator** — Anchored to exact text: `page.locator('p').filter({ hasText: /^Optional Fields$/ })`, so it can't match a future descriptive paragraph. `src/pages/pim/OptionalFieldsPage.ts`.
3. **[SUGGESTION, optional] Hardcoded empNumber 2** — *Accepted as-is.* The employee is used **read-only** for Personal Details visibility, `2` (Marcus Chen) is seeded master data the suite already relies on elsewhere, and resolving it dynamically would add an API round-trip for no correctness gain. Documented, not changed.

## Score Improvement: 9/10 → 9.5/10
Both cosmetic best-practice items resolved; the remaining item is a deliberate, documented low-risk acceptance.

## Summary of Changes
- `tests/pim/optional-fields.spec.ts`: removed the type cast in the Tax-Exemptions menu assertion via a null guard.
- `src/pages/pim/OptionalFieldsPage.ts`: anchored the page-title locator to exact text.
- **Re-run after fixes: 10/10 passing in Chromium; instance config restored to its original snapshot in `afterAll`.**
