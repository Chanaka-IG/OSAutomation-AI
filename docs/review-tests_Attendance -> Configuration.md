# Test Review — Attendance → Configuration

> Reviewer: Lead QA Automation (code review). Checklist: `playwright-best-practices` skill.
> Files reviewed:
> - `tests/attendance/configuration.spec.ts` (primary)
> - `src/pages/attendance/AttendanceConfigPage.ts` (new)
> - `src/api/orangehrmOSAPI/AttendanceApi.ts` (`setConfigs` added)
> - `test-data/time/frontend/attendance.ts`
>
> Status at review time: **13/13 passing**; the config singleton was verified **restored to all-OFF** after
> the run. TC-003 needed one self-healing fix (await the PUT response, not just the toast).

---

## File: `tests/attendance/configuration.spec.ts`

### What's Good
- **One test per prioritized scenario** (TC-ATT-CFG-002/004/100/200/202 P0; 001/003/005/402/503/105/500/505 P1) — clean 1:1 reporting, no folding.
- **Singleton safety is exemplary**: `original` captured in `beforeAll`, restored in `afterAll`, and reset as the per-test baseline in `beforeEach`. This is the single most important property for this feature (a leaked `true` would break the Punch-In/Out, My Records, and Employee Records suites that all assume OFF) — and a post-run API check confirmed all-OFF was restored.
- **Genuine cross-feature E2E**: TC-100/402 enable/disable `canUserChangeCurrentTime`, then reuse `PunchPage` to assert the Date/Time fields flip enabled↔disabled — proving the config actually gates behaviour, not just that a boolean persisted.
- **Deterministic saves**: `save()` awaits the `PUT …/configs` response before asserting, which is exactly what made the back-to-back-save tests reliable.
- No `waitForTimeout`; locators in the POM; imports from the fixtures barrel; ESS via `auth.essTestUser`; OXD switches toggled via `.oxd-switch-input` (the intercepted checkbox lesson from `[[pim-optional-fields]]`).

### Issues Found

**[IMPORTANT] TC-105 asserts against the literal `ALL_OFF`, not the captured baseline (line ~178)**
```ts
await attendanceConfigPage.save();
const configs = await new AttendanceApi(orangehrmAdminApi.request).getConfigs();
expect(configs).toMatchObject(ALL_OFF);
```
The `beforeEach` resets to `original` (the environment's captured state), so a no-change save should preserve
**`original`** — which only equals `ALL_OFF` because this instance happens to default to all-off. On an
instance with a different default, this test would wrongly fail. **Fix:** `expect(configs).toMatchObject(original)`
(or `toEqual(original)`), which is the true invariant of an idempotent no-change save.

**[SUGGESTION] Repeated `new AttendanceApi(orangehrmAdminApi.request)` across tests**
Most tests reconstruct the API client inline. A tiny `attendanceApi` fixture (or a `beforeEach`-scoped local)
would remove the duplication and the repeated `orangehrmAdminApi` plumbing in test signatures. Functional as-is.

**[SUGGESTION] TC-100/402 live in the "Configuration (admin)" describe but drive the punch screen**
This is a deliberate cross-feature assertion and reads fine, but a short comment (or a nested describe
"downstream gating") would signal that these two intentionally leave the config screen. Cosmetic.

---

## File: `src/pages/attendance/AttendanceConfigPage.ts`

### What's Good
- `setSwitch(label, on)` is idempotent (reads the underlying checkbox, only clicks on a delta) and targets the switch by its label row — robust and readable.
- `save()` races `waitForResponse` on the PUT then verifies the toast — the right ordering.
- No assertions in the page object; `isEnabled`/`label` are clean query helpers.

### Issues Found
- **[SUGGESTION]** `configRow` keys off `.orangehrm-attendance-field-row` + `hasText(label)` (CSS, §2 priority 5). No stable role/testid exists for OXD switch rows, so this is the correct last resort — documented, not a defect.

---

## File: `src/api/orangehrmOSAPI/AttendanceApi.ts`

### What's Good
- `setConfigs(config)` PUTs the full triple and throws on non-OK with a truncated body; its JSDoc explicitly
  warns that the config is a singleton and callers must restore — good guard-rail for future authors.

### Issues Found
- None.

---

## Domain Cross-Check
- The three toggle labels, the `GET`/`PUT /attendance/configs` contract (full-triple payload), the
  "Successfully Saved" toast, admin-only access (ESS "Credential Required"), and each flag's downstream effect
  were all **verified live** (2026-06-14) and are consistent with the three sibling Attendance pipelines. No
  invented behaviour.

---

## Score: **9 / 10**
A careful, well-isolated suite whose standout is rigorous singleton capture/restore plus a real
config→behaviour integration check. One correctness nit (assert against the captured baseline, not the
hardcoded all-off literal) and minor de-duplication.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** TC-105: assert `toMatchObject(original)` instead of `ALL_OFF`.
2. **[SUGGESTION]** Extract an `attendanceApi` fixture to remove repeated client construction.
3. **[SUGGESTION]** Add a short note/nested describe for the punch-screen (downstream) tests.
