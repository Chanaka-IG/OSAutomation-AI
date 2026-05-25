# Test Strategy: Candidate Pipeline

**Feature**: Recruitment → Candidate Pipeline (status transitions on candidate profile)
**Generated**: 2026-05-24

---

## Layer Breakdown

| Layer | Count | Rationale |
|-------|-------|-----------|
| E2E   | 18    | All pipeline state transitions require UI validation — status badge, action buttons, modal interactions, and PIM side-effects must be verified in a real browser |
| API   | 4     | Security/auth checks (403, 401) and invalid-state transitions are faster and more reliable at the API layer — no browser needed |
| Component | 0 | OXD components are third-party; individual component tests add no project value |
| Unit  | 0     | Business logic lives server-side in PHP; unit tests are outside the scope of this automation project |

---

## E2E Strategy

### Setup approach
- Seed candidates at various pipeline stages using `CandidatesApi.performAction()` in `beforeAll`
- Use serial execution (`mode: 'serial'`, `workers: 1`) to avoid session conflicts
- Admin cookie-reuse pattern: navigate to profile URL, re-login only if redirected
- Test data naming prefix: `CP` (Candidate Pipeline) to distinguish from other suite data
- Each staged candidate gets a unique name so profile navigation is unambiguous

### Candidate staging via API
To test transitions from mid-pipeline states without repeating earlier steps in every test, seed candidates directly to the required state:

| Target state | Actions to apply in sequence |
|---|---|
| SHORTLISTED | SHORTLIST |
| INTERVIEW_SCHEDULED | SHORTLIST → SCHEDULE_INTERVIEW |
| INTERVIEW_PASSED | SHORTLIST → SCHEDULE_INTERVIEW → PASS_INTERVIEW |
| JOB_OFFERED | SHORTLIST → SCHEDULE_INTERVIEW → PASS_INTERVIEW → OFFER_JOB |

### Page object needs
- `CandidateProfilePage` — action button area, status badge, pipeline action modals
- `CandidatesApi.performAction(candidateId, action, note?)` — advance a candidate to a specific stage

### Browser-side verification
Before writing test code: use browser MCP / `page.evaluate()` to confirm:
1. Exact CSS selector for action buttons (likely `.orangehrm-recruitment-actions button`)
2. Status badge locator (likely `p` containing "Status:")
3. Modal confirm button label ("Save" vs "Hire" for the Hire action)
4. Notes textarea locator inside action modal

### Timing
- Navigation timeout: `120_000` ms per `page.goto()` (server can be slow post-action)
- `waitUntilTableLoaderDissapear()` or equivalent after each pipeline action
- `networkidle` drain after actions that trigger server-side work (e.g., HIRE → PIM creation)

---

## API Strategy

### TC-201 — ESS 403 on pipeline action
- Use ESS session cookie (from storageState file)
- `PUT /api/v2/recruitment/candidates/{id}/actions` with `{ action: "SHORTLIST" }`
- Assert response status 403

### TC-202 — Unauthenticated 401
- No session cookie
- Same PUT endpoint
- Assert response status 401

### TC-301 — Invalid action 422
- Admin session
- `PUT /api/v2/recruitment/candidates/{id}/actions` with `{ action: "INVALID_ACTION" }`
- Assert response status 422

### TC-302 — Wrong-state transition error
- Admin session; candidate in APPLICATION_INITIATED
- `PUT /api/v2/recruitment/candidates/{id}/actions` with `{ action: "SCHEDULE_INTERVIEW" }`
- Assert 4xx response; verify status unchanged via GET

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| HIRE auto-creates PIM Employee — cleanup needed | Delete PIM employee in afterAll using EmployeesApi |
| Pipeline action modals may have varying confirm button labels | Verify in browser before coding; use flexible role locator |
| Slow server after HIRE action (PIM write) | Add `networkidle` drain after HIRE transition |
| Candidate seeded at wrong stage causes cascading failures | Verify stage via GET before running the test; fail fast if wrong |
| ESS security tests require separate session | Run ESS tests in a dedicated describe block with explicit logout/login |

---

## Excluded from Automation

- TC-103 (action button label per stage): covered implicitly by the individual stage transition tests — separate test adds no value
- TC-105 (notes textarea visible): verified as a side-effect of TC-002/TC-400 (Shortlist with note) — no separate test needed
- TC-106 (Hire dialog shows candidate name): checked within TC-006 (Hire test) — no standalone test needed
