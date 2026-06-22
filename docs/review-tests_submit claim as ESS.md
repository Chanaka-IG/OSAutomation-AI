# Test Review — Submit Claim as ESS

**Files reviewed:**
- `tests/claim/submit-claim-ess.spec.ts`
- `src/pages/claim/SubmitClaimPage.ts`
- `src/api/orangehrmOSAPI/ClaimRequestsApi.ts`
- `test-data/claim/frontend/submitClaim.ts`, `test-data/claim/api/claimRequests.ts`
- Wiring: `src/fixtures/index.ts`, `test-data/index.ts`

**Standard:** `playwright-best-practices` skill.

---

## What's Good
- **POM discipline** — the multi-page journey (create → detail/expenses → My Claims) is fully encapsulated in `SubmitClaimPage`; the spec reads as steps + assertions (§2, §5).
- **Layered seeding** — config fixtures seeded as Admin, claim fixtures seeded **as the ESS employee** (self-scoped) via a logout/login dance in `beforeAll`, mirroring the established `myTrackers` pattern (§5 "Add data via APIs").
- **Web-first assertions** — status/reference read via `toHaveValue` (retries until the detail populates), avoiding the read-before-load flake that an `inputValue()` snapshot caused.
- **Locators verified against reality** — the My Claims "Reference Id" filter input has *no* `oxd-input` class, so the locator matches any `input` in that group; the OXD date-picker overlay is dismissed with Escape so it can't intercept the Save click. Both were found and fixed against the live DOM.
- **Toast reuse** — `addExpense` asserts `verifySuccessToastForSave` (BasePage helper), covering TC-504.
- **No `waitForTimeout`**; loaders awaited via BasePage helpers (§9, §11).
- **Folder structure** unchanged — files under the established `src/pages/claim`, `src/api/orangehrmOSAPI`, `test-data/claim/{api,frontend}`, `tests/claim`.
- **Residue minimized + documented** — given claim requests can't be deleted, the suite uses persistent config fixtures and creates only a small fixed number of claims per run; this is called out in the spec header and strategy.

## Issues Found

### [IMPORTANT] Permanent claim-request residue (inherent, documented)
Each run creates ~3 permanent claim requests (`DELETE` → 405 means no cleanup is possible). This is a property of the feature, not a defect, and is minimized + documented. **No code fix** — flagged so reviewers understand the suite intentionally leaves data. If the team wants zero residue, the only options are a DB-level teardown hook or a dedicated disposable employee, both outside this suite's scope.

### [SUGGESTION] `expensesAddButton` relies on DOM order (`.first()`)
`getByRole('button', { name: 'Add' }).first()` assumes the Expenses section's Add precedes the Attachments one. True today; if the sections are reordered it would target the wrong one. Could be anchored to the Expenses section heading for resilience.

### [SUGGESTION] TC-303 (cancel on create form discards) not implemented
The priority doc lists TC-303 (P2). It was omitted to limit scope/claim creation. Low impact (the create Cancel merely navigates away and creates nothing), but noting the gap for completeness.

## Score: 9/10
A correct, well-encapsulated suite for a hard, stateful, data-creating flow, with live-verified selectors and the right web-first waits. Held back only by the inherent residue (unavoidable) and two minor robustness/coverage notes.

## Recommended Fixes (priority order)
1. (Optional) Anchor `expensesAddButton` to the Expenses section rather than `.first()`.
2. (Optional) Add TC-303 (cancel-create discards) if the small extra coverage is wanted (creates no claim).
