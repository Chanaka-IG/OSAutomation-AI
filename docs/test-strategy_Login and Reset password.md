# Test Strategy — Login and Reset Password

**Input**: `docs/test-scenarios_Login and Reset password.md` (30 scenarios)
**Backend**: Web auth is a server-rendered form POST — `POST /web/index.php/auth/validate` (`username, password, _token`) → **302** on success, or 200 + re-rendered page with an `Invalid credentials` banner on failure (per API reference: web login returns 200 + banner, not 401). `GET /web/index.php/auth/logout` → 302 → `/auth/login`. The "Forgot your password?" page (`/auth/requestPasswordResetCode`) is a static, email-config-gated view on this instance (no submit endpoint exercised).
**Framework assets already available**: `src/pages/auth/LoginPage.ts` (`open()`, `login(u,p)`, `loginErrorAlert`), `BasePage` (`loginAs(role)`, `loginWithCredentials(u,p)`), `test-data/auth` (routes, urlPatterns, `getCredentials`, `essTestUser`), fixtures `loginPage` + `page`, seeded master data.

---

## Distribution

| Layer     | Count | Focus                                                                 | Approx. runtime |
|-----------|-------|-----------------------------------------------------------------------|-----------------|
| E2E       | 24    | Login journeys (valid/invalid/disabled), required-field validation, role menus, logout/session redirects, reset-password page, injection-safe inputs | ~3–4 min |
| API       | 4     | Form-POST contract: success 302, CSRF-token requirement, unauthenticated access redirect | ~20 s |
| Component | 2     | OXD field render / masking / banner state (folded into E2E — no component harness in repo) | — |
| Unit      | 0     | Credential matching / trimming logic lives in backend PHP — out of repo scope | — |

> This repo is a black-box Playwright project — there is **no Vue component harness or PHP unit runner**. Component/Unit checks are folded into adjacent E2E tests (one page visit, staged assertions). Auth's "API layer" is unusual: the web login is a form POST returning a 302/redirect (not a JSON contract), so most auth coverage is inherently E2E. API-layer tests here exercise the redirect/CSRF/session behavior of `/auth/validate` and a protected endpoint, not a REST resource.

## Layer Assignments

### E2E (multi-page journeys, session state, OXD client validation)
| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Valid admin login → dashboard | Critical full-stack journey; only E2E proves session + redirect |
| TC-002 | Admin sees full side menu | Role-based UI; folds into TC-001 |
| TC-003 | ESS login → ESS menu | Cross-role journey; needs real session |
| TC-004 | Logout → login page | Session lifecycle |
| TC-005 | Forgot-password link opens reset page | Multi-page navigation |
| TC-006 | "Click here" → back to login | Navigation round-trip; folds with TC-005 |
| TC-100 | Reset page email-not-configured state | Observable only in rendered page |
| TC-101 | Same error for bad user vs bad password | Anti-enumeration; UI banner comparison |
| TC-102 | Disabled account → "Account disabled" | Distinct banner; needs a disabled user + session attempt |
| TC-103 | Password case-sensitivity | Login outcome; banner assertion |
| TC-200 | Unauthenticated deep link → login | Redirect behavior in a browser context |
| TC-201 | Post-logout dashboard → login | Session invalidation journey |
| TC-203 | Banner doesn't echo password | DOM inspection after failed login |
| TC-204 | Credentials sent via POST not URL | Network-request inspection in browser |
| TC-300 | Wrong password → "Invalid credentials" | Core negative path |
| TC-301 | Non-existent username → "Invalid credentials" | Core negative path |
| TC-302 | Empty fields → "Required" ×2 | OXD client-side validation — invisible to API layer |
| TC-303 | Username only → password "Required" | OXD client validation (folds with TC-302) |
| TC-304 | Password only → username "Required" | OXD client validation (folds with TC-302) |
| TC-305 | Whitespace-only credentials rejected | Validation/negative edge |
| TC-400 | Padded username not silently trimmed | Deterministic login outcome |
| TC-401 | Very long username handled gracefully | Resilience; no crash |
| TC-402 | SQL-like username safely rejected | Injection-safety, observable end-to-end |
| TC-403 | Enter key submits the form | UI behavior |
| TC-500 | Login page renders all controls | UI-state, folds into TC-001 |
| TC-501 | Password field masked | UI-state, folds into TC-500 |
| TC-502 | Error banner clears on later success | UI-state across attempts |
| TC-503 | Reset page heading + back-link, no login form | UI-state, folds into TC-005/TC-100 |

