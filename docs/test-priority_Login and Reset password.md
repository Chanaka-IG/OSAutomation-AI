# Test Priority — Login and Reset Password

**Input**: `docs/test-strategy_Login and Reset password.md` (E2E scenarios prioritized below; the 4 API-layer contract checks — TC-104, TC-202, and the API duplicates of TC-200/201 — are release-relevant but out of the E2E generation scope this skill feeds).
**Method**: P0–P3 by business impact, failure risk, and user reach. `generate-tests` consumes **P0 + P1 only**.

---

## P0 — Release-blocking (core flow / security / no workaround)

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Valid admin login → `/dashboard/index` | The product is inaccessible if this fails — the single most critical path; no workaround |
| TC-003 | ESS login → ESS-scoped menu | Self-service users blocked entirely if broken; core auth for the largest user group |
| TC-004 | Logout returns to login | Session termination is a security baseline; broken logout leaves sessions live |
| TC-101 | Wrong user vs wrong password → identical "Invalid credentials" | Anti-enumeration is a security/compliance control; a leak here is a real vulnerability |
| TC-102 | Disabled account rejected ("Account disabled") | Access-control integrity — a disabled user logging in is a security breach |
| TC-200 | Unauthenticated deep link → login | Core authZ gate; protected data must never render without a session |
| TC-201 | Post-logout dashboard access → login | Session invalidation; failure means data exposure after logout |
| TC-300 | Wrong password → "Invalid credentials" | Primary negative path; auth must reject bad credentials deterministically |
| TC-301 | Non-existent username → "Invalid credentials" | Primary negative path + enumeration safety |
| TC-402 | SQL-like username safely rejected (no bypass) | Authentication-bypass / injection is the highest-severity failure mode |

## P1 — High impact (primary feature path / high reach)

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-002 | Admin sees full side menu | Role recognition drives the whole app surface; high reach, folds into TC-001 |
| TC-005 | "Forgot your password?" opens reset page | Primary path of the Reset Password feature under test |
| TC-100 | Reset page shows email-not-configured guidance | The actual, observable reset behavior on this instance — users must get correct guidance |
| TC-204 | Credentials submitted via POST, not URL | Prevents credential leakage into logs/history; high-impact security hygiene |
| TC-203 | Error banner does not echo the password | Sensitive-data-leak prevention on every failed attempt |
| TC-302 | Empty fields → "Required" (consolidated validation) | First-touch validation hit by nearly every user at least once; high reach |
| TC-502 | Error banner clears on a subsequent successful login | Common recover-from-typo path; affects perceived reliability |

## P2 — Moderate impact (secondary flows / common-path edge cases / workaround exists)

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-006 | "Click here" → back to login | Convenience navigation; back button is an easy workaround |
| TC-103 | Password case-sensitivity rejected | Important correctness, but a subset of the wrong-password path |
| TC-303 | Username only → password "Required" | Field-level validation variant; folds with TC-302 |
| TC-304 | Password only → username "Required" | Field-level validation variant; folds with TC-302 |
| TC-305 | Whitespace-only credentials rejected | Negative edge on a common path |
| TC-403 | Enter key submits the form | Usability path; clicking Login is the workaround |
| TC-500 | Login page renders all controls | UI-state sanity; folds into TC-001 |
| TC-501 | Password field is masked | Confidentiality nicety; folds into TC-500 |
| TC-503 | Reset page heading + back-link, no login form | UI-state composition of the reset page |

## P3 — Low impact (rare edge cases / nice-to-have)

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-400 | Padded username not silently trimmed | Rare input; deterministic-behavior documentation more than a risk |
| TC-401 | Very long username handled gracefully | Resilience edge case; unlikely in normal use |

---

## Contested Assignments — Rationale
1. **TC-402 (injection) is P0, not P2** — although it reads like an edge case, an authentication bypass is the single most damaging outcome for a login feature, so it is release-blocking.
2. **TC-102 (disabled account) stays P0** despite needing special seeding — access control for disabled users is a security control, not a nicety. If a disabled user cannot be seeded at generation time, the test is `test.skip`-gated but the priority remains P0.
3. **TC-100/TC-005 are P1, not P0** — the reset feature on this instance is informational (email not configured); login is the release-blocker, the reset page is the primary path of the secondary feature.
4. **TC-302 P1 but TC-303/304 P2** — empty-form submit is the universally-hit validation case (P1); the single-field variants are lower-reach refinements that fold into the same consolidated test (P2).
5. **TC-002 P1 (not P0)** — if login succeeds (TC-001 P0) but a menu item is missing, the user still has a working session; high impact but not a hard release blocker.
