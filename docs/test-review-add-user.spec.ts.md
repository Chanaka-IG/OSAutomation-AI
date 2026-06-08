# Test Code Review — `tests/admin/add-user.spec.ts`

**Reviewer**: Senior QA Code Reviewer (Claude)
**Date**: 2026-06-07
**Files reviewed**: `tests/admin/add-user.spec.ts` + imports: `src/pages/admin/SystemUsersPage.ts`, `src/pages/auth/LoginPage.ts`, `src/pages/BasePage.ts`, `src/fixtures/index.ts`, `src/api/orangehrmOSAPI/AdminUsersApi.ts`, `src/api/orangehrmOSAPI/EmployeesApi.ts`, `test-data/admin/frontend/systemUsers.ts`, `test-data/auth/index.ts`, `src/config/env.ts`
**Checklist source**: `playwright-best-practices` skill, `orangehrm-opensource-domain` skill (`ui-selectors.md`, `business-rules.md`, `user-flows.md`)

---

## What's Good

- **POM discipline is excellent.** Every selector lives in `SystemUsersPage` / `BasePage`; the spec body contains zero raw locators except `page.getByText(...)` for the Credential Required message (acceptable — it's a one-off, data-driven string). The `formGroup()` / `fieldError()` label-anchored pattern matches the OXD guidance in `ui-selectors.md` exactly.
- **Test data is centralized.** Routes, URL patterns, validation messages, and boundary samples all live in `test-data/admin/frontend/systemUsers.ts` with live-verified annotations. `overlongUsername: 'a'.repeat(41)` and the strong/weak password samples are well chosen for the documented 5–40 / 8-char rules.
- **Success asserted via toast, not URL** (`saveAndWaitForToast` → `.oxd-toast--success`), per business-rules §10 — and the URL redirect is asserted *additionally*, which is the right layering.
- **Cleanup is correct and ordered.** `afterAll` deletes users first, then the suite employee — respecting business-rules §11 (deleting a user does not delete the employee; the employee delete clears the rest). Case-insensitive username matching in cleanup mirrors MySQL collation.
- **Domain accuracy is high.** Empty-save Confirm Password → `"Passwords do not match"` exception, `"Account disabled"` alert, `"Invalid"` on unbound autocomplete text, `"No Records Found"` option, case-insensitive `"Already exists"` firing while typing, `employeeId` ≤ 10 chars API cap — all match the verified domain notes.
- **TC-105 login nuance handled correctly**: it uses `open()` + `login()` instead of `loginWithCredentials()` because the latter waits to *leave* the login page, which a disabled account never does. Good catch — many suites get this wrong.
- **TC-102 verifies the duplicate at the API layer too** (`matches.toHaveLength(1)`) — asserting the *system state*, not just the UI message.
- **Traceability**: every test carries a TC id, folded micro-cases are documented in the header and inline (`// Folds TC-503...`), and step comments follow the `// -- Step N --` convention.

---

## Issues Found

### [IMPORTANT] 1. API data seeded inside test bodies (3 tests)
**Lines**: 123–132 (TC-003), 179–188 (TC-105), 295–304 (TC-004)
**Rule violated**: Best-practices §5 *"Add data via APIs"* — *"Dont add data through APIs inside the test body, always add data through APIs in the test hooks (beforeEach or beforeAll)."*

```ts
// inside test body (TC-003)
await orangehrmAdminApi.loginAsAdmin();
const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
await usersApi.create({ username, ... });
```

The same `loginAsAdmin()` + `new AdminUsersApi(...)` + `create(...)` block is repeated three times in test bodies.

**Fix**: Seed all three API-owned users (`loginuser.*`, `disabled.*`, `search.*`) once in the existing `test.beforeAll`, right after the suite employee is created, and push them to `createdUsernames` there. The tests then only consume them:

```ts
test.beforeAll(async ({ orangehrmAdminApi, masterDataReadiness }) => {
  ...
  suiteEmpNumber = empNumber;
  const usersApi = new AdminUsersApi(orangehrmAdminApi.request);
  for (const seed of [SEEDED.loginUser, SEEDED.disabledUser, SEEDED.searchUser]) {
    await usersApi.create({ ...seed, empNumber: suiteEmpNumber });
    createdUsernames.push(seed.username);
  }
});
```

---

### [IMPORTANT] 2. Hardcoded assertion string when the test-data constant already exists
**Line**: 196

```ts
await expect(loginPage.loginErrorAlert).toHaveText('Account disabled');
```

**Rule violated**: Best-practices §5 *"Pass data to Page class from test body"* — data must come from test-data files. `test-data/admin/frontend/systemUsers.ts:28` already defines `messages.accountDisabled: 'Account disabled'` (live-verified) and it is **never used**.

**Fix**:
```ts
await expect(loginPage.loginErrorAlert).toHaveText(usersData.messages.accountDisabled);
```

---

### [IMPORTANT] 3. `mode: 'serial'` couples independent tests — one failure skips the rest
**Line**: 18

```ts
test.describe.configure({ mode: 'serial', timeout: 120_000 });
```

**Rule violated**: Best-practices §11 anti-pattern *"Shared state between tests → Order-dependent failures → Each test self-contained."*

These tests are genuinely independent — each creates its own user; the only shared state is `suiteEmpNumber` (from `beforeAll`, available regardless) and `createdUsernames` (cleanup bookkeeping only). With the project already running `fullyParallel: false`, serial mode adds nothing except *failure cascade*: if P0 TC-001 fails, every remaining P0/P1/P2 test is skipped and you lose their signal.

**Fix**: Drop `mode: 'serial'`, keep the timeout:
```ts
test.describe.configure({ timeout: 120_000 });
```

---

### [SUGGESTION] 4. TC-102's "save is blocked" assertion is weaker than it claims
**Lines**: 160–163

```ts
// Save with the error present must not create a duplicate
await systemUsersPage.saveButton.click();
await expect(page).toHaveURL(usersData.urlPatterns.add);
```

At this point User Role, Employee Name, Status, and both passwords are all empty — the save is blocked by five `Required` errors regardless of the duplicate username. The test would pass even if the duplicate check didn't block saving at all.
**Rule reference**: Best-practices §11 *"No assertions after every action — test passes but proves nothing."* (partial)

**Fix**: Fill all other fields validly (role, suite employee, status, strong password ×2) via `fillForm`, leave the duplicate username, then click Save and assert the form stays + API count stays 1. That isolates the duplicate rule as the only blocker.

---

### [SUGGESTION] 5. TC-001 row lookup can paginate-flake on a grown user list
**Lines**: 108–109

```ts
const row = systemUsersPage.rowByUsername(username).first();
await expect(row).toBeVisible();
```

Pagination defaults to 50 rows/page (business-rules §10). On a dedicated instance this passes today, but if seeded users accumulate past 50, the new `u****` row may land on page 2 and `toBeVisible()` fails. TC-004 already shows the robust pattern.

**Fix**: Reuse `await systemUsersPage.searchByUsername(username)` before asserting the row (keep the Records-Found delta check on the unfiltered list before the search).

---

### [SUGGESTION] 6. Magic `userRoleId: 2` repeated in three API payloads
**Lines**: 129, 186, 301
Business-rules §2 documents Admin = 1 / ESS = 2, but the spec hardcodes the number. Best-practices §5 (data from test-data files).

**Fix**: Add `userRoles: { admin: 1, ess: 2 }` to `adminSystemUsers` (or reuse the existing `test-data/pim/api/adminUsers` constants) and reference `usersData.userRoles.ess`.

---

### [SUGGESTION] 7. `create()` used where the skill mandates an existence check
**Lines**: 125, 181, 297
**Rule violated**: Best-practices §5 — *"When adding data through APIs, always check whether the data you are adding is already exist or not"*; the skill even quotes `createIfAbsent` as the canonical example, and `AdminUsersApi.createIfAbsent` exists (`AdminUsersApi.ts:23`).
The `STAMP` suffix makes collisions unlikely, but a same-millisecond rerun or a leftover from a crashed run (where `afterAll` never fired) turns `create` into a hard 422.

**Fix**: Use `usersApi.createIfAbsent(...)` for the three seeded users.

---

### [SUGGESTION] 8. Dead skip-guard + third `beforeEach`
**Lines**: 38–40

```ts
test.beforeEach(() => {
  test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});
```

`env.baseURL` falls back to `DEFAULT_BASE_URL` (`src/config/env.ts:5`), so `!env.baseURL` is always false — the guard can never trigger. It also adds a third `beforeEach` to the file, against best-practices §5 (*"Use test.beforeEach() only one time per spec file"* — the two describe-scoped login hooks are the legitimate ones).

**Fix**: Delete the hook (or, if instances without a default URL are a real scenario, move the check into `beforeAll`).

---

### [SUGGESTION] 9. Imported POM: index-based password locators (`SystemUsersPage.ts:50–52`)

```ts
this.passwordField = page.locator('input[type="password"]').first();
this.confirmPasswordField = page.locator('input[type="password"]').nth(1);
```

**Rule violated**: Best-practices §2 *"NEVER Use … Index-based selectors without filtering."* The domain `ui-selectors.md` does list `nth(0)/nth(1)` for these fields, so this is tolerated — but the class already owns the better tool:

**Fix**:
```ts
this.passwordField = this.formGroup('Password').locator('input.oxd-input').first();
this.confirmPasswordField = this.formGroup('Confirm Password').locator('input.oxd-input');
```
(`formGroup('Password')` substring-matches both groups — hence `.first()`; `Confirm Password` is unambiguous.)

---

### [SUGGESTION] 10. Imported POM: `mainMenuItem` uses substring `hasText` (`BasePage.ts:33`)

```ts
return this.page.locator('.oxd-main-menu-item').filter({ hasText: name });
```

**Rule violated**: Best-practices §2 *"Use exact text match for reliability."* `hasText: 'Admin'` is a substring match; today no menu item shadows it, but an exact regex is free insurance, especially since TC-003/TC-201 assert `toHaveCount(0)` on it (a false positive substring match would mask a security regression):

```ts
return this.page.locator('.oxd-main-menu-item').filter({ hasText: new RegExp(`^${name}$`) });
```

---

## Verified Non-Issues (checked, deliberately not flagged)

- `orangehrmAdminApi` (test-scoped fixture) in `beforeAll`/`afterAll` — established, passing pattern across 8+ committed specs in this repo.
- `toast` text asserted with `toMatch(/successfully saved/i)` — `waitForSuccessToast` returns the whole toast innerText (title + message), so regex-contains is the right comparator.
- TC-105's manual `clearCookies()` + `open()` + `login()` instead of `loginWithCredentials` — required, since the helper waits to leave the login page.
- `expect(username).toHaveLength(40)` (line 208) — sanity-check on constructed data, legitimate.
- Selectors cross-checked against `ui-selectors.md` (Add User section, verified live 2026-06-07): heading h6 "Add User", label-anchored Username group, password messages, `"No Records Found"` option, `"Credential Required"` for ESS deep links — all consistent.
- `SUITE_EMPLOYEE.employeeId` = 9 chars — respects the ~10-char `POST /pim/employees` cap (business-rules §3).

---

## Score: **8 / 10**

A well-engineered suite: clean POM, centralized verified test data, API seeding with deterministic cleanup, accurate domain assertions, and good traceability. Points lost for the explicit skill-rule violations: API seeding inside three test bodies, one hardcoded assertion string that bypasses existing test data, and an unnecessary `serial` mode that cascades failures.

## Recommended Fixes (priority order)

1. **[IMPORTANT]** Move the three in-body `usersApi.create(...)` seeds into `beforeAll` (Issue 1).
2. **[IMPORTANT]** Replace `'Account disabled'` literal with `usersData.messages.accountDisabled` (Issue 2).
3. **[IMPORTANT]** Remove `mode: 'serial'` — keep only the 120s timeout (Issue 3).
4. **[SUGGESTION]** Strengthen TC-102: fill all other fields validly so the duplicate error is the sole save blocker (Issue 4).
5. **[SUGGESTION]** TC-001: search by username before asserting the new row (Issue 5).
6. **[SUGGESTION]** Hoist `userRoleId` into test data (Issue 6) and switch seeds to `createIfAbsent` (Issue 7).
7. **[SUGGESTION]** Delete the dead `BASE_URL` skip-guard (Issue 8).
8. **[SUGGESTION]** POM polish: label-anchor the password inputs; exact-match `mainMenuItem` (Issues 9–10).
