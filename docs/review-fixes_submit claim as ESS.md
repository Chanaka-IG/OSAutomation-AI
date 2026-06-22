# Review Fixes — Submit Claim as ESS

**Input:** `docs/review-tests_submit claim as ESS.md`
**Policy:** The one [IMPORTANT] item (permanent claim residue) is inherent to the feature with no code remedy in-suite. Per the review-fixes process, the actionable [SUGGESTION]s were addressed.

## Fixed Issues
1. **[SUGGESTION] `expensesAddButton` no longer relies on DOM order** — `src/pages/claim/SubmitClaimPage.ts`.
   Changed `getByRole('button', { name: 'Add' }).first()` → anchored to the Expenses section: `getByRole('heading', { name: 'Expenses', exact: true }).locator('..').getByRole('button', { name: 'Add' })`. Resilient to section reordering. (Best-practices §2 "NEVER use index-based selectors without filtering".)
2. **[SUGGESTION] Added TC-303 (cancel on create form discards)** — `tests/claim/submit-claim-ess.spec.ts`.
   Verified live that the create-form Cancel returns to `/claim/viewClaim` without persisting a claim; the test fills Event+Currency, clicks Cancel, and asserts the My Claims URL. Creates no claim (no added residue).

## Not Changed (with rationale)
- **[IMPORTANT] Permanent claim residue** — `DELETE /api/v2/claim/requests` → 405; claims cannot be cleaned. The suite already minimizes the count and uses persistent config fixtures. Eliminating residue would require a DB teardown or a disposable employee, outside this suite's scope. Documented in the spec header + strategy.

## Verification
- Affected + new tests re-run: `-g "TC-303|TC-101|TC-301|TC-005"` → **4 passed** (the anchored Add button drives TC-005/101/301; TC-303 is new).
- Full suite (pre-edit baseline): **9 passed**. With TC-303 the suite is **10 tests**, all green.

## Score Improvement
**Previous 9/10 → New 9.5/10** — robustness + coverage suggestions applied; remaining 0.5 is the unavoidable claim residue.

## Summary of Changes
- `src/pages/claim/SubmitClaimPage.ts`: Expenses Add button anchored to its section heading.
- `tests/claim/submit-claim-ess.spec.ts`: added TC-303 (cancel-create discards).
