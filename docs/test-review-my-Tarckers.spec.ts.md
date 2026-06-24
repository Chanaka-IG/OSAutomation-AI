# Test Code Review — `my-Tarckers.spec.ts`

**Reviewer:** Lead QA Automation (Test Code Reviewer)
**Date:** 2026-06-22
**Files reviewed:**
- `tests/performance/my-Tarckers.spec.ts` (spec under review)
- `src/pages/performance/MyTrackersPage.ts` (page object — modified)
- `src/api/orangehrmOSAPI/MyTrackersApi.ts` (API service)
- `src/fixtures/apiAction.ts` (fixtures)
- `test-data/performance/frontend/myTrackers.ts`
- `test-data/performance/api/myTrackers.ts`

---

## What's Good

- **Toast assertions use the shared BasePage helpers** (`verifySuccessToastForSave/Update/forDeletion`) instead of scraping toast text — exactly as required by best-practices §"Common Test Validation". 👍
- **POM discipline is clean.** All locators live in `MyTrackersPage`/`BasePage`, never inline in the spec; the page object holds **no `expect()`** — assertions stay in the test file (best-practices §4, framework "No assertions in page objects").
- **API mocking for the empty state (TC-405, lines 178-192)** is textbook §6: route-fulfils `logsApiPattern` with a `{data:[], meta:{total:0...}}` payload and falls through to `route.continue()` for non-GET. Matches the `**/trackers/*/logs**` pattern recorded in domain memory.
- **Idempotent seeding** via `createIfAbsent` / `addLogIfAbsent` / `addLogsIfAbsentAsESS` in `beforeAll` (lines 74-86) — follows §5 "check whether data already exists" and the framework's idempotent-setup rule.
- **Structured logging** (`createLogger('MyTrackerAPI')`) in the API service, no `console.log` (§13).
- **Server-date helper exists** (`MyTrackersApi.getServerDate`) with a well-reasoned comment about display-timezone vs UTC — good intent (though the spec doesn't actually use it; see IMPORTANT #4).
- **`getTrackerIdByNameForESSLogs` + sequential bulk add** keep creation order deterministic — good thinking for an ordering test.

---

## Issues Found

### [CRITICAL] 1 — File name violates the kebab-case convention (and has a typo)
**File:** `tests/performance/my-Tarckers.spec.ts`
Every other spec in the repo is lowercase kebab-case (`my-timesheets.spec.ts`, `employee-list.spec.ts`, `reporting-methods.spec.ts`). This file is `my-**T**arckers.spec.ts`:
- `Tarckers` is a misspelling of `Trackers`.
- The capital `T` breaks kebab-case.

**Fix:** rename to `tests/performance/my-trackers.spec.ts` (this matches the domain-memory name `my-trackers`). The page object is correctly named `MyTrackersPage.ts`, so only the spec + the generated review doc carry the typo.
**Violates:** best-practices §1 "Use descriptive kebab-case names"; skill rule "folder structure / naming must be consistent throughout the project."

> Note: the old `tests/performance/myTarckers.spec.ts` was deleted in favour of this one — renaming to kebab-case is the right direction, but the typo and the capital `T` were carried over instead of fixed.

---

### [CRITICAL] 2 — Orphaned TC-404 seeding: `orderTracker` + 12 bulk logs are created every run but never asserted
**Lines:** 8-11, 64-68, 76, 86-89 (spec); `bulkLogs`/`orderTracker` in `test-data/performance/api/myTrackers.ts` lines 78-101.

The `beforeAll` creates an `orderTracker`, seeds **12 `bulkLogs` over the network**, then snapshots them:
```ts
await myTracker.createIfAbsent(orderTracker);                              // line 76
await myTracker.addLogsIfAbsentAsESS(api.trackers.orderTracker.name, api.trackers.bulkLogs); // line 86
const orderTrackerId = await myTracker.getTrackerIdByNameForESSLogs(...);  // line 88
orderTrackerApiLogs = await myTracker.getLogs(orderTrackerId);            // line 89
```
The module-level comment (lines 8-11) says this snapshot exists so **"TC-404 asserts the rendered UI order against this snapshot"** — but **there is no TC-404 test in the file.** `orderTrackerApiLogs` is assigned and never read. This burns a tracker-create + 12 log-inserts on every first run for zero coverage, and leaves a misleading comment referencing a test that doesn't exist.

**Fix (pick one):**
- Implement the missing **TC-404** (open the order tracker in the UI, read the rendered log titles, assert they equal `orderTrackerApiLogs.map(l => l.log)` — i.e. newest-first reverse of `bulkLogs`); **or**
- Delete the dead path: the `orderTracker` block (64-68), lines 76 & 86-89, the `orderTrackerApiLogs` variable (11) + comment (8-10), and `orderTracker`/`bulkLogs` from the API test-data.

**Violates:** §11 "No assertions after every action / test passes but proves nothing"; §5 "add data through APIs only when the test needs it"; dead-code / misleading-comment hygiene (§12).

---

### [IMPORTANT] 3 — No `afterAll` cleanup; UI-created logs accumulate on the shared trackers
**Lines:** whole file (no `afterAll`); TC-004 (113-116), TC-403 (152-154), TC-509 (230-237).

The suite has **no cleanup hook**. Tests that *write through the UI* are not idempotent:
- TC-004 adds `frontend.myTrackers.positiveLog` to `Jacob - Tracker` every run.
- TC-403 adds the XSS log; TC-509 adds a positive + negative log to the feedback tracker.

None are de-duplicated or removed afterwards, so duplicate logs pile up across runs. The tests still *pass* only because `getLogDetails` uses `.first()` and TC-509 asserts a **delta** — but this is data pollution that the framework explicitly warns against.

**Fix:** add an `afterAll` that deletes the logs created by the UI tests (via `MyTrackersApi` — add a `deleteLog`/`deleteLogsByTitle` helper), or have those tests target a dedicated throwaway tracker that is reset in cleanup.
**Violates:** §5 "clean up the data after the test execution"; framework "Cleanup Pattern" + "Each test self-contained".

---

### [IMPORTANT] 4 — `today` uses the runner's UTC clock, not the server clock — comment is inaccurate
**Lines:** 95-97.
```ts
// Anchored to the server clock at runtime ...
const today = new Date().toISOString().split('T')[0];
```
`new Date().toISOString()` is the **test runner's UTC date**, evaluated when the `describe` body is collected — not the server clock and not "at runtime". The four date assertions (`expect(logData.date).toContain(today)` on lines 123, 138, 161) will flake when the runner TZ differs from the app's display TZ or when collection and execution straddle midnight.

The codebase already has the correct tool: **`MyTrackersApi.getServerDate()`** (returns `userDate ?? utcDate`), which is currently unused.

**Fix:** snapshot the date in `beforeAll` from the authenticated API and use it in assertions:
```ts
let today: string;
// in beforeAll:
today = await myTracker.getServerDate();
```
**Violates:** §8 "Dynamic Data Handling"; §9 stability; and the comment misrepresents behaviour (§12).

---

### [IMPORTANT] 5 — Tautological assertions in TC-001 and the Admin test
**Lines:** 104-106 (TC-001) and 254-256 (Admin).
```ts
await page.goto(frontend.myTrackers.routes.myTrackerList)   // beforeEach
...
await expect(page).toHaveURL(new RegExp(frontend.myTrackers.routes.myTrackerList))
```
Asserting the URL equals the URL you just navigated to mostly proves the `goto` didn't redirect — it does **not** prove the My Trackers list rendered for that role. The Admin test is titled "Check the visibility of My Tracker as Admin user" but verifies no actual visibility.

**Fix:** assert visible content — e.g. `await expect(myTrackersPage.listTitle).toBeVisible()` or that the tracker table/row for a seeded tracker is visible. For the admin case, assert what should actually differ for admin vs ESS.
**Violates:** §11 "No assertions that prove nothing".

---

### [IMPORTANT] 6 — TC IDs don't follow the naming convention and multiple TCs are merged into one title
**Lines:** 104, 107, 111, 126, 141, 173, 178, 194, 202, 226, 254.

Titles use bold-markdown IDs like `**TC-004** | ... | **TC-504** | ... | **TC-010** ...` (line 111 bundles three TCs into one test). The framework convention is `TC-{MODULE}-{FEATURE}-{NNN}` (e.g. `TC-PERF-TRACKER-004`). Bundling means a single failure can't be attributed to a specific TC, and the Admin test (254) has no TC ID at all.

**Fix:** adopt `TC-PERF-TRACKER-NNN`; split bundled assertions into separate tests, or document the coverage in a comment while keeping one TC ID as the title.
**Violates:** framework "Test Naming Convention".

---

### [SUGGESTION] 7 — Hardcoded, randomised test data built inside the test body (TC-506)
**Lines:** 204-216. The 151- and 3001-char boundary strings are generated inline with `Math.random()`. Best-practices §5 says not to build data in the test body, and random input is non-deterministic (length is the only thing that matters, so randomness adds nothing).
**Fix:** move the boundary fixtures to `test-data/performance/frontend/myTrackers.ts` (e.g. `'a'.repeat(151)` / `'a'.repeat(3001)`), import them, and drop `Math.random()`.

### [SUGGESTION] 8 — `fullName` duplicated across four tests
**Lines:** 112, 127, 150. The same `${firstName} ${lastName}` expression is repeated. Extract a single `const fullName = ...` at describe scope (or a test-data field) to keep it DRY.

### [SUGGESTION] 9 — Unused imports / duplicate import line
- `src/pages/performance/MyTrackersPage.ts:1` imports `expect` from `@playwright/test` but never uses it — remove.
- `src/api/orangehrmOSAPI/MyTrackersApi.ts:5` imports `Page` but never uses it — remove.
- Spec lines 3-4 import twice from `'../../test-data'` (`frontend` then `api`); merge into one `import { api, frontend } from '../../test-data'`.

### [SUGGESTION] 10 — Brittle locators in the page object
- `MyTrackersPage.ts:30` — `getByRole('button', { name: ' Yes, Delete ' })` with surrounding spaces is fragile; prefer a trimmed name or `{ name: 'Yes, Delete' }` without leading/trailing spaces.
- `MyTrackersPage.ts:25-26` — `logInput`/`commentInput` use `.oxd-input-group` filtered by `hasText: 'Log'` / `'Comment'` + `.nth(0)`. This is CSS + index (§2 "last resort"). Acceptable for the OXD modal, but verify with Playwright MCP that the `hasText: 'Log'` filter doesn't also match the "Tracker Logs"/"Add Log" chrome in the same container. (§2 "verify locators exist in the real app").

### [SUGGESTION] 11 — Verify the length-error wording against the live app
**`test-data/performance/api/myTrackers.ts:89-92`** uses `"Should not exceed 150 characters"` / `"Should not exceed 3000 characters"`. The domain skill's global rule (business-rules §9) records length errors as `"Should be less than N characters"`. If these strings were captured live for the tracker form, fine — but confirm, since an exact-equality assertion (TC-506, lines 222-223) will break on any wording drift.

### [SUGGESTION] 12 — Add `mode: 'serial'` to `describe.configure`
**Line 6:** `test.describe.configure({ timeout: 90_000 })` sets a timeout but not `mode: 'serial'`. The framework template uses serial mode; the suite relies on `beforeAll`-seeded shared state. It runs serially today only because `workers: 1` is set globally — make the intent explicit.

---

## Score: **7/10**

Solid, well-structured suite that respects the POM/fixture/mocking conventions and reuses the shared toast helpers. Held back by a critical naming violation, a whole dead seeding path for a TC that was never written, missing cleanup, and a date anchor that doesn't do what its comment claims.

---

## Recommended Fixes (priority order)

1. **[CRITICAL]** Rename the file to `tests/performance/my-trackers.spec.ts` (fix typo + kebab-case).
2. **[CRITICAL]** Resolve the orphaned TC-404: either implement the order-assertion test that consumes `orderTrackerApiLogs`, or delete the `orderTracker`/`bulkLogs`/snapshot code and its misleading comment.
3. **[IMPORTANT]** Add `afterAll` cleanup for UI-created logs (TC-004 / TC-403 / TC-509) so the suite is re-runnable without pollution.
4. **[IMPORTANT]** Replace `new Date()` `today` with `await myTracker.getServerDate()` snapshotted in `beforeAll`; fix the inaccurate comment.
5. **[IMPORTANT]** Strengthen TC-001 and the Admin test to assert rendered content, not just the URL.
6. **[IMPORTANT]** Adopt `TC-PERF-TRACKER-NNN` naming; un-bundle multi-TC titles; give the Admin test a TC ID.
7. **[SUGGESTION]** Move TC-506 boundary strings to test-data (drop `Math.random()`); extract `fullName`; remove unused imports; tidy the `' Yes, Delete '` and `hasText:'Log'` locators; verify length-error wording; add `mode: 'serial'`.
