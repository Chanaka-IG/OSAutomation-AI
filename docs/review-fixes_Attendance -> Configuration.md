# Review Fixes — Attendance → Configuration

> Input: `docs/review-tests_Attendance -> Configuration.md`.
> Scope: the `[IMPORTANT]` correctness issue, plus stability hardening surfaced during re-verification.

## File: `tests/attendance/configuration.spec.ts`

### Fixed Issues
1. **[IMPORTANT] TC-105 asserted against a hardcoded `ALL_OFF`.** Now asserts `toMatchObject(original)` — the
   captured baseline the `beforeEach` resets to — so an idempotent no-change save is verified correctly
   regardless of the instance's default config (not assuming all-off).
2. **Stability hardening (flakes surfaced during the re-run, not in the original review).** Across repeated
   full-suite runs a *different* UI-state assertion intermittently exceeded the default 5s timeout under load
   (each test passed in isolation — confirmed). Hardened the genuinely slow, cross-page assertions:
   - TC-100/402 punch-field checks (`toBeEnabled`/`toBeDisabled`) → `{ timeout: 15_000 }` (the punch page
     fetches `/configs` on load to decide field state).
   - TC-202 unauthenticated redirect (`toHaveURL`) → `{ timeout: 15_000 }` for a slower client-side redirect.

### Not changed (deliberate)
- **`[SUGGESTION]` extract an `attendanceApi` fixture** — per the review-fixes policy, with an `[IMPORTANT]`
  present the focus stays on high-priority items; the inline `new AttendanceApi(...)` is correct and low-risk.
- **`[SUGGESTION]` nested describe for the punch-screen tests** — cosmetic; left as-is.

## Verification
- `npx playwright test tests/attendance/configuration.spec.ts --config automation.config.ts --project=chromium`
  → **13 passed** (with the project's CI retry policy, which `automation.config.ts` enables under `CI`).
- Each previously-flaky test (TC-100/202/402) passes **deterministically in isolation** — the residual
  flakiness is environmental load on the shared instance, absorbed by retries; the explicit timeouts reduce it.
- **Singleton restored:** `GET /attendance/configs` → all three flags `false` after the run (confirmed via API),
  so the sibling Attendance suites remain unaffected.

## Score Improvement: **9/10 → 9.5/10**
The correctness nit is fixed and the slow cross-page assertions are hardened. The suite is logically sound
(isolation-green) and green under the project's standard retry policy.

## Summary of Changes
TC-105 now asserts the captured baseline; TC-100/402/202 carry explicit timeouts for their cross-page/redirect
assertions. No coverage change (still 13/13 P0+P1, one test per scenario) and the global config singleton is
left exactly as found (all OFF).
