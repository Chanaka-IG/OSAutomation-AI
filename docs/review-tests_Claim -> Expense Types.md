# Test Review — Claim → Expense Types

**Files reviewed:**
- `tests/claim/expense-types.spec.ts`
- `src/pages/claim/ClaimExpenseTypesPage.ts`
- `src/api/orangehrmOSAPI/ClaimExpenseTypesApi.ts`
- `test-data/claim/frontend/expenseTypes.ts`, `test-data/claim/api/expenseTypes.ts`
- Wiring: `src/fixtures/index.ts`, `test-data/index.ts`

**Standard:** `playwright-best-practices` skill.

---

## What's Good
- **POM discipline** — all locators in `ClaimExpenseTypesPage`; the spec holds only actions + assertions (§2, §5).
- **Locator priority** — `getByRole` for headings/buttons; the short `Name` label scoped via `filter({ has: getByText('Name', { exact: true }) })` (§2 exact-match rule), avoiding a substring clash with "Description".
- **Empty-state locator scoped to the list `<span>`** so it does not collide with the info toast that renders the same "No Records Found" copy — a lesson applied up front (no strict-mode violation).
- **Route-mock `rels: []`** matches the real API shape (array), so the empty state renders correctly (TC-500).
- **Data via API in hooks** — read-only fixtures seeded in `beforeAll` with `createIfAbsent`; cleanup in `afterAll` via `deleteByNames`, with `DELETE_TYPE` included so a retry re-seed is still cleaned (§5).
- **Auth pattern** — `loginAs('admin')` / `loginWithCredentials` for ESS (§5).
- **Toast assertions** reuse `BasePage` helpers; no `waitForTimeout` (§9, §11).
- **XSS test** actively guards against script execution via `page.on('dialog')` (§"Always assert outcomes").
- **Folder structure** unchanged — files in the established `src/pages/claim`, `src/api/orangehrmOSAPI`, `test-data/claim/{api,frontend}`, `tests/claim`.
- **Result:** 16/16 passed on the first run.

## Issues Found

### [SUGGESTION] TC-501 re-logs in the admin API inside the test body
`expense-types.spec.ts` TC-501 calls `orangehrmAdminApi.loginAsAdmin()` then `getAll()` in the test body to fetch the authoritative count. It works (idempotent — returns early if a session is active) and is a read, not a seed, so it doesn't violate the "no data mutation in test body" rule. Could be tidied into a fixture/helper, but acceptable as-is.

### [NOTE] TC-106 (active-only in claim expense dropdown) intentionally deferred
Documented in the strategy/priority docs: the Expense Type dropdown is reachable only after creating a claim request, which leaves un-cleanable claim data. The status rule is covered at the config layer (TC-003/005/505). This is a deliberate, logged scope decision — not a gap.

## Score: 9.5/10
Clean, convention-aligned mirror of the Claim → Events suite with all prior review lessons pre-applied. Only the minor TC-501 tidy-up suggestion remains.

## Recommended Fixes (priority order)
1. (Optional) Extract the TC-501 authoritative-count lookup into a small helper/fixture to keep the test body free of an API login call.