### API (form-POST / redirect / session contract — fast, minimal browser)
| ID | Scenario | Target | Rationale |
|----|----------|--------|-----------|
| TC-104 | Valid form POST → 302 + session | `POST /auth/validate` (scrape `_token`) | Proves server-side auth contract independent of UI |
| TC-202 | POST without/invalid CSRF token rejected | `POST /auth/validate` | CSRF enforcement is a backend concern |
| TC-200 (dup) | Protected endpoint unauthenticated → redirect/401 | `GET /api/v2/...` with no session | AuthN gate at the request layer (defense-in-depth with E2E TC-200) |
| TC-201 (dup) | Session invalid after logout at request layer | `GET /auth/logout` then protected request | Confirms server-side invalidation, not just UI redirect |

> The API-layer entries for TC-200/TC-201 are **defense-in-depth duplicates** of their E2E counterparts: E2E proves the browser redirect, the API check proves the server actually refuses the request.

### Component (folded into E2E — no harness)
TC-500 (control render), TC-501 (password masking), TC-503 (reset-page composition), TC-502 (banner state) — single-component render/state checks asserted opportunistically inside the E2E login/reset tests.

### Unit (documented, not implementable here)
- Exact credential matching / case sensitivity — `orangehrmAuthenticationPlugin` (backend PHP).
- Username trim/normalize behavior — backend.

## Contested Assignments — Rationale
1. **Most auth scenarios stay E2E** — unlike CRUD modules, OrangeHRM web login has no JSON API; it is a form POST that returns a server-rendered page. The "Invalid credentials" / "Account disabled" / "Required" outcomes are only observable in the rendered DOM, so pushing them "down" is not possible. This is the rare case where E2E-heavy is correct, not an ice-cream-cone.
2. **TC-104 / TC-202 pulled to API** — the 302-on-success and CSRF-token requirement are genuine server contracts testable with a raw request context (scrape `_token`, POST, assert redirect/rejection) faster and more deterministically than via the UI.
3. **TC-302/303/304 consolidated into ONE E2E test** — per-field required-message tests at E2E are an anti-pattern; combine them in a single page visit with staged assertions (empty submit → both "Required"; fill one field → the other "Required").
4. **TC-200/TC-201 tested at BOTH layers** — security-critical; the browser redirect and the server-side request refusal are independent failure modes.
5. **TC-102 (disabled account) stays E2E** — requires a disabled system user and a real login attempt to surface the distinct "Account disabled" banner; no lower layer reproduces it. May be skipped at generation time if no disabled user can be seeded.
6. **Reset-password flow (TC-005/006/100/503) is E2E-only** — it is pure navigation + static rendered text on this email-unconfigured instance; there is no submit endpoint to exercise at the API layer.

## Anti-Patterns Found in Existing Tests
- `tests/pim/login.spec.ts` covers only the single happy path (valid admin login) — this suite substantially expands negative/security/reset coverage that was missing.
- No existing reset-password coverage anywhere in `tests/` — net-new.
- Repo convention: import `test`/`expect` from `src/fixtures`, use `loginPage`/`page` fixtures, reference `test-data/auth` routes & urlPatterns rather than inline literals — follow it; never hardcode the base URL.

## Execution Notes
- Use `loginPage.open()` + `loginPage.login(u,p)` for negative attempts (does **not** wait for navigation off `/auth/login`), and `loginAs('admin')` / `loginWithCredentials()` for successful logins (waits for redirect).
- Assert failure banner via `loginPage.loginErrorAlert` (`.oxd-alert-content-text`).
- Required-field messages: `.oxd-input-field-error-message` with text `Required`.
- Reset page text and "Reset Password" heading are stable; assert by role/heading and visible text.
- Disabled-account test (TC-102) requires seeding/finding a disabled user; gate with `test.skip` if unavailable rather than hardcoding one.
