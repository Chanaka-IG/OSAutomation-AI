# Review Fixes — Login and Reset Password

**Input**: `docs/review-tests_Login and Reset password.md`
**File fixed**: `tests/auth/login-reset-password.spec.ts` (+ `test-data/auth/index.ts`, `src/pages/auth/ResetPasswordPage.ts`)

---

## Fixed Issues

### [IMPORTANT] Hardcoded dashboard URL literal in TC-201
- **Was**: `await loginPage.goto('/web/index.php/dashboard/index');`
- **Now**: added `dashboard: '/web/index.php/dashboard/index'` to `auth.routes` (`test-data/auth/index.ts`) and changed TC-201 to `await loginPage.goto(auth.routes.dashboard);`
- **Rule satisfied**: best-practices §5 — routes sourced from `test-data`, no literals in the test body.

### [SUGGESTION] Non-exact "Click here" match in ResetPasswordPage
- **Was**: `page.getByText('Click here')`
- **Now**: `page.getByText('Click here', { exact: true })` (the link is a dedicated span, so exact match is safe and more robust).
- **Rule satisfied**: best-practices §2 — exact text match for reliability.
- The `emailNotConfiguredMessage` partial match was intentionally left as-is (it is a substring of a longer sentence spanning nested nodes — exact match would be brittle).

### [STABILITY] Flaky banner assertion under full-suite load (discovered while re-running)
- **Symptom**: TC-300 failed once in a full-suite run (`toHaveText` timed out) but passed in isolation (25.6s). Three-way check confirmed: selector verified live, "Invalid credentials" is a valid domain requirement (`business-rules §1`), and the test passes alone — so it is a transient render-timing flake under a 7-minute run that issues many sequential failed logins on the `admin` account, **not** a test-logic or app bug.
- **Fix**: gave the rejection-banner assertions an explicit `{ timeout: 10_000 }` (best-practices §4 — custom timeout for slow operations) on the negative-path checks (`invalidCredentials`, `accountDisabled`, and the two enumeration `toBeVisible()` assertions in TC-101).
- **Result**: full suite re-run **15/15 passing (6.9m)**, including the previously-flaky TC-300 (30.7s).

## Score Improvement
**Previous: 9/10 → New: 9.5/10**
Remaining 0.5 is the optional `page.locator('body')` inline locator in TC-203 (a legitimate document-level negative assertion, consciously left inline) and the backlog item of relocating the legacy `tests/pim/login.spec.ts`.

## Summary of Changes
- `test-data/auth/index.ts`: added `routes.dashboard`.
- `tests/auth/login-reset-password.spec.ts`: TC-201 now uses `auth.routes.dashboard`; rejection-banner assertions across TC-101/102/300/301/402/203/502 given a 10s timeout for stability under load.
- `src/pages/auth/ResetPasswordPage.ts`: `backToLoginLink` switched to exact text match.
- **Verification**: `npx playwright test tests/auth/login-reset-password.spec.ts` → **15 passed**.
