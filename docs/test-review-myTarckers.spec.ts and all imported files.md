# Test Code Review — `tests/performance/myTarckers.spec.ts` and all imported files

**Reviewer:** Lead QA Automation (Code Review)
**Date:** 2026-06-16
**Standards:** `playwright-best-practices`, `orangehrm-opensource-domain` (business-rules / ui-selectors / user-flows)
**Consumed by:** `/review-fixes-myTarckers.spec.ts and all imported files`

**Scope reviewed (spec + every imported file):**
- `tests/performance/myTarckers.spec.ts` (entry)
- `src/pages/performance/MyTrackersPage.ts` (POM)
- `src/pages/BasePage.ts` (inherited base — toast/loader helpers, login)
- `src/api/orangehrmOSAPI/MyTrackersApi.ts` (seeding API)
- `test-data/performance/frontend/myTrackers.ts`
- `test-data/performance/api/myTrackers.ts`
- `src/fixtures/apiAction.ts` → `src/fixtures/index.ts` (fixture chain)
- `src/config/env.ts`, `test-data/index.ts` (barrel)

---

## What's Good

- **POM + createIfAbsent data strategy** — trackers are seeded through `MyTrackersApi.createIfAbsent` in `beforeAll`, guarded by a name lookup against the list endpoint (best-practices §5 "Add data via APIs" / "check whether the data already exists"). ✓
- **Assertions mostly in the spec** — TC-004/007/008/403 keep all `expect()` calls in the test body; the POM exposes actions (`viewTracker`, `fillLog`, `clickAddLog`) and a data-returning `getLogDetails` (best-practices §4). ✓ (one exception — see POM-assert below).
- **Toast validation via BasePage helpers** — `verifySuccessToastForSave/Update/forDeletion` are reused instead of re-reading toast text (best-practices §9 "Common Test Validation"). ✓
- **No banned anti-patterns in the spec** — no `waitForTimeout`, no `test.only`, no hardcoded record IDs, no `console.log` (best-practices §11, §13). ✓
- **Data-driven login** — `loginWithCredentials(...employees[1].username, ...password)` pulls from `test-data`, the sanctioned exception for the login step (best-practices §5 "Handle the loginAs method"). ✓
- **Folder structure preserved** — page in `src/pages/performance/`, API in `src/api/orangehrmOSAPI/`, data split `test-data/performance/{frontend,api}/`, spec in `tests/performance/`, and both the barrel (`test-data/index.ts`) and the `myTrackersPage` fixture are registered. Matches the project layout exactly. ✓
- **Genuine XSS-on-display check (TC-403)** — injects `<script>` into log + comment and asserts the rendered `textContent` still *contains* the literal markup, i.e. it was escaped, not executed. Good intent and a correct way to verify escaping.

---

## Issues Found

### [CRITICAL] Date assertion is timezone- and format-fragile
- **Spec line 67:** `const today = new Date().toISOString().split('T')[0]`
- **Used by:** TC-004 (L93), TC-007 (L108), TC-403 (L132) → `expect(logData.date).toContain(today)`.
- **Three defects in one:**
  1. `toISOString()` is **UTC**. The app renders the log date in the server/browser timezone. Around the UTC-midnight boundary `today` and the displayed date differ by a day → intermittent failure with no code change.
  2. `new Date()` runs at **describe-collection time**, not when the test executes. A long suite that crosses midnight compares against a stale date.
  3. The assertion assumes the date container renders an **ISO `YYYY-MM-DD`** substring. If the OXD log card shows e.g. `Jun 16, 2026`, `toContain` silently breaks. The format is undocumented in `ui-selectors.md` (the domain skill has **no** tracker-log selectors at all), so it could not be verified.
- **Rule violated:** best-practices §11 "Shared/implicit state → order-dependent failures" and §9 wait/stability intent; review rule "verify selectors/format in source, don't assume".
- **Fix:** compute the expected date in the app's timezone, inside the test (not at collection), and confirm the rendered format live before trusting `toContain`. Better still, assert against the date the API returned when seeding the log rather than a re-derived "today":
  ```ts
  // inside each test:
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ }).format(new Date()); // YYYY-MM-DD
  ```
  Pull `APP_TZ` / the expected format from `test-data`.

