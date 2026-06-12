# Test Code Review — `tests/performance/addKpis.spec.ts`

**Reviewed**: 2026-06-11 (re-review)
**Files in scope**: `tests/performance/addKpis.spec.ts` + imports — `src/pages/performance/AddKpisPage.ts`, `src/pages/BasePage.ts`, `src/fixtures/index.ts`, `src/api/orangehrmOSAPI/KpisApi.ts`, `test-data/performance/frontend/performance.ts`, `test-data/performance/api/kpis.ts`.
**Standards**: `playwright-best-practices` skill + `orangehrm-opensource-domain` (`ui-selectors.md`, `business-rules.md`).

> **Changes since last review** (spec edited after the prior pass):
> - ✅ **`test.only` removed** (was line 78) — the suite is no longer disabled in CI.
> - ✅ **TC-100 / TC-101 now assert** — `expect(await ...validateInlineMsg(...)).toBeTruthy()` (lines 157, 164). The "tests prove nothing" critical is resolved (but see [IMPORTANT] below — the underlying method is still not auto-waiting).
> - ❌ **Dangling `test` at EOF still present** (now line 175).
> - ❌ Teardown, weak `isVisible` assertions, TC-203 mislabel, hardcoded job title, double `beforeEach`, and the `KpisApi` template-string bug are unchanged. `AddKpisPage.ts` / `KpisApi.ts` were not modified (git-confirmed), so prior findings on them stand.

---

## What's Good

- **POM is used correctly** — locators live in `AddKpisPage`/`BasePage`, not in the test body; methods model user actions and assertions stay in the spec (§5 POM rules).
- **Idempotent seeding** — `KpisApi.createIfAbsent` / `EmployeesApi.createIfAbsent` check existence before insert, in `beforeAll` (not in test bodies) — §5 "Add data via APIs".
- **Data-driven** — form values, toast strings, validation messages all come from `test-data/performance/frontend/performance.ts` — §5.
- **Domain accuracy** — the page models the **Open Source** KPI form (*Minimum/Maximum Rating* + *Make Default Scale*, not Enterprise weights), matching the verified domain note and `ui-selectors.md`.
- **Robust reusable waits** — `waitForSuccessToast` asserts on `.oxd-toast--success` (per domain guidance); loader helpers degrade gracefully (§9 / "Common Test Validation").
- **`loginWithCredentials`** clears cookies before switching users — correct for ESS↔admin role switching.
- **Fixed since last pass** — removing `test.only` and adding assertions to TC-100/TC-101 were the two most damaging issues; good follow-through.

---

## Issues Found

### [CRITICAL] Dangling `test` statement at end of file
**Line 175:**
```ts
test
```
A bare `test` identifier expression — leftover/incomplete code. It does nothing at runtime, trips linting/TS no-unused-expression, and signals a truncated edit.
**Fix**: delete line 175 (and the trailing blank line 174).
**Violates**: §11 Anti-Patterns (committed cruft) / clean-code.

---

### [IMPORTANT] No teardown — cleanup is commented out
**Lines 54–59:**
```ts
// test.afterAll(async ({ orangehrmApiContext, orangehrmAdminApi }) => {
//   ...
//   await kpi.deleteAllKpis();
// });
```
With `mode: 'serial'` + shared seed data and no cleanup, created KPIs persist across runs. TC-005 (`validKpi`) and TC-006 (`validScale`) both create a KPI named **`Test KPI`** (`performance.ts` lines 36 & 44 share `name: 'Test KPI'`), and `createIfAbsent` will skip re-seeding next run → order-dependent suite that pollutes the SUT.
**Fix**: implement a real `afterAll` deleting the seeded/created KPIs (`KpisApi.deleteAllKpis()` already exists); give TC-005 and TC-006 distinct KPI names.
**Violates**: §11 — "Shared state between tests → Order-dependent failures"; §5 "clean up the data after the test execution".

---

