# Test Review — `tests/admin/add-work-shift.spec.ts` (re-review)

**Reviewer**: Lead QA Automation (code review)
**Checklist**: `playwright-best-practices` skill
**Files reviewed**: `tests/admin/add-work-shift.spec.ts` + imports — `src/pages/admin/WorkShiftsPage.ts`, `src/api/orangehrmOSAPI/WorkShiftsApi.ts`, `test-data/admin/frontend/workShifts.ts`, `test-data/admin/api/workShifts.ts`, `src/fixtures/index.ts`, `test-data/index.ts`.
**Selector verification**: OXD selectors confirmed against the live OS 5.8 DOM via Playwright MCP earlier this session (time-picker spinners, AM/PM radios, chip + `bi-x`, error message, table card, dialog) — not assumed.
**Run status**: last green run was **9/9** (Chromium) *before* this round's selector/data/structure tweaks; those four changes are low-risk but a confirming re-run is still pending (the run was interrupted).

This is a re-review after the previous round's [SUGGESTION] fixes. Four of the five prior suggestions are now resolved; the fifth is an accepted, documented trade-off. No new issues were introduced.

---

## What's Good
- **Clean POM separation** (§2.90, §4): no raw locators in the spec; `expect` only in the spec, never the page object.
- **Correct locator priority** (§2): roles/placeholders first; CSS only for OXD nodes with no role/testid, each commented.
- **No `waitForTimeout`** (§9/§11); synchronization via `expect().toBeVisible()`, `waitForSuccessToast`, loader helpers.
- **Dynamic unique data** (§8): `Date.now()` on every created name; `DUPLICATE_SHIFT` generated once.
- **Data hygiene** (§5): duplicate record seeded in `beforeAll`; only a read-only count query remains in the test body. The negative whitespace input now lives in `test-data` (`samples.whitespaceName`).
- **Deterministic empty-state** (§6): TC-503 mocks the list GET, passing non-GET methods through.
- **Resilient counter/value selectors** (§2): `recordsFoundText` anchored on the `(\d+)` counter (can no longer match "No Records Found"); `durationValue` pinned to the last `<p>`.
- **Failure isolation** (§11): `serial` is scoped to the stateful *Add Work Shift form* describe; the ESS-security and empty-state describes now run independently of a failure there.
- **Strong security assertions**: TC-202 (XSS non-execution via dialog guard + inline-script scan), TC-200 (no Admin menu + `Credential Required` on both deep links).
- **Cleanup**: `afterAll` resolves names→ids and hard-deletes; no residue on the shared instance.
- **Domain accuracy**: `Successfully Saved`, `Already exists`, `Required`, `Credential Required`, `6.50`/`5.50`, and `From ≥ To → 0.00` are all live-verified valid requirements.

---

## Resolved Since Last Review
| Prior issue | Status |
|-------------|--------|
| `recordsFoundText` regex also matched "No Records Found" | **Fixed** — now `/\(\d+\)\s*Record/` (WorkShiftsPage.ts:73) |
| Hardcoded whitespace literal passed to page object | **Fixed** — moved to `samples.whitespaceName`; spec references it (workShifts.ts; spec:114) |
| `durationValue` could match >1 `<p>` | **Fixed** — `.locator('p').last()` (WorkShiftsPage.ts:60) |
| Top-level `serial` skipped independent describes | **Fixed** — `serial` scoped to the form describe (spec:51) |

---

## Issues Found

### [SUGGESTION] Time picker closed by clicking the page heading — WorkShiftsPage.ts line ~116
**Current**:
```ts
// Close the pop-up (blur) so Duration Per Day recomputes.
await this.addFormHeading.click();
```
**Problem**: clicking the H6 heading to blur the picker is a non-user gesture and couples `setTime` to the *Add* heading (it would not work on the *Edit* form, heading "Edit Work Shift").
**Violates**: §11 "driving via incidental elements"; mild reusability smell.
**Status**: **Accepted trade-off** — switching to `Escape`/neutral-click risked regressing the live-verified duration recompute (OXD recomputes on blur, and the heading-click blur is proven). The intent is commented. Re-listed only for completeness; safe to leave as-is unless the page object is later reused for Edit.

---

## Score: 9.5/10
No CRITICAL or IMPORTANT issues. The earlier data-hygiene violation and all selector/structure suggestions are resolved. The single remaining item is a knowingly-accepted, documented trade-off.

## Recommended Fixes (priority order)
1. **[SUGGESTION, optional]** If `WorkShiftsPage` is ever extended to the Edit form, replace the heading-click blur in `setTime` with a form-agnostic blur (e.g. `Escape`, re-verified to still trigger the duration recompute).
2. **[Process]** Re-run `tests/admin/add-work-shift.spec.ts` to reconfirm 9/9 after this round's selector/data/structure tweaks.