### [CRITICAL] Assertion lives inside the Page Object (`validateTitle`)
- **`MyTrackersPage.ts` L35–37:**
  ```ts
  async validateTitle(title: string): Promise<void> {
      expect(await this.listTitle.textContent()).toEqual(title)
  }
  ```
  Called by TC-002 (spec L79).
- **Rule violated:** best-practices §4 "Keep assertions (expect) in the test file … keep Page Objects focused on actions and data retrieval." Also §9 — `textContent()` + `toEqual` is a **one-shot read with no auto-wait** (web-first `toHaveText` retries; this does not), so it can race the heading render.
- **Fix:** expose the locator and assert in the spec with a web-first matcher:
  ```ts
  // spec TC-002:
  await expect(myTrackersPage.listTitle).toHaveText(frontend.myTrackers.myTrackerUI.title);
  ```

### [IMPORTANT] Log seeding is not idempotent → data accumulates on every run
- **Spec L60–61 (beforeAll):** `addLogAsESS(...positiveLog)` and `addLogAsESS(...logForDelete)` call `MyTrackersApi.addLog`, which **always POSTs** — there is no `createIfAbsent` guard (`MyTrackersApi.ts` L61–75).
- **Compounded by** TC-004 (adds "This is a positive logs") and TC-403 (adds the XSS log) every run, with **no `afterEach`/`afterAll` cleanup**.
- **Effect:** each run leaves orphan logs behind. TC-007 rewrites "Positive via API" → "This is the updated logs", and the next run seeds a *fresh* "Positive via API" on top — logs grow unbounded. The tests pass today only because `getLogDetails`/`clickEditLog` use `.first()` + `toContain`, which masks the pollution.
- **Rule violated:** best-practices §5 "check whether the data already exists … clean up the data after execution"; §11 "Shared state between tests".
- **Fix:** give logs the same `createIfAbsent` treatment (look up existing logs for the tracker before posting), and/or add an `afterEach`/`afterAll` that deletes the logs created by TC-004 and TC-403 so they are self-contained.

### [IMPORTANT] Hardcoded API path inside `MyTrackersApi.addLog`
- **`MyTrackersApi.ts` L62:** `` this.post(`/web/index.php/api/v2/performance/trackers/${id}/logs`, ...) ``
- Every other path in this service comes from `test-data/performance/api/myTrackers.ts` (`adminPath`, `essPath`). This one is inlined.
- **Rule violated:** best-practices §5 "Dont pass hardcode data … data should come from the test-data files" (paths are data here).
- **Fix:** add `logsPath: (id: number) => \`${essPath}/${id}/logs\`` (or a template constant) to the trackers data module and reference it.

### [IMPORTANT] Fragile, label-substring locators in the POM
- **`MyTrackersPage.ts` L20–21:**
  ```ts
  this.logInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Log' }).locator('.oxd-input').nth(0);
  this.commentInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Comment' }).locator('.oxd-textarea').nth(0);
  ```
- `hasText: 'Log'` is a **non-exact substring** — "Log" matches any group whose label contains those letters, and the modal title/section ("Add **Log**", "Tracker **Log**s") risks collision. Combined with `.nth(0)` this is the "index-based selector without robust filtering" pattern flagged in best-practices §2 "NEVER Use".
- **Rule violated:** best-practices §2 locator priority (prefer `getByLabel`) and the ui-selectors convention "`oxd-input` near a *known* label".
- **Fix:** anchor on the exact label element, or prefer `getByLabel('Log')` / `getByLabel('Comment')` if the OXD field exposes a label association. Verify live which works for this modal.

### [IMPORTANT] Tracker-log selectors not verified against / not documented in the domain skill
- The POM relies on bespoke classes `.orangehrm-employee-tracker-log-content-section`, `.orangehrm-employee-tracker-log-reviewer-name/-title-text/-body/-reviewer-date-container`, `.oxd-table-dropdown button` (L64–108).
- `orangehrm-opensource-domain/ui-selectors.md` Performance section documents **only** Manage Reviews and Configure KPIs — there is **no** "My Trackers / Tracker Logs" entry. Per the review rule "Verify selectors exist in source — don't assume", these could not be cross-checked.
- **Fix:** after confirming the selectors live via Playwright MCP, add a "Performance → My Trackers / Tracker Logs" subsection to `ui-selectors.md` (the same way Add User / timesheet selectors are recorded).

