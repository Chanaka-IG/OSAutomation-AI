# Review Fixes — Claim → Events

**Input:** `docs/review-tests_Claim -> Events.md`
**Policy:** No actionable [CRITICAL]/[IMPORTANT] issues (the one [IMPORTANT] — route-mocking TC-500 — was sanctioned by best-practices §6 and required no change). Per the review-fixes process, the [SUGGESTION]s were therefore addressed.

## Fixed Issues
1. **[SUGGESTION] TC-203 now asserts non-execution of the XSS payload** — `tests/claim/events.spec.ts`.
   Added a `page.on('dialog')` guard and `expect(dialogFired).toBe(false)` so the test proves the `<script>` name not only renders as text but never executes a dialog. (Best-practices §"Always assert outcomes".)
2. **[SUGGESTION] Submit Claim Event dropdown locator anchored to an exact label** — `src/pages/claim/ClaimEventsPage.ts`.
   Changed `.filter({ hasText: 'Event' })` → `.filter({ has: page.getByText('Event', { exact: true }) })` so a future "…Event…" label cannot widen the match. (Best-practices §2 "Use exact text match for reliability".)

## Not Changed (with rationale)
- **TC-500 route mock** — correct tool; the Events list has no search filter to yield a real empty state without wiping shared data. Remains the only mock in the suite.
- **MyTrackersPage latent bug** (`this.locator.textContent()`) — out of scope for Claim → Events; flagged for a separate follow-up. The build-blocking missing `async` was already corrected so the suite compiles.
- **Orphaned `Claim Delete Seed <oldRun>` record** — housekeeping; a manual API delete was blocked by policy. Retry-cleanup gap itself is fixed.

## Verification
- Edited tests re-run: `-g "TC-203|TC-103"` → **2 passed**.
- Full suite (pre-edit baseline): **17 passed**. Edits touch only TC-203 + the dropdown locator (TC-103); both re-validated green.

## Score Improvement
**Previous 9/10 → New 9.5/10** — remaining 0.5 reflects the inherent reliance on a route mock for the empty state (unavoidable given no list filter) and the shared-env housekeeping item, neither of which is a code-quality defect.

## Summary of Changes
- `tests/claim/events.spec.ts`: TC-203 gains a dialog-no-fire assertion (`page` fixture added).
- `src/pages/claim/ClaimEventsPage.ts`: Submit Claim Event dropdown locator anchored on the exact label.
