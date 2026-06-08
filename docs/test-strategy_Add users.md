# Test Strategy — Add Users (Admin → User Management → Users → Add)

**Input**: `docs/test-scenarios_Add users.md` (33 scenarios)
**Backend**: `POST /api/v2/admin/users` (orangehrmAdminPlugin `Api/UserAPI` CrudEndpoint — username 5–40 unique, `empNumber` non-nullable FK, `userRoleId` ∈ {1,2}, `status` bool)
**Framework assets already available**: `src/api/orangehrmOSAPI/AdminUsersApi.ts` (getAll / create / createIfAbsent), `src/pages/auth/LoginPage.ts`, fixtures in `src/fixtures`, seeded master data via `tests/setup/seed-master-data.spec.ts` (incl. ESS user `marcus.chen`).

---

## Distribution

| Layer     | Count | Focus                                                           | Approx. runtime |
|-----------|-------|-----------------------------------------------------------------|-----------------|
| E2E       | 12    | Add User form journey, role-based login outcomes, ESS lockout  | ~3–4 min        |
| API       | 11    | Contract validation, uniqueness, FK/enum errors, authZ, payload hygiene | ~30 s    |
| Component | 7     | OXD form rendering states (folded into E2E — no component harness in repo) | — |
| Unit      | 3     | Pure validation logic (lives in backend PHP — out of repo scope, documented only) | — |

> This repo is a black-box Playwright automation project — there is no Vue component harness or PHP unit runner. Component/Unit assignments are recorded for completeness; their scenarios are **folded into adjacent E2E tests** (single page visit, multiple assertions) so they don't inflate E2E count.

## Layer Assignments

### E2E (multi-page journeys, login state, real toasts)
| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Add ESS user happy path | Critical full-stack journey — form → toast → grid |
| TC-002 | Add Admin user | Folds into TC-001 suite; verifies role column |
| TC-003 | New enabled user can log in | Cross-page (create → logout → login) — only E2E can prove it |
| TC-004 | Search created user in list | Grid filter round-trip |
| TC-102 | Duplicate username (UI inline error) | OXD live-validation behavior is client-side; defense-in-depth with TC-107 |
| TC-103/104 | Password strength / confirm mismatch | Client-side OXD validation — observable only in UI |
| TC-105 | Disabled user cannot log in | Cross-session journey |
| TC-106 | Role governs menu | Folds into TC-003/TC-105 logins |
| TC-201 | ESS blocked from viewSystemUsers | Security-critical UI assertion |
| TC-301/302/303/304 | Required/min-length/short-password/unbound autocomplete | OXD client validation — combined into ONE E2E test (one form visit, staged assertions) |
| TC-401–405 | Username boundaries (5/40/41, case, spaces) | 5/40 fold into happy-path usernames; 41/case/spaces in validation test |
| TC-501–505 | Cancel, form contract, autocomplete hints, loader, toast | UI-state assertions folded into the form tests above |

### API (contract & backend rules — fast, no browser)
| ID | Scenario | Endpoint | Rationale |
|----|----------|----------|-----------|
| TC-005 | Create user via API | `POST /admin/users` | Contract happy path |
| TC-107 | Duplicate username → 4xx | `POST /admin/users` | Server-side uniqueness must hold even if client validation bypassed |
| TC-202 | ESS session → 403 | `POST /admin/users` | AuthZ enforcement at API layer |
| TC-203 | Unauthenticated → 401/redirect | `POST /admin/users` | AuthN enforcement |
| TC-204 | No password in responses | `POST` + `GET /admin/users/{id}` | Payload hygiene — pure API concern |
| TC-305 | Bad empNumber → 4xx | `POST /admin/users` | FK validation is backend logic; testing at E2E would be an anti-pattern |
| TC-306 | Bad userRoleId → 4xx | `POST /admin/users` | Enum validation — same |
| TC-406 | Same employee, two accounts | `POST /admin/users` ×2 | Data-model rule, no UI value |

### Component (folded into E2E — no harness)
TC-502 (form contract), TC-503 (autocomplete hint), TC-504 (skeleton loader), TC-505 (toast dismiss), TC-302/303 inline errors — each is a single-component render/state check. **Decision**: assert them opportunistically inside the E2E form tests rather than as standalone tests.

### Unit (documented, not implementable here)
- Username length validator (5–40) — `orangehrmCorePlugin` Rule classes
- Password strength rules — `orangehrmAuthenticationPlugin`
- Trim/normalize username — backend

## Contested Assignments — Rationale
1. **TC-102 duplicate username at BOTH E2E and API (TC-107)** — deliberate defense-in-depth: the inline `Already exists` is client-side (debounced lookup); the API test proves the server constraint independently. A bug can exist in either.
2. **TC-301–304 NOT individual E2E tests** — input validation at E2E is an anti-pattern when repeated per-field. Compromise: one consolidated E2E validation test (single page load, staged assertions) because client-side OXD errors cannot be observed at API layer at all.
3. **TC-305/306 pushed DOWN to API** — invalid FK/enum never reach the server from the UI (autocomplete/dropdown prevent it), so E2E cannot even exercise them.
4. **TC-401/402 boundaries folded into E2E happy paths** (use a 5-char and a 40-char username for real created users) rather than separate tests — same coverage, zero extra runtime.
5. **TC-003/105/106 stay E2E** despite being "just login" — login outcome of a freshly created/disabled user is the core business value of this feature; no lower layer can verify session issuance.

## Anti-Patterns Found in Existing Tests
- `tests/admin/add-job-title.spec.ts` is well-layered (API seeding/cleanup, consolidated validation test TC-ADMIN-AJT-300) — **follow this pattern**.
- General repo pattern: no component/unit layer exists; everything UI-ish lands in E2E. Mitigated here by folding UI-state checks into existing journeys and pushing 8 scenarios to pure API tests.
- Existing suites use `Date.now()` suffixes for uniqueness and `afterAll` API cleanup — reuse to avoid cross-run pollution (System Users are hard-deleted, safe to clean).

## Execution Notes
- Run with `--config automation.config.ts --project=chromium`, serial mode within the spec.
- Reuse `AdminUsersApi` for seeding/cleanup; create the PIM employee prerequisite via `EmployeesApi`.
- ESS credentials for security tests: seeded `marcus.chen / admin@OHRM123` (master data).