### [IMPORTANT] `validateInlineMsg` is not awaited internally → TC-100/TC-101 still flaky
**`AddKpisPage.ts` lines 116–119:**
```ts
async validateInlineMsg(validationMsg: string): Promise<boolean> {
  const msgVisible = this.page.getByText(validationMsg, { exact: true }).isVisible(); // one-shot, no retry
  return msgVisible;
}
```
The spec now asserts the result (good), but `isVisible()` returns immediately with no auto-wait. If the OXD inline error renders a tick after `fillKeyIndicator` returns, the assertion flakes false. The `expect(...).toBeTruthy()` wrapper does not add retry because the boolean is already resolved.
**Fix** — make it a web-first assertion:
```ts
// AddKpisPage
async expectInlineMsg(validationMsg: string): Promise<void> {
  await expect(this.page.getByText(validationMsg, { exact: true })).toBeVisible();
}
// spec TC-100/TC-101
await addKpisPage.expectInlineMsg(frontend.performance.validationMsges.rating);
```
**Violates**: §9 Wait Strategies — "Use auto-waiting with `expect`"; §4.

---

### [IMPORTANT] Weak `isVisible().toBe(true)` assertions instead of web-first `expect`
**Spec line 66 (via `validateFieldVisibility`), line 124, line 92:**
```ts
expect(await addKpisPage.pageHeadingForAddKpi.isVisible()).toBe(true);   // line 124
expect(await addKpisPage.notAccessMsg()).toBe(true);                     // line 92
```
`isVisible()` is one-shot (no retry) → flaky on slow renders. `validateFieldVisibility` (page lines 75–85) chains seven `isVisible()` calls the same way.
**Fix**: expose the `Locator`s and assert with `await expect(locator).toBeVisible()` in the spec.
**Violates**: §4 Assertion Patterns + §9 Wait Strategies.

---

### [IMPORTANT] TC-203 title contradicts what it tests + unverified message
**Spec lines 88–93:**
```ts
test('TC-203 | Unauthenticated → login redirect ', async ({ addKpisPage, page }) => {
  await addKpisPage.loginWithCredentials(frontend.performance.userData.username, ...); // logs IN as ESS
  await addKpisPage.navigateToAddKpisPageasESS();
  await page.waitForLoadState('networkidle');
  expect(await addKpisPage.notAccessMsg()).toBe(true);
});
```
This is an **authenticated ESS authorization** test (ESS blocked from the admin KPI page), not an *unauthenticated redirect*. The title misleads triage.
The asserted locator is `getByText('Credential Required', { exact: true })` (`AddKpisPage.ts` line 46) — **I could not verify this exact string exists** in the app; OrangeHRM usually renders a "Forbidden"/"No permission" page. Per review rules, selectors must be verified against the real app before being trusted.
**Fix**: rename to the ESS-forbidden intent and confirm the real forbidden-state text/locator live (Playwright MCP).
**Violates**: §2 "verify locators exist in the real app"; test-naming clarity.

---

### [IMPORTANT] Hardcoded data passed from the test body to the page class
**Spec lines 106 & 115:**
```ts
await addKpisPage.filterByJobTitle('QA Engineer');
```
`'QA Engineer'` is a literal in the test body.
**Fix**: source it from `test-data` — `await addKpisPage.filterByJobTitle(frontend.performance.<jobTitle>);`
**Violates**: §5 "Don't pass hardcoded data to the page class from the test body".

---

