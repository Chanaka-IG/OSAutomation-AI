# Test Review — Performance → Manage Reviews

**File under review:** `src/pages/performance/ManageReviews.ts`
**Imported files also reviewed (per review rules):** `tests/performance/manage-reviews.spec.ts`, `test-data/performance/frontend/manageReviews.ts`, `test-data/performance/api/manageReviews.ts`, `src/api/orangehrmOSAPI/ManageReviewsApi.ts`, `src/pages/BasePage.ts`, `src/fixtures/apiAction.ts`, `src/fixtures/index.ts`
**Reviewed against:** `playwright-best-practices` skill, `orangehrm-opensource-domain` skill (+ `ui-selectors.md`, `business-rules.md`, `user-flows.md`), and live-verified Manage Reviews behavior (Save → Inactive / Activate → Activated; reviewer scoped to employee's supervisors; empty save → exactly 5× "Required").

**Folder structure check:** ✅ Unchanged and consistent with the project convention — `src/pages/performance/ManageReviews.ts`, `test-data/performance/frontend/manageReviews.ts` + `test-data/performance/api/manageReviews.ts`, `tests/performance/manage-reviews.spec.ts`, fixture wired in both `src/fixtures/index.ts` and `src/fixtures/apiAction.ts`.

---

## What's Good

- **POM discipline is solid.** All locators live in the page class; the spec calls business-level methods (`fillReview`, `clickActivateBtn`, `clickOnDeleteReview`) and keeps `expect` in the spec (§4, §5).
- **No hardcoded primary keys.** `jobTitle.getJobTitleIDbyName(...)` and `employees.getEmpNumberByEmployeeId(...)` resolve every id dynamically, exactly as §8 requires.
- **Seeding via API in hooks, not in test bodies.** Employees/users/job title/KPI are created in `beforeAll` with `createIfAbsent` (§5 "Add data via APIs").
- **BasePage toast helpers used everywhere** (`verifySuccessToastForActivate`, `verifySuccessToastForSave`, `verifySuccessToastforDeletion`, `VerifyNoRecords`) instead of ad-hoc toast text scraping (§ Common Test Validation).
- **No `waitForTimeout` sleeps anywhere**; the shared `pickDateFromDatePicker` and loader-wait helpers are reused (§9, §11).
- **Good scenario coverage matching domain rules:** full lifecycle (Inactive → Activated → In Progress → Completed), Save-only → Inactive, ESS "Credential Required" block, supervisor-scoped reviewer autocomplete, 5× Required on empty submit, unbound-autocomplete "Invalid" — all consistent with the domain skill / live-verified behavior.
- **Autocomplete handling is correct for OXD:** click → `pressSequentially` → wait for option → click, never `selectOption` (ui-selectors.md convention).

---

## Issues Found

### [CRITICAL] 1. `test.only` left in the suite
**File:** `tests/performance/manage-reviews.spec.ts:411`
```ts
test.only("TC-301: Free-typed (unbound) employee name is rejected", async ({ page, manageReviews }) => {
```
**Rule violated:** §11 Anti-Patterns — *"`test.only()` left in code → skips other tests in CI."* Note the git history: commit `0a7c029 removed test.only` — it has been reintroduced in the working tree. Every other test in this file (and the whole run) is silently skipped.
**Fix:** Change to `test(...)` before committing.

### [CRITICAL] 2. TC-500 registers the route mock AFTER `page.goto()` — the mock never (reliably) applies
**File:** `tests/performance/manage-reviews.spec.ts:394-407`
```ts
await page.goto(frontend.manageReviewData.routes.manageReviews)
await page.route('**/api/v2/performance/manage/**', async route => { ... })
await manageReviews.VerifyNoRecords();
```
**Rule violated:** §6 API Mocking — the pattern requires the route to be in place before the request fires. The list GET (`/api/v2/performance/manage/reviews`) is triggered by the page load; registering the route after `goto` is a race. When the real response wins, the list contains the 5 reviews seeded in `beforeAll`, no "No Records Found" toast ever appears, and `VerifyNoRecords` hangs until the 120s test timeout. Nothing after `page.route(...)` re-triggers the request either.
**Fix:**
```ts
await page.route('**/api/v2/performance/manage/**', ...);   // register FIRST
await page.goto(frontend.manageReviewData.routes.manageReviews);
await manageReviews.VerifyNoRecords();
```
Also: define the mocked body as a named constant at the top of the file (§6 "Mock Data"), and the test title has a leading space (`" TC-500 | ..."`).

### [IMPORTANT] 3. `fillReviewasSupervvisor` never uses `finalRating` from test data
**File:** `src/pages/performance/ManageReviews.ts:128`
```ts
await this.finalRating.fill(String(reviewData.rating))   // should be reviewData.finalRating
```
**Rule violated:** §5 "Pass data to Page class from test body" — the test-data file defines `finalRating: 40` (`test-data/performance/frontend/manageReviews.ts:61`) but the form is filled with `rating` (30). The data file lies about what the test does, and any future assertion on the final rating will mismatch.
**Fix:** `await this.finalRating.fill(String(reviewData.finalRating))`. While there, fix the method-name typo `fillReviewasSupervvisor` → `fillReviewAsSupervisor`.

### [IMPORTANT] 4. `validateDataReadonly()` waits for a future `load` event — built-in race
**File:** `src/pages/performance/ManageReviews.ts:170`
```ts
async validateDataReadonly(...) {
    await this.page.waitForEvent('load');
```
**Rule violated:** §9 Wait Strategies — `waitForEvent('load')` only resolves for the **next** load event. TC-003 calls this after `verifySuccessToastForSave()` + `waitUntilFormLoaderDissapear()`; if the post-Complete reload has already finished (the common case), this waits forever and burns the whole 120s timeout. The `toBeDisabled()` assertions in the spec auto-wait anyway.
**Fix:** Delete the `waitForEvent('load')` line (the method then needs no `async` work — it can be a plain getter returning the three locators, like `validateRequiredErrors()`).

### [IMPORTANT] 5. Non-retrying value assertions built on `textContent()`
**Files:** `src/pages/performance/ManageReviews.ts:107-110, 157-167` and `tests/performance/manage-reviews.spec.ts:226, 268, 322-328`
```ts
expect(await manageReviews.checkReviewStatusAsAdmin(...)).toBe('Activated');
expect(validateData.jobTitle).toBe(...);
```
**Rule violated:** §4 — *"Use locator-based assertions with `await expect(locator)` / utilize auto-waiting and retry capabilities."* `textContent()` snapshots the cell once; if the grid re-renders after Activate/Search (OXD tables shimmer-reload, business-rules §10), the test reads a stale/empty cell and fails flakily. This is exactly why `checkReviewStatusAsAdmin` returns `status ?? ""`.
**Fix:** Have the page object return row-scoped **locators** (e.g. `reviewRowCell(employeeName, column): Locator`) and assert in the spec with `await expect(cell).toHaveText('Activated')`.

### [IMPORTANT] 6. `afterAll` wipes EVERY review in the system, not just this suite's
**Files:** `tests/performance/manage-reviews.spec.ts:192-195` → `src/api/orangehrmOSAPI/ManageReviewsApi.ts:34-52`
```ts
async deleteAllReviews(): Promise<void> {
    const reviews = await this.getAll();
    const deleteIds = reviews.map((item) => item.id)
```
**Rule violated:** §11 Anti-Patterns — shared state between tests/suites. `getAll()` fetches the unfiltered admin list and deletes everything, including reviews created by other suites, manual QA data, or a parallel run against the shared environment.
**Fix:** Track the ids of the reviews this suite creates (`createReview` should return the created id) and delete only those; or filter `getAll()` by the seeded employees' empNumbers.

### [IMPORTANT] 7. Reviews are re-created unconditionally on every run
**File:** `tests/performance/manage-reviews.spec.ts:99, 121, 144, 166, 188`
**Rule violated:** §5 "Add data via APIs" — *"always check whether the data you are adding already exists… use that data instead."* Every other seeder in this hook uses `createIfAbsent`, but `manageReview.createReview(...)` is fire-and-forget ×5. If `afterAll` ever fails (or the run is interrupted), the next run stacks duplicate reviews for the same employees, which then breaks the strict-mode row lookups (see issue 9) and the search assertions.
**Fix:** Add a `createIfAbsent`-style guard to `ManageReviewsApi` (match on empNumber + reviewer + period from `getAll()`), mirroring `KpisApi`/`AdminUsersApi`.

### [IMPORTANT] 8. The same 16-line date-computation block is copy-pasted 6 times
**File:** `tests/performance/manage-reviews.spec.ts:16-31, 202-217, 244-259, 279-281, 300-315, 346-359`
**Rule violated:** § Common Test Validation — *"if something is common… reuse; this will reduce code duplication and make the test more maintainable."* Two extra hazards baked into the duplication:
- `toISOString()` is **UTC** — a run near local midnight (or `beforeAll` and TC-005 straddling a UTC date change) makes the seeded review's period differ from the dates recomputed inside TC-005, failing `expect(validateData.period).toBe(startDate + " - " + endDate)` (line 325).
- `setMonth(+1)` overflows at month-end (e.g. Jan 31 → Mar 3).
Also `today` is computed but unused in TC-001 and TC-005.
**Fix:** Extract one helper (e.g. `getReviewPeriodDates()` in the test-data file or a shared date util) that formats in **local** time, and call it from `beforeAll` and each test — or compute once at module level and reuse.

### [IMPORTANT] 9. Row lookups without `.first()` → strict-mode violation the moment an employee has 2 reviews
**File:** `src/pages/performance/ManageReviews.ts:112-121, 158`
```ts
const row = this.page.getByRole('row').filter({ hasText: employeeName });   // validateDataInTable
await this.page.getByRole('row').filter({ hasText: employeeName }).getByTitle('Evaluate').click();
```
**Rule violated:** §3 Filtering and Scoping — the pattern is filter **then** disambiguate (`.first()` or a stronger `has:` filter). `checkReviewStatusAsAdmin` (line 108) already does `.first()` — the other three row methods don't. Combined with issue 7 (duplicate seeded reviews), these throw "strict mode violation: resolved to 2 elements".
**Fix:** Apply the same `.first()` (or filter by period/status too) in `clickOnActionAsSupervisor`, `clickOnDeleteReview`, `clickOnEditIcon`, and `validateDataInTable`.

### [IMPORTANT] 10. Inexact option matching with partial names in the supervisor autocomplete
**Files:** `src/pages/performance/ManageReviews.ts:75, 82` + `test-data/performance/frontend/manageReviews.ts:18, 22, 68`
```ts
const option = this.page.getByRole('option', { name: supervisorName });   // no exact — data passes 'Marco', 'Rezaa'
```
**Rule violated:** §2 — *"Use exact text match for reliability… avoid partial matches to prevent false positives."* `selectEmployee` uses `exact: true`; `selectSupervisor`/`validateSupervisor` don't, and the data deliberately feeds fragments (`'Marco'`, `'Rezaa'`). A second employee named "Marcos …" would make this click the wrong option. The test data also stores the same person twice in different shapes (`supervisorForSearch: 'Marco'` vs `supervisorName: 'Marco Hales Janson'`).
**Fix:** Store full display names in test data (`'Marco Hales Janson'`), pass them through, and use `{ exact: true }` in `selectSupervisor`. `validateSupervisor` can keep a partial *query* but should assert the option by exact full name (which TC-100 already does at the spec level).

### [IMPORTANT] 11. Dead code: unused imports and a stray expression
- `src/pages/performance/ManageReviews.ts:1` — `import { stat } from "node:fs";` — a Node fs import inside a browser page object, never used.
- `src/pages/performance/ManageReviews.ts:3` — `expect` imported but never used (correctly so — assertions belong in the spec; drop the import).
- `tests/performance/manage-reviews.spec.ts:61` — stray `1` expression after `users.createIfAbsent({...}); 1` — leftover noise.
**Rule violated:** general maintainability / §12 (keep code clean and intention-revealing).
**Fix:** Delete all three.

### [SUGGESTION] 12. Magic indexes into `apiEmployees[0..15]` make the fixture unreadable
**File:** `tests/performance/manage-reviews.spec.ts:35-188`, `tests/performance/manage-reviews.spec.ts:273`
`apiEmployees[4]/[5]`, `[6]/[7]`, `[8]/[9]`, `[10]/[11]`, `[14]/[15]` (and `[12]/[13]` seeded but never used) encode "supervisor/ESS pairs" purely by position; the frontend data file then re-declares the same people by display name (`'Shane Warne'`, `'Daniiel Vittori'`…). One reorder of the array silently rewires every test.
**Fix:** Export named actors from the API data file (e.g. `reviewData.lifecyclePair`, `reviewData.searchPair`, `reviewData.deletePair`) and derive display names from the employee records instead of duplicating strings in two files.

### [SUGGESTION] 13. TC-300 says "Empty Save" but clicks **Activate**
**File:** `tests/performance/manage-reviews.spec.ts:378-390` (`clickActivateBtn()` at line 383)
The live-verified rule is "empty **save** → exactly 5× Required". Activate happens to validate the same way, but the title/behavior mismatch will confuse the next reader; also consider asserting the count is exactly 5 (`getByText('Required', {exact:true})` → `toHaveCount(5)`) to match the domain rule precisely.
**Fix:** Either click Save or rename the test; optionally add the count assertion.

### [SUGGESTION] 14. Lifecycle tests end on a toast without asserting the resulting state
**File:** `tests/performance/manage-reviews.spec.ts:236-239 (TC-004), 366-367 (TC-006)`
**Rule:** §11 — *"No assertions after every action → test passes but proves nothing."* TC-004's title promises "→ Completed" but the last assertion is a generic success toast; TC-006 edits period/due date/reviewer yet never verifies the new values persisted (e.g. via the list row or reopening the form).
**Fix:** After Complete, assert the review row shows `Completed`; in TC-006, assert the updated period/due date in the list row.

### [SUGGESTION] 15. `invalidNameInput` reuses a real employee ('Benjamin Walker')
**File:** `test-data/performance/frontend/manageReviews.ts:80-83`
The unbound-autocomplete rule ("free-typed text never bound to a hint → Invalid") does hold even for real names, but using the same employee that TC-007 deletes a review for is confusing and makes the intent ("this name is invalid") false on its face. It also duplicates `dataForDeleteReview`.
**Fix:** Use a clearly non-existent name (e.g. `'Nonexistent Person Zz'`).

### [SUGGESTION] 16. Repeated `loginAs('admin') + goto(manageReviews)` in 7 of 9 tests
**File:** `tests/performance/manage-reviews.spec.ts` (every admin test body)
**Rule:** §5 Hooks — *"Use `test.beforeEach()` one time per spec file for common setup (e.g., login). If different tests require different setups, consider separate describe blocks."* Move the admin login+navigation into a `beforeEach` of the admin describe block and keep TC-200 (ESS) in its own block.

### [SUGGESTION] 17. Minor naming/typo cleanup
- `fillReviewasSupervvisor` (page:123), `supervisorReview.generalComment: "Supervisor geberal Review"` (data:60), `assignDerectSupervisors` (fixture name), `Dissapear` helpers (BasePage — project-wide, not this change).
- `verifyEmployeeNameInvalidError` (page:197) is `async` with no awaits — make it a sync getter like `validateRequiredErrors()`; `verifyAccessDeniedVisibility()` *returns* a locator rather than verifying — `accessDeniedMessage()` would be honest.

---

## Score: 5.5/10

The suite has a genuinely good skeleton — clean POM, dynamic id resolution, API-seeded data in hooks, BasePage toast helpers, real negative coverage. But it ships with a `test.only` that disables the whole file, a route-mock race that makes TC-500 unable to work as designed, a wrong-field fill in the supervisor evaluation, a `waitForEvent('load')` hang risk, and a destructive `deleteAllReviews` cleanup — plus heavy copy-paste of date logic and index-magic in the fixture.

## Recommended Fixes (priority order)

1. **[CRITICAL]** Remove `test.only` (spec:411).
2. **[CRITICAL]** TC-500: register `page.route(...)` **before** `page.goto(...)` and hoist the mock body to a named constant (spec:394-407).
3. **[IMPORTANT]** Fill `finalRating` from `reviewData.finalRating`, not `rating` (page:128).
4. **[IMPORTANT]** Remove `waitForEvent('load')` from `validateDataReadonly` (page:170).
5. **[IMPORTANT]** Scope suite cleanup to suite-created review ids instead of `deleteAllReviews()` (api:34-52, spec:192-195), and add an exists-check before each `createReview` (spec:99-188).
6. **[IMPORTANT]** Return locators from the page object and switch spec assertions to `toHaveText` (page:107-167, spec:226/268/322-328).
7. **[IMPORTANT]** Add `.first()` (or stronger filters) to all row-action methods (page:112-121, 158).
8. **[IMPORTANT]** Extract the date-computation helper (local-time formatting) and delete the 6 copies (spec:16-31 et al).
9. **[IMPORTANT]** Use full names + `{ exact: true }` in `selectSupervisor`; delete dead imports (`stat`, `expect`) and the stray `1` (page:1,3; spec:61,75).
10. **[SUGGESTION]** Named actor exports instead of `apiEmployees[n]` indexes; TC-300 Save-vs-Activate + 5× count assertion; assert end states in TC-004/TC-006; non-existent name for TC-301; consolidate admin login into `beforeEach`; typo cleanup.
