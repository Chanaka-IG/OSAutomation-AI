# Test Review — Maintenance

**File under review:** `tests/maintenance/maintenance.spec.ts`
**Imported files reviewed:** `src/pages/maintenance/MaintenancePage.ts`, `test-data/maintenance/frontend/maintenance.ts`, `src/api/orangehrmOSAPI/EmployeesApi.ts` (new `terminate()`), fixture + barrel wiring.
**Reviewed against:** `playwright-best-practices`, `automation-framework`, and the live-verified domain behavior.
**Run status at review time:** 13/13 passing (`--project=chromium`).

---

## What's Good
- **Clean POM separation.** Every locator is declared in `MaintenancePage`; the spec calls business-level methods (`openUnlocked`, `selectEmployeeAndSearch`, `openPurgeDialog`). No raw locator chains in the test body (§2, §5).
- **Locator priority respected.** `getByRole`/`getByPlaceholder`/`getByText({exact})` are used throughout; CSS is reserved for the two OXD error nodes that genuinely have no role (§2).
- **Deterministic, isolated data.** A per-run `TOKEN` (`Mnt<ts>`) namespaces all three seeded employees, so autocomplete queries match only this suite's records; no reliance on ambient demo data (§8, anti-pattern "shared state").
- **Data via API in hooks, cleaned in `afterAll`.** Create + terminate happen in `beforeAll`; `deleteEmployees` cleans up (and tolerates the already-purged fixture) (§5).
- **Real wait strategy, no sleeps.** Autocomplete uses `waitForResponse` on the `pim/employees` lookup; purge asserts the `DELETE /maintenance/purge` response status. No `waitForTimeout` (§9, §11).
- **Assertions live in the spec**, page object stays action-only (§4).
- **Meaningful security coverage.** ESS block (`Credential Required` + absent menu), gate re-prompt on every entry, and deep-link gating are all asserted against live behavior.

---

## Issues Found

### [IMPORTANT] Hardcoded primary-key id `terminationReasonId: 3` in test data
**File:** `test-data/maintenance/frontend/maintenance.ts:` `fixtures.terminationReasonId: 3`
**Used by:** `maintenance.spec.ts` `beforeAll` → `api.terminate(...)`
**Rule violated:** Best-practices §8 — *"never use hardcoded primary key IDs … resolve or create the required IDs dynamically."* Reason id `3` ("Contract Not Renewed") is environment-specific and could differ after a DB reset or on another instance, silently breaking the fixture (a terminate 422 would fail every test in the file).
**Fix:** Resolve the id at runtime from `GET /api/v2/pim/termination-reasons` by name (or take the first available reason). Add a small `EmployeesApi.getTerminationReasonId(name?)` helper and pass the resolved id into `terminate()`.

### [SUGGESTION] Dead locators / unused helper
**File:** `src/pages/maintenance/MaintenancePage.ts`
- `gateUsernameInput` (`.oxd-input[disabled]`) and the `purgeTab` locator + `goToPurgeTab()` method are never exercised by the P0/P1 suite.
**Rule:** general maintainability — keep the POM lean; a `.oxd-input[disabled]` class selector is also a §2 last-resort locator kept around for no active test.
**Fix:** Either remove them, or leave `goToPurgeTab`/`purgeTab` with a short note that they support future P2 tab-navigation tests (TC-007). `gateUsernameInput` can be dropped until TC-105 is automated.

### [SUGGESTION] `searchFieldError` duplicates `gateFieldError`
**File:** `src/pages/maintenance/MaintenancePage.ts`
Both resolve to `.oxd-input-field-error-message`. Only `gateFieldError` is used (TC-300). `searchFieldError` is currently unused (the negative "Search with nothing selected" case is P2, out of the P0/P1 scope).
**Fix:** Remove `searchFieldError` until the P2 validation test is written, to avoid an unused, identically-scoped locator.

### [SUGGESTION] Whitespace-normalised filename assertion could hide a future regression
**File:** `maintenance.spec.ts` TC-004
`filename.replace(/\s+/g, ' ')` is the right call for the empty-middle-name double space, but it would also mask an accidental extra token in the name.
**Fix (optional):** keep the normalise, but the paired `toMatch(/\.json$/)` + full-name check is already adequate. No change required; noted for awareness.

---

## Score: 8.5/10
A well-structured, genuinely-passing suite with strong isolation and real wait strategies. The single material issue is the hardcoded `terminationReasonId` (environment-fragility); the rest are lean-up suggestions.

## Recommended Fixes (priority order)
1. **[IMPORTANT]** Resolve `terminationReasonId` dynamically from `pim/termination-reasons` instead of the literal `3`.
2. **[SUGGESTION]** Remove unused locators/method (`gateUsernameInput`, `searchFieldError`; keep or annotate `purgeTab`/`goToPurgeTab`).
3. **[SUGGESTION]** Leave the TC-004 filename assertion as-is (already robust).
