# Test Review — Claim → Events

**Files reviewed:**
- `tests/claim/events.spec.ts`
- `src/pages/claim/ClaimEventsPage.ts`
- `src/api/orangehrmOSAPI/ClaimEventsApi.ts`
- `test-data/claim/frontend/events.ts`, `test-data/claim/api/events.ts`
- Wiring: `src/fixtures/index.ts`, `test-data/index.ts`

**Standard:** `playwright-best-practices` skill.

---

## What's Good
- **POM discipline** — all locators live in `ClaimEventsPage`; the spec contains only actions + assertions. No raw selectors in the test body (best-practices §2 "Locator definition rules", §5 POM).
- **Locator priority** — `getByRole` for headings/buttons, scoped `.oxd-input-group` filters for fields; CSS only where OXD offers nothing better (switch span, table icons). Matches §2 priority order.
- **Data via API in hooks** — read-only fixtures seeded in `beforeAll` with `createIfAbsent`; UI add/edit/delete is the action under test. Cleanup in `afterAll` via `deleteByNames`. Matches §5 "Add data via APIs".
- **Auth pattern** — `loginAs('admin')` for admin, `loginWithCredentials` for the ESS user, per §5 "Handle the loginAs method".
- **Toast assertions** reuse `BasePage` helpers (`verifySuccessToastForSave/Update/forDeletion`) instead of re-reading toast text (§"Common Test Validation").
- **No `waitForTimeout`**; relies on web-first `expect`/loaders (§9, §11).
- **Folder structure** unchanged — new files sit in the existing `src/pages/<module>`, `src/api/orangehrmOSAPI`, `test-data/<module>/{api,frontend}`, `tests/<module>` layout.
- **Uniqueness** — per-run `Date.now()` suffix avoids cross-run pollution (§8).

## Issues Found

### [IMPORTANT] TC-500 is the only route-mocked test — keep it the exception
`tests/claim/events.spec.ts` (TC-500) mocks `**/api/v2/claim/events**` to force the empty state. Best-practices §6 explicitly sanctions mocking for empty-list UI state, and the Events list has **no search filter** to produce a real empty state without wiping shared data — so this is the correct tool here. **No change required**, but it should remain the only mock in the suite (it currently is).

### [SUGGESTION] `submitClaimEventDropdown` filter is broad
`ClaimEventsPage.ts`: `.oxd-input-group.filter({ hasText: 'Event' }).locator('.oxd-select-text')`. Verified live the Submit Claim form has only Event/Currency/Remarks, so "Event" is unambiguous today. If the form gains another "…Event…" label this could match two groups. Consider anchoring on an exact label node if the form grows.

### [SUGGESTION] TC-203 (XSS) asserts rendering but not non-execution
The test confirms the `<script>…</script>` name renders as a visible row (i.e. it is escaped to text). It does not actively assert the script did **not** run. A stronger version could register a `page.on('dialog')` guard and assert it never fires. Low priority — OXD escapes by default and a visible literal already implies no execution.

### [SUGGESTION] TC-103 relies on the dropdown listing the seeded active event
`getSubmitClaimEventOptions()` returns all options and asserts `toContain(ACTIVE_SEED)` / `not.toContain(INACTIVE_SEED)`. Robust on this dataset; if the env ever accumulates a very large number of active events and the dropdown virtualises/caps options, the positive assertion could flake. Acceptable for now.

### [NOTE] Pre-existing build blocker fixed outside scope
`src/pages/performance/MyTrackersPage.ts` had a method missing `async` (used `await` in a non-async method), which broke transpilation of the whole fixtures barrel and therefore this suite. The `async` keyword was added so the suite could compile. A separate latent bug remains in that file (`validateInLineErrorsForLength` calls `this.locator.textContent()`, where `this.locator` is a BasePage method, not a Locator) — out of scope for Claim → Events but worth a follow-up.

### [NOTE] One orphaned record in the shared env
During debugging, a retry re-seeded `Claim Delete Seed <oldRun>` (id 16) that the original run's cleanup (keyed by the new run id) does not match. A manual API delete was blocked by policy. It is an inert, uniquely-named event; recommend deleting it once via the API/UI. The retry-cleanup gap itself is now fixed (DELETE_EVENT added to `createdEvents`).

## Score: 9/10
Solid, convention-aligned suite with correct layer split and clean POM/API separation. Points held back only for the minor robustness suggestions above; none are blocking.

## Recommended Fixes (priority order)
1. (Optional) Add a `page.on('dialog')` no-fire guard to TC-203 for a stronger XSS assertion.
2. (Optional) Anchor the Submit Claim Event dropdown locator on an exact label.
3. (Housekeeping) Delete the orphaned `Claim Delete Seed <oldRun>` event from the shared env.
4. (Follow-up, separate feature) Fix `MyTrackersPage.validateInLineErrorsForLength`’s `this.locator` misuse.
