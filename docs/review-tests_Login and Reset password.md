# Test Code Review — Login and Reset Password

**File reviewed**: `tests/auth/login-reset-password.spec.ts`
**Imported files reviewed**: `src/pages/auth/LoginPage.ts`, `src/pages/auth/ResetPasswordPage.ts` (new), `test-data/auth/index.ts`, `src/fixtures/index.ts`, `src/fixtures/apiAction.ts`
**Standards**: `playwright-best-practices` skill; `automation-framework` skill; domain `ui-selectors.md` / `business-rules.md`.
**Run status at review time**: 15/15 passing in Chromium against `automationtest-os-kord.orangehrm.com`.

---

## What's Good
- **Selectors are all real.** Every locator was verified live via Playwright MCP before coding (login fields `input[name=...]`, `.oxd-alert-content-text`, `.oxd-input-field-error-message`, "Forgot your password?", "Reset Password" heading, email-not-configured text, "Click here"). No guessed selectors.
- **Page Object discipline.** Locators live in `LoginPage` / `ResetPasswordPage`; the new `ResetPasswordPage` follows the `BasePage` extension pattern and the fixture is wired into both `fixtures/index.ts` and (by inheritance) `apiAction.ts`. No assertions in page objects (best-practices §POM Rules).
- **No anti-patterns.** No `waitForTimeout`, no `test.only`, no `nth-child` chains, no hardcoded record IDs. Auto-waiting `expect()` used throughout (§9, §11).
- **Test data centralized.** Routes, URL patterns, messages, and samples added to `test-data/auth/index.ts`; the spec references `auth.*` rather than inline literals (§5 "Pass data to Page class"), with one exception noted below.
- **Self-contained tests.** Each `test()` logs in/sets state and asserts independently; relies on Playwright's per-test context isolation. No cross-test shared state (§11).
- **Proper API seeding/cleanup.** The disabled-user path (TC-102) seeds a suite-owned employee + disabled user in `beforeAll` via the `employees`/`users` API fixtures and tears both down in `afterAll` — data is owned, not borrowed (§ "Add data via APIs"). Gated with `test.skip` if seeding fails.
- **Logger, not console.** Uses `createLogger` (§13).
- **Correct waiting on negative paths.** Uses `loginPage.open()` + `login()` (no nav wait) for rejections that stay on `/auth/login`, and `loginAs()` / `loginWithCredentials()` (waits for redirect) for successful logins — avoids the timeout trap of waiting for navigation that never happens.
- **Sensible folding, documented.** TC-002 folds into TC-001; TC-100/TC-503/TC-006 fold into the single reset-flow test (TC-005) — closely-coupled UI-state checks on one page visit, with a header comment mapping covered IDs (matches the generate-tests guidance against one giant catch-all test while keeping the count sane).

## Issues Found

### [IMPORTANT] Hardcoded dashboard URL literal in TC-201
- **Location**: `tests/auth/login-reset-password.spec.ts`, TC-201 — `await loginPage.goto('/web/index.php/dashboard/index');`
- **Current**: the protected dashboard path is an inline string literal.
- **Fix**: add `dashboard: '/web/index.php/dashboard/index'` to `auth.routes` in `test-data/auth/index.ts` and reference `auth.routes.dashboard`.
- **Rule violated**: best-practices §5 (don't hardcode data in the test body; source routes from `test-data`). The suite already defines `auth.routes.protectedDeepLink` and `auth.urlPatterns.dashboard`, so this literal is the lone inconsistency.

### [SUGGESTION] Raw `page.locator('body')` in TC-203 test body
- **Location**: TC-203 — `await expect(page.locator('body')).not.toContainText(auth.samples.wrongPassword);`
- **Current**: a raw locator is built in the test rather than exposed via the page object.
- **Fix**: optionally expose a `pageBody` (or reuse the page-level root) locator on `LoginPage`, or leave as-is — a whole-document `body` assertion is a legitimate one-off and arguably clearer inline. Low priority.
- **Rule referenced**: best-practices §2 "Locators should be defined in the page class". Borderline; acceptable for a document-level negative assertion.

### [SUGGESTION] Non-exact `getByText` matches in `ResetPasswordPage`
- **Location**: `src/pages/auth/ResetPasswordPage.ts` — `backToLoginLink = page.getByText('Click here')` and `emailNotConfiguredMessage = page.getByText('The OrangeHRM system is not configured...')`.
- **Current**: partial text matches.
- **Fix**: `backToLoginLink` targets a dedicated span containing exactly "Click here", so `{ exact: true }` is safe and slightly more robust. The email message is intentionally a substring of a longer sentence (the full text spans nested nodes), so partial match is appropriate there — leave it.
- **Rule referenced**: best-practices §2 "Use exact text match for reliability". Minor.

### [SUGGESTION] New `tests/auth/` folder vs. existing `tests/pim/login.spec.ts`
- **Observation**: the repo's original happy-path login test lives at `tests/pim/login.spec.ts`, while this suite is placed at `tests/auth/login-reset-password.spec.ts`.
- **Assessment**: `tests/auth/` is the *correct* home — page objects already live under `src/pages/auth/` and other modules follow `tests/<module>/`. This is not a folder-structure violation; if anything the pre-existing `tests/pim/login.spec.ts` is the misfiled one. **No action required** for this PR; flagged only so the team can later relocate the legacy login test for consistency.

## Score: 9/10
A clean, well-layered suite with verified selectors, proper API seeding/cleanup, and correct wait strategy. One real nit (hardcoded dashboard route in TC-201); the rest are polish.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Add `auth.routes.dashboard` and use it in TC-201 instead of the inline `/web/index.php/dashboard/index` literal.
2. **[SUGGESTION]** Make `ResetPasswordPage.backToLoginLink` an exact text match (`{ exact: true }`).
3. **[SUGGESTION]** (Optional) Expose the `body` locator used in TC-203 on the page object, or consciously leave it inline.
4. **[SUGGESTION]** (Backlog, not this PR) Relocate the legacy `tests/pim/login.spec.ts` happy path under `tests/auth/`.
