# Test Priority — Add Users (E2E scenarios)

**Input**: `docs/test-strategy_Add users.md` — E2E layer assignments only.
Folding plan from the strategy is preserved: folded scenarios inherit the priority of their host test.

---

## P0 — Release-blocking

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-001 (+TC-401/402 usernames, TC-504 loader, TC-505 toast) | Add ESS user happy path — form → toast → row in grid → count+1 | Core business flow of the feature; if Admin cannot create users, onboarding is dead. No workaround. Boundary usernames (5/40 chars) folded in at zero cost. |
| TC-003 (+TC-106 ESS menu) | Newly created enabled user can log in and sees ESS-scoped menu | The entire point of creating a user is that they can log in; proves session issuance + role wiring (data integrity). |
| TC-102 | Duplicate username blocked in UI | Data-integrity guard on a unique key; silent duplicate would corrupt auth. |
| TC-105 | User created as Disabled cannot log in | Security/compliance — a disabled account that can authenticate is an access-control failure. |
| TC-201 | ESS cannot open `/admin/viewSystemUsers` (no Admin menu, no grid) | Security/compliance — privilege escalation check; release-blocking by definition. |

## P1 — High impact

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-002 (+TC-106 Admin menu) | Add Admin-role user; row shows role Admin; new Admin sees full menu | Primary feature path variant with high blast radius (grants full privileges) — but TC-001 already proves the create mechanics, so P1 not P0. |
| TC-301+302+303+304 (+TC-403 41-char, TC-404 case, TC-405 spaces, TC-502 form contract) | Consolidated validation test: empty-save Required errors, username <5 / >40 / case-duplicate / padded, password <7, unbound autocomplete | High user reach — every admin hits validation; consolidated into one test per strategy. Individual rules have workarounds (fix input), so P1 not P0. |
| TC-103+104 | Password strength + confirm-mismatch inline errors | Primary path guard for credential quality; client-side only, observable only at E2E. |
| TC-004 | Created user findable via Username search filter | Major supporting flow — admins manage users through this filter daily; workaround (paging) exists. |

## P2 — Moderate

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-501 | Cancel returns to list without creating a record | Secondary flow; failure is annoying but harmless and has an obvious workaround (navigate away). |
| TC-503 | Employee autocomplete shows hints and binds selection | Common-path UX detail; the binding failure mode is already covered by TC-304 in P1. |

## P3 — Low / cosmetic

| ID | Description | Rationale |
|----|-------------|-----------|
| TC-406 | Same employee can hold two user accounts (UI observation) | Rare edge case; the data-model rule is covered at API layer per strategy — UI duplication adds little. |
| TC-504 standalone | Skeleton loader timing on list page | Cosmetic; already implicitly exercised by every list assertion (P0 host). |
| TC-505 standalone | Toast auto-dismiss timing | Cosmetic; toast presence asserted in P0; dismissal timing is nice-to-have. |

---

## Contested calls
- **TC-102 at P0 vs P1**: duplicate usernames break login determinism (which account authenticates?) — data integrity, no workaround once persisted → P0.
- **TC-002 at P1 not P0**: creating an Admin uses the identical form path proven by TC-001; the only delta is the role dropdown value, so a failure unique to it is unlikely to block release.
- **TC-004 at P1 not P2**: user search is the primary management entry point on a 50-row paginated grid; without it, locating accounts at scale has only a painful workaround.
- **TC-503 at P2 not P3**: autocomplete is on the critical create path, but its failure already surfaces in P0/P1 tests — standalone value is moderate.

## Generation guidance
Generate test code for **P0 + P1 only** (7 tests: 5 P0-hosted + 4 P1, with folds). P2/P3 assertions may piggyback on hosts where free.
