# Test Review — Add Users

**Files reviewed**: `tests/admin/add-user.spec.ts` (primary) + imported: `src/pages/admin/SystemUsersPage.ts`, `test-data/admin/frontend/systemUsers.ts`, `src/api/orangehrmOSAPI/AdminUsersApi.ts` (new methods), `src/fixtures/index.ts` (registration), `test-data/index.ts` (barrel).
**Checklist**: `playwright-best-practices` + `automation-framework` skills; selectors cross-checked against `ui-selectors.md` and live MCP verification (2026-06-07).
**Run status at review time**: 9/9 passed, full afterAll cleanup confirmed.

---

## What's Good
- Follows the framework patterns end-to-end: fixtures import (`../../src/fixtures`), serial mode, `masterDataReadiness`, suite-owned data seeded via API in `beforeAll` and hard-deleted in `afterAll` (users **and** the prerequisite employee).
- Correct OXD interaction patterns: `selectOxdOption`, `waitUntilTableLoaderDissapear`, toast captured via `saveAndWaitForToast` before SPA redirect.
- No `waitForTimeout`, no `test.only`, no hardcoded record ids; unique data derived from a single `STAMP`.
- Defense-in-depth done right: TC-102 verifies server state via API after the UI duplicate check; TC-501 confirms absence via API, not just UI.
- Validation messages and boundary behavior (5/40/41 chars, 8-char password, upper-case rule, `Invalid` autocomplete error, Confirm-Password "Passwords do not match" on empty save) were all verified live before being asserted — no guessed strings.
- API seeding used wherever form mechanics aren't the subject (TC-003/004/105) — keeps each test scoped to one concern.

## Issues Found

### [IMPORTANT] I-1 — Raw locator in test body: login error alert (TC-ADMIN-AU-105)
- **Line**: `tests/admin/add-user.spec.ts` ~196: `await expect(page.locator('.oxd-alert-content-text')).toBeVisible();`
- **Violation**: Best practices §2 "Locators should be always defined in the page class … never define locators directly in the test body" + "Common Test Validation → add to BasePage/page object".
- **Fix**: Add `readonly loginErrorAlert: Locator` to `LoginPage` (`page.locator('.oxd-alert-content-text')`) and assert via `loginPage.loginErrorAlert`.

### [IMPORTANT] I-2 — Weak assertion on disabled-login outcome (TC-ADMIN-AU-105)
- **Line**: same test — only `toBeVisible()` on the alert + URL check.
- **Violation**: Best practices §11 "No assertions after every action → test passes but proves nothing" (partially): the test cannot distinguish "Account disabled" from an unrelated "Invalid credentials" caused by, e.g., a password-seeding bug.
- **Fix**: Assert the alert text. Domain rule (business-rules §1) says wrong credentials return `Invalid credentials`; verify the actual text rendered for a disabled account once via MCP/run artifact and pin it (e.g. `toHaveText(/account disabled/i)` or the verified string in `systemUsers.ts` messages).

### [IMPORTANT] I-3 — Raw `getByRole('option', …)` locators in test body (TC-ADMIN-AU-001, TC-ADMIN-AU-300)
- **Lines**: ~92–96 (`page.getByRole('option', { name: SUITE_EMPLOYEE_FULL_NAME … })` twice) and ~272 (`page.getByRole('option', { name: usersData.messages.noRecordsFound })`).
- **Violation**: same POM rule as I-1. The page object even exposes `autocompleteOptions` (currently **unused — dead code**) and `pickEmployee()`, but TC-001 re-implements the pick inline.
- **Fix**: Add `autocompleteOption(name: string): Locator` to `SystemUsersPage`; use it for the TC-503 visibility assertion, then call the existing `pickEmployee()`. Use it for "No Records Found" too. Remove or use `autocompleteOptions`.

### [SUGGESTION] S-1 — Test-data sanity check asserted inside a test (TC-ADMIN-AU-002)
- **Line**: ~210: `expect(username).toHaveLength(40);`
- This asserts the test's own constant, not app behavior. Harmless, but it muddies "what failed" semantics. Either drop it or compute the username so it is 40 by construction with a comment.

### [SUGGESTION] S-2 — `fieldError()` regex construction is clever-but-opaque (`SystemUsersPage.ts`)
- **Line**: `const pattern = new RegExp(\`^${labelText.replace('*', '\\\\*?$')}\`)` — the `'Password*'` → `^Password\*?$` transformation is hard to read and easy to break on the next edit.
- **Fix**: Accept an explicit `RegExp` for the ambiguous case (`fieldError(/^Password\*?$/)`) or two clearly named helpers. Behavior is correct today (verified by the passing run); this is maintainability only.

### [SUGGESTION] S-3 — `page.getByText(credentialRequired)` in TC-ADMIN-AU-201 test body
- Same pattern exists in the approved `add-job-title.spec.ts` suite, so it's consistent with the codebase; still, a shared `credentialRequiredMessage` locator on `BasePage` would serve both suites. Low priority.

## Selector Verification
All page-object selectors were verified against the live kord instance via Playwright MCP during generation (Add form heading h6 "Add User", role/status `.oxd-select-text` groups, `Type for hints...` autocomplete, 2× `input[type="password"]`, list heading h5 "System Users", "(N) Records Found"). No unverified selectors found. ✔

## Domain Cross-Check
- Password minimum is **8** chars on this build ("Should have at least 8 characters") — `user-flows.md` edge table says "< 7 chars rejected", which is stale; the test correctly asserts the live behavior. Domain-skill discrepancy noted, not a test bug.
- Confirm Password renders "Passwords do not match" (not "Required") on empty save — verified live; correctly encoded in test-data.

## Score: 8/10

## Recommended Fixes (priority order)
1. I-1 — move login-alert locator into `LoginPage`.
2. I-3 — add `autocompleteOption()` to `SystemUsersPage`; remove dead `autocompleteOptions` or use it; de-duplicate TC-001's inline pick via `pickEmployee()`.
3. I-2 — pin the disabled-account alert text (verify actual string first; do not guess).
4. S-1 — drop the `toHaveLength(40)` self-assertion.
5. S-2 / S-3 — optional maintainability cleanups.

---

# Review Fixes — Applied (2026-06-07)

## Fixed Issues
- **I-1** — `src/pages/auth/LoginPage.ts`: added `readonly loginErrorAlert` (`.oxd-alert-content-text`); TC-ADMIN-AU-105 now asserts via the page object.
- **I-2** — Disabled-account alert text probed live (single-test run): renders **"Account disabled"**. Pinned as `messages.accountDisabled` in `test-data/admin/frontend/systemUsers.ts`; TC-ADMIN-AU-105 asserts `toHaveText(...)` instead of bare visibility.
- **I-3** — `src/pages/admin/SystemUsersPage.ts`: added `autocompleteOption(name)`; removed dead `autocompleteOptions` locator; `pickEmployee()` reuses the helper; TC-ADMIN-AU-001 and TC-ADMIN-AU-300 no longer build `getByRole('option', …)` in the test body.
- **S-1/S-2/S-3** — intentionally not applied per review-fixes scope rule (SUGGESTIONs are only fixed when no CRITICAL/IMPORTANT issues exist).

## Score Improvement
Previous 8/10 → New 9/10 (remaining gap: optional SUGGESTION cleanups).

## Summary of Changes
Three files touched (`LoginPage.ts`, `SystemUsersPage.ts`, `systemUsers.ts` test data) plus the spec. Full suite re-run after fixes: **9/9 passed (3.6m)** with complete afterAll cleanup (5 users + suite employee hard-deleted).
