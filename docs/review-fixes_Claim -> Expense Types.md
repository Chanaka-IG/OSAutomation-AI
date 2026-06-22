# Review Fixes — Claim → Expense Types

**Input:** `docs/review-tests_Claim -> Expense Types.md`
**Policy:** No [CRITICAL]/[IMPORTANT] issues — the suite was built with all lessons from the Claim → Events review pre-applied. Per the review-fixes process, the single [SUGGESTION] was addressed.

## Fixed Issues
1. **[SUGGESTION] TC-501 made self-contained** — `tests/claim/expense-types.spec.ts`.
   Removed the in-body `orangehrmAdminApi.loginAsAdmin()` + `getAll()` call. The test now asserts the "(N) Record(s) Found" counter equals the number of rendered rows (`tableRows.toHaveCount(count)`), a user-visible consistency check with no API dependency in the test body. (Best-practices §"Test user-visible behavior", §5 "Pass data to Page class".)

## Not Changed (with rationale)
- **TC-500 route mock** — correct tool; the list has no search filter to yield a real empty state without wiping shared data.
- **TC-106 (active-only in claim expense dropdown)** — intentionally deferred (P3); the dropdown requires a created claim request that leaves un-cleanable data, and the status rule is already covered at the config layer. Logged, not silently dropped.

## Verification
- Edited test re-run: `-g "TC-501"` → **1 passed**.
- Full suite (pre-edit baseline): **16 passed** on the first run. The edit touches only TC-501, re-validated green.

## Score Improvement
**Previous 9.5/10 → New 9.5/10** — the suite was already clean; the change is a stylistic tidy that keeps the score, with the remaining 0.5 reflecting the unavoidable empty-state route mock and the deferred cross-module integration.

## Summary of Changes
- `tests/claim/expense-types.spec.ts`: TC-501 rewritten to compare the record counter to rendered rows; no API login in the test body.