### [SUGGESTION] Unused `fullName` variable in TC-008
- **Spec L112:** `const fullName = ...` is declared but never used in TC-008 (it is used in TC-004/007/403). Dead code; trips `noUnusedLocals`/lint.
- **Fix:** delete the line.

### [SUGGESTION] Weak typing & inconsistent field naming in test-data types
- **`test-data/performance/frontend/myTrackers.ts` L2–6:** `interface PositiveLog { log; type: string; Comment }`.
  - Named `PositiveLog` but reused for negative/update/XSS logs — misleading.
  - `type: string` should be a union `'positive' | 'negative'` (the POM branches on it at L49).
  - `Comment` is PascalCase while `log`/`type` are camelCase — inconsistent.
- **Fix:** rename to `LogInput`, type `type: 'positive' | 'negative'`, rename `Comment` → `comment`.

### [SUGGESTION] Error-message typos in `MyTrackersApi`
- L16 `"Failed to retiew data from My Tracker list"` (→ "retrieve"); L43 `` `HTTP ${response.status()}}` `` — stray trailing `}`.
- **Fix:** correct the strings (cosmetic, but they surface in CI failure output).

### [SUGGESTION] `Yes, Delete` button name padded with spaces
- **`MyTrackersPage.ts` L25:** `getByRole('button', { name: ' Yes, Delete ' })`. `getByRole` trims/normalises whitespace, so the padding is harmless but misleading.
- **Fix:** `{ name: 'Yes, Delete' }`.

### [SUGGESTION] `.then()` chaining instead of sequential `await`
- **`MyTrackersPage.ts` L45–48** uses `await this.logInput.waitFor().then(async () => {...})`. It works but obscures control flow.
- **Fix:** prefer straight `await` sequencing.

### [SUGGESTION] Duplicate `orangehrmApiContext` fixture definition
- `src/fixtures/apiAction.ts` L23–32 re-defines `orangehrmApiContext` identically to `src/fixtures/index.ts` L276–285, even though `apiAction` already extends `./index`. DRY violation in the framework layer the spec imports.
- **Fix:** drop the duplicate from `apiAction.ts` and inherit it.

### [SUGGESTION] Traceability gaps in TC numbering
- TC-003 is absent and TC-005/006 are folded into TC-007 via a comment (spec L95). Markdown bold (`**TC-001**`) is embedded in `test()` titles.
- **Fix:** keep IDs contiguous or note intentional gaps in the strategy doc; drop markdown from test titles.

---

## Out-of-scope note (not test code)
- The tracked doc `docs/test-priority_test-strategy_test-scenarios_Performance -> My Trackers.md.md.md` has a **triple `.md.md.md`** extension — almost certainly an accidental rename. Worth fixing in the docs tree (does not affect the suite).

---

## Score: 7/10

A solid, well-structured suite that follows the project's POM + API-seeding conventions, reuses BasePage toast helpers, preserves folder structure, and includes a thoughtful XSS-escaping test. It loses points for two correctness/robustness risks (timezone+format-fragile date assertion; an assertion buried in the Page Object) and for non-idempotent log seeding with no cleanup, plus fragile substring locators that aren't documented in the domain skill.

---

## Recommended Fixes (priority order)
1. **[CRITICAL]** Fix the date assertion — derive `today` in the app timezone, inside the test (not collection time), and verify the rendered date format before using `toContain` (spec L67, L93/108/132).
2. **[CRITICAL]** Move `validateTitle`'s `expect` into the spec using web-first `toHaveText` (POM L35–37, spec L79).
3. **[IMPORTANT]** Make log seeding idempotent (`createIfAbsent` for logs) and add cleanup so TC-004/TC-403 are self-contained (spec L60–61, MyTrackersApi L61–75).
4. **[IMPORTANT]** Move the `/logs` API path into `test-data/performance/api/myTrackers.ts` (MyTrackersApi L62).
5. **[IMPORTANT]** Tighten the `logInput`/`commentInput` locators to exact label anchors / `getByLabel` (POM L20–21).
6. **[IMPORTANT]** Document the tracker-log selectors in `ui-selectors.md` after live verification.
7. **[SUGGESTION]** Remove unused `fullName` (TC-008), fix the data-type naming/union, correct API error-string typos, de-pad the delete-button name, de-duplicate the `orangehrmApiContext` fixture, tidy TC numbering.