### [IMPORTANT] Two `beforeEach` hooks + title-string coupling for setup
**Spec lines 13–15 and 46–52:**
```ts
test.beforeEach(() => { test.skip(!env.baseURL, ...); });
test.beforeEach(async ({ addKpisPage }, testInfo) => {
  if (testInfo.title.includes('TC-203')) { return; }   // brittle
  await addKpisPage.loginAs('admin');
});
```
Best practice is one `beforeEach` per file. Branching on `testInfo.title.includes('TC-203')` breaks the moment the title is renamed (and TC-203's title already drifted to "Unauthenticated…").
**Fix**: merge the skip-guard into a single hook; isolate the ESS-login test in its own `describe` block instead of matching the title.
**Violates**: §5 "Use `test.beforeEach()` only one time per spec file"; §11 implicit coupling.

---

### [IMPORTANT] `KpisApi` — template literals using single quotes (no interpolation)
**`KpisApi.ts` lines 24 & 72:**
```ts
throw new Error('Kpis.getAll failed: HTTP ${response.status()}')   // single quotes → literal text
```
`${...}` is not interpolated; the error always prints literal `${response.status()}`. Line 23 also uses `console.log` instead of the project `log` logger.
**Fix**: use backticks ``throw new Error(`Kpis.getAll failed: HTTP ${response.status()}`)`` and replace `console.log` with `log.error(...)`.
**Violates**: §10 "always use Logger utility"; correctness.

---

### [SUGGESTION] Naming typos / casing reduce maintainability
- `emploee` (spec line 23), `searchButon` (page 17/43), `Dissapear` ×3, `validateJobTitileDropDown` (page 158).
- `CancelDeleteKpiByName` (page 139) is PascalCase — methods should be camelCase (`cancelDeleteKpiByName`).
- `editKpiByName` names the pencil locator `deleteIcon` (page 149) — misleading.

### [SUGGESTION] `KpisApi.deleteExistKpis` unreachable `return` after `throw`
**`KpisApi.ts` lines 97–98** — `return` after `throw new Error(...)` is dead code; remove it.

### [SUGGESTION] TC-104 instantiates API + logs in inside the test body
**Spec lines 145–149** — `new JobTitlesApi(...)` + `orangehrmAdminApi.loginAsAdmin()` inside the test (a read, so acceptable) duplicates the `beforeEach` admin login. Prefer fetching job titles in a hook/fixture to keep the body about assertions.

### [SUGGESTION] Prefer `getByLabel` for the KPI form inputs
`ui-selectors.md` lists `getByLabel('Key Performance Indicator')` and Min/Max under their labels. The page uses `.oxd-input-group` filtered by regex — functional, but §2 ranks labels above CSS. Consider `getByLabel` where stable.

---

## Score: **6 / 10**

Up from 4/10. Removing `test.only` (was disabling 11 tests) and adding assertions to TC-100/TC-101 cleared the two release-blockers. What keeps it from going higher: a dangling `test` statement still ships, there's no teardown (dirty SUT + duplicate `Test KPI` names), and several assertions/`validateInlineMsg` still use one-shot `isVisible()` rather than web-first `expect`. None of these are catastrophic, but they're real flakiness/maintainability risks against the checklist.

---

## Recommended Fixes (priority order)

1. **Delete the dangling `test` on line 175.** *(CRITICAL)*
2. **Restore real `afterAll` teardown** and give TC-005/TC-006 distinct KPI names. *(IMPORTANT)*
3. **Convert `validateInlineMsg` to a web-first `expect(...).toBeVisible()` method** so TC-100/TC-101 stop being flaky. *(IMPORTANT)*
4. **Replace `isVisible().toBe(true)`** assertions (lines 66, 92, 124 + `validateFieldVisibility`) with `await expect(locator).toBeVisible()`. *(IMPORTANT)*
5. **Fix TC-203**: rename to the ESS-forbidden intent and verify the `'Credential Required'` locator against the live app. *(IMPORTANT)*
6. **Move `'QA Engineer'` into `test-data`** and pass it from there. *(IMPORTANT)*
7. **Collapse to one `beforeEach`** and drop the `testInfo.title.includes('TC-203')` coupling (use a describe block). *(IMPORTANT)*
8. **Fix `KpisApi` template-literal error strings** (backticks) and swap `console.log` → logger. *(IMPORTANT)*
9. Clean up naming typos, PascalCase method, misnamed `deleteIcon`, and the unreachable `return`. *(SUGGESTION)*
