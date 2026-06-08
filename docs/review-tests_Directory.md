# Test Review — `tests/directory/directory.spec.ts`

> Reviewer scope: spec file + imported files (`src/pages/directory/DirectoryPage.ts`,
> `src/api/orangehrmOSAPI/EmployeesApi.ts` additions, `test-data/directory/frontend/directory.ts`,
> `src/fixtures/index.ts` registration). Checklist: `playwright-best-practices` +
> `automation-framework` skills. Run status at review time: **12/12 passing**.

## What's Good
- Locator strategy follows the priority order: roles (`getByRole('button'|'heading'|'option')`), placeholder (`getByPlaceholder('Type for hints...')`), OXD classes only where no better hook exists — all verified live via MCP before use.
- Clean POM: all locators in `DirectoryPage`, zero assertions in the page object, business-level methods (`pickEmployee`, `runSearch`, `resetFilters`), `readonly` properties.
- Suite-owned data done right: disposable employee with `STAMP`-unique name, seeded via API in `beforeAll`, hard-deleted in `afterAll`; seeded directory employees never mutated. No hardcoded IDs — job title/location ids resolved by name at runtime.
- Defense-in-depth assertions: TC-DIR-001 cross-checks the UI count against `meta.total` from the API; TC-DIR-003 verifies every returned card carries the filtered title.
- Singular/plural record-count grammar (TC-100) folded into TC-001/TC-002 exactly as the strategy doc prescribed.
- `test.skip(!env.baseURL, ...)` guard, serial mode, step comments only where flow isn't obvious — consistent with the framework's newest suite (`add-user.spec.ts`).

## Issues Found

### [IMPORTANT] 1 — `recordsFoundText` is an unscoped page-wide `span` filter
`src/pages/directory/DirectoryPage.ts:50`
```ts
this.recordsFoundText = page.locator('span').filter({ hasText: /Records? Found/ });
```
The Employee Name autocomplete renders a "No Records Found" hint row while typing; if that row (or any future widget) renders the text inside a `span`, this resolves to 2 elements and `innerText()` / `toHaveText()` throw a strict-mode violation. It passes today only because the hint row uses a different element.
**Fix**: scope to the results header container verified live: `page.locator('.orangehrm-horizontal-padding span').filter({ hasText: /Records? Found/ })`.
**Rule violated**: Best practices §2 — avoid unscoped selectors; §3 scope actions/assertions to a parent.

### [IMPORTANT] 2 — Non-retrying count reads race the grid refresh after Search
`tests/directory/directory.spec.ts:171` (TC-DIR-003) and `:233` (TC-DIR-007)
```ts
expect(await directoryPage.recordsFoundCount()).toBe(cardCount);          // 003
expect(await directoryPage.recordsFoundCount()).toBeLessThan(initialCount); // 007
```
`runSearch()` waits on `.oxd-table-loader`, but the Directory grid is a card view — the loader's appearance there is not guaranteed (BasePage swallows the 2s wait silently). The preceding retrying expects don't pin the refreshed state: in TC-DIR-007, `not.toHaveCount(0)` is satisfied by the *stale* grid, so the immediate non-retrying count read can see pre-search values on a slow response.
**Fix**: anchor each on a retrying text assertion that can only be true post-refresh, e.g. in TC-DIR-007 assert `await expect(directoryPage.recordsFoundText).not.toHaveText(`(${initialCount}) Records Found`)` before reading the count; in TC-DIR-003 assert the singular/expected count text first (`(1) Record Found` for the suite-only title) and drop the raw `.count()` arithmetic.
**Rule violated**: §9 Wait Strategies — prefer auto-waiting `expect` over immediate reads; §11 — no assertions that pass without proving the outcome.

### [SUGGESTION] 3 — TC-DIR-003 assumes the suite employee is the only title-holder, but loops anyway
`tests/directory/directory.spec.ts:164-178` — the for-loop over all cards is robust, but the paired `recordsFoundCount === cardCount` only holds while results fit one page (≤14). Fine today; add a comment or cap so a >14-result regression fails with a clear message rather than a count mismatch.
**Rule**: §11 — tests should fail diagnosably.

### [SUGGESTION] 4 — `sidebarBackArrow` is dead code
`src/pages/directory/DirectoryPage.ts:58` — declared for TC-008 (P2, not generated). Harmless, but unused locators rot silently. Either drop it or annotate it for the P2 backlog.
**Rule**: framework convention — POM exposes what tests consume.

### [SUGGESTION] 5 — API default `limit=14` hardcoded in the spec
`tests/directory/directory.spec.ts:113` and `:124` — the page-size contract appears twice as a magic number. Move `defaultPageSize: 14` into `test-data/directory/frontend/directory.ts` next to `apiPath` so a product-side page-size change is a one-line fix.
**Rule**: best practices — no hardcoded data in test bodies; test-data files own constants.

## Cross-reference with domain knowledge
- "Invalid" unbound-autocomplete message, `-- Select --` defaults, singular `(1) Record Found`, `No Records Found` empty state: all match live-verified behavior recorded in `docs/test-scenarios_Directory.md`. No contradictions with `orangehrm-opensource-domain` (which has no Directory section — scenarios doc is the source of truth).
- `EmployeesApi.updateContactDetails` correctly documents the singular `pim/employee/{n}` path quirk (404 on the plural path — verified live).

## Score: 8/10
Passing, well-structured, properly seeded — held back by the two flake-risk items.

## Recommended Fixes (priority order)
1. Scope `recordsFoundText` to `.orangehrm-horizontal-padding` (IMPORTANT 1).
2. Replace the two race-prone non-retrying count reads with retrying text anchors (IMPORTANT 2).
3. Move `defaultPageSize` into test-data (SUGGESTION 5).
4. Annotate or remove `sidebarBackArrow` (SUGGESTION 4).
5. Add the one-page cap comment in TC-DIR-003 (SUGGESTION 3).
