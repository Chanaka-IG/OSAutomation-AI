# Test Review — Add Work Shift

**File under review**: `tests/admin/add-work-shift.spec.ts`
**Supporting files reviewed**: `src/pages/admin/WorkShiftsPage.ts`, `src/api/orangehrmOSAPI/WorkShiftsApi.ts`, `test-data/admin/frontend/workShifts.ts`, `test-data/admin/api/workShifts.ts`, fixture wiring in `src/fixtures/index.ts`.
**Checklist**: `playwright-best-practices` skill (locator strategy, assertions in spec, no `waitForTimeout`, data hygiene, POM, dynamic data).
**Run status**: 9/9 passing in Chromium (verified live).

---

## What's Good
- **POM discipline**: every locator lives in `WorkShiftsPage`; the spec contains no raw locators (best-practice §2.90). Assertions stay in the spec, page object exposes actions/getters (§4).
- **Locator priority respected**: `getByRole` for buttons/headings/options, `getByPlaceholder('Type for hints...')` for the autocomplete; CSS (`.oxd-input-group`, `.oxd-chip`, `.oxd-time-*`) only where OXD exposes no role/testid — a justified last resort (§2).
- **No `waitForTimeout`** anywhere; waits go through `expect(...).toBeVisible()` and the shared loader helpers (§9, §11).
- **Dynamic, unique data**: every created shift name uses `Date.now()`, preventing cross-run collisions (§8).
- **No hardcoded credentials/data into the page object**: ESS creds come from `auth.essTestUser`; time parts and messages come from `test-data` (§5).
- **Deterministic empty-state**: TC-503 uses `page.route(...)` to force an empty list rather than depending on shared instance state (§6) — the correct pattern.
- **Cleanup**: `afterAll` resolves created names → ids and hard-deletes via the API; no orphaned records on the shared instance.
- **XSS test** asserts non-execution via a dialog guard + inline-`<script>` scan, not just text presence — a meaningful security assertion.
- **No `console.log`**; API services use `createLogger` (§13).

---

## Issues Found

### [IMPORTANT] In-test API seeding in TC-100 (lines ~178–187)
**Current**:
```ts
test('TC-ADMIN-AWS-100 ...', async ({ workShiftsPage, orangehrmAdminApi, page }) => {
  await orangehrmAdminApi.loginAsAdmin();
  const workShiftsApi = new WorkShiftsApi(orangehrmAdminApi.request);
  if ((await workShiftsApi.getIdByName(DUPLICATE_SHIFT)) === undefined) {
    await workShiftsApi.create({ name: DUPLICATE_SHIFT, ... });
  }
  await workShiftsPage.gotoAddForm();
  ...
```
**Violates**: best-practices §5 *"Add data via APIs … Don't add data through APIs inside the test body, always add data through APIs in the test hooks (beforeEach or beforeAll)."*
**Why it matters**: seeding inside the test body mixes fixture setup with the behavior under test, lengthens the test, and (in serial mode) couples the seed lifecycle to this single test.
**Fix**: move the idempotent seed into a `beforeAll` for the `Admin — Add Work Shift form` describe (or a dedicated describe), keeping the test body focused on typing the duplicate + asserting the inline error and the unchanged record count. The `DUPLICATE_SHIFT` constant and `afterAll` cleanup already support this.

### [SUGGESTION] Dead selector in `removeEmployeeChip` (WorkShiftsPage.ts line ~140)
**Current**:
```ts
await this.employeeChip(name).locator('.oxd-chip-delete, .bi-x').first().click();
```
**Observation**: the live chip remove control is `i.oxd-icon.bi-x.--clear`; there is no `.oxd-chip-delete` node (verified via MCP). The selector works only because `.bi-x` matches.
**Fix**: drop the non-existent `.oxd-chip-delete` and target `.bi-x` (or `.--clear`) directly to avoid a misleading selector.

### [SUGGESTION] Brittle text filter for the To field (WorkShiftsPage.ts line ~62)
**Current**:
```ts
this.toGroup = page.locator('.oxd-input-group').filter({ hasText: 'To' });
```
**Observation**: `'To'` is a very short substring; it passes today only because no sibling input-group label contains "to". It would silently match the wrong group if a future field label contained the substring.
**Fix**: tighten to an exact label match, e.g. filter by a child `label` with exact text `To`, or scope by the second `input[placeholder="hh:mm"]`. Low risk today; flagged for resilience (§2 "use exact text match for reliability").

### [SUGGESTION] Closing the time picker by clicking the page heading (WorkShiftsPage.ts line ~118)
**Current**:
```ts
// Close the pop-up (blur) so Duration Per Day recomputes.
await this.addFormHeading.click();
```
**Observation**: clicking the H6 heading to blur the picker is functional but semantically odd and ties `setTime` to the *Add* heading (would break if reused on the Edit form). 
**Fix (optional)**: blur via `this.page.keyboard.press('Escape')` if OXD supports it, or click a neutral form region; if kept, a short comment already explains intent.

---

## Score: 8.5/10
Solid, best-practice-aligned suite that passes live and cleans up after itself. The single material deduction is the in-test API seeding (§5); the remainder are resilience/cleanliness suggestions.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Move TC-100's duplicate seed from the test body into a `beforeAll` hook.
2. **[SUGGESTION]** Remove the non-existent `.oxd-chip-delete` from the chip-remove selector.
3. **[SUGGESTION]** Make the `To` input-group filter an exact label match.
4. **[SUGGESTION]** Reconsider closing the time picker via the page heading.

---

# Review Fixes Applied (Step 6)

## Fixed Issues
1. **[IMPORTANT] In-test API seeding (TC-100)** — Added a `beforeAll` to the `Admin — Add Work Shift form` describe that idempotently seeds `DUPLICATE_SHIFT` via `WorkShiftsApi`. The test body now only types the duplicate, asserts the inline error/blocked save, and does a **read-only** count check (constructing the API client for a query is allowed; only data *creation* was moved out). `tests/admin/add-work-shift.spec.ts`.
2. **[SUGGESTION] Dead selector** — `removeEmployeeChip` now targets `.bi-x` only (removed the non-existent `.oxd-chip-delete`). `src/pages/admin/WorkShiftsPage.ts`.
3. **[SUGGESTION] Brittle `To` filter** — `fromGroup`/`toGroup` now filter by an exact label match (`filter({ has: getByText('From'|'To', { exact: true }) })`) instead of a loose substring. `src/pages/admin/WorkShiftsPage.ts`.
4. **[SUGGESTION] Picker blur via heading** — *Accepted as-is.* Switching to `Escape` risked regressing the verified duration-recompute behavior (OXD recomputes on blur, and the heading-click blur is proven live); the intent is already commented. No change.

## Score Improvement: 8.5/10 → 9.5/10
The material best-practice violation (in-test seeding) is resolved and two selector-resilience suggestions are applied. Remaining item is an accepted, documented trade-off.

## Summary of Changes
- `tests/admin/add-work-shift.spec.ts`: duplicate-record seed relocated to `beforeAll`; TC-100 body trimmed to behavior + read-only verification.
- `src/pages/admin/WorkShiftsPage.ts`: exact-label From/To group filters; chip-remove selector cleaned up.
- **Re-run after fixes: 9/9 passing in Chromium; created shifts auto-deleted in `afterAll`.**
