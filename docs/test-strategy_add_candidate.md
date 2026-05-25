# Test Strategy: Add Candidates

> Input: `docs/test-scenarios.md`
> Feature: `Recruitment → Candidates → Add Candidate`
> Generated: 2026-05-24

---

## Test Pyramid Distribution

| Layer      | Count | Focus                                               | Estimated Time |
|------------|-------|-----------------------------------------------------|----------------|
| E2E        | 28    | Full browser flows: form submit, UI validation, navigation, role access, XSS render | 8–14 min      |
| API        | 3     | Security + field validation at transport layer      | < 30 sec       |
| Component  | 0     | No isolated Vue component testing in this framework | —              |
| Unit       | 0     | No pure functions to isolate for this feature       | —              |
| **Total**  | **31**|                                                     |                |

---

## Layer Assignments

### E2E Tests (browser-driven, Playwright Chromium)

These scenarios require a real browser because they exercise:
- OXD custom dropdown interaction (click to open → click option)
- OXD checkbox toggle
- OXD autocomplete
- File upload via `<input type="file">`
- Toast/navigation-based success confirmation
- Role-based menu visibility

| TC ID   | Title                                                    | Rationale |
|---------|----------------------------------------------------------|-----------|
| TC-001  | Add Candidate with Required Fields Only                  | Core happy path; must pass in every release |
| TC-002  | Add Candidate with All Optional Fields                   | Verifies optional fields persist end-to-end |
| TC-003  | Profile Shows APPLICATION_INITIATED After Save           | Status transition; requires real page navigation |
| TC-004  | Candidate Visible in List After Creation                 | Full-stack persistence check |
| TC-005  | Only Active Vacancies in Vacancy Dropdown                | OXD dropdown state; browser interaction required |
| TC-100  | Consent Checkbox Is Mandatory (GDPR)                     | Business-rule enforcement on UI submit |
| TC-101  | Valid Email Format Accepted                              | Client-side format check; E2E confirms round-trip |
| TC-102  | Date of Application Defaults to Today                    | UI default state; browser-only |
| TC-103  | Vacancy Field Is Required                                | Required-field validation; OXD dropdown interaction |
| TC-104  | Keywords Comma-Separated Values Accepted                 | Free-text field persistence |
| TC-105  | Resume PDF Upload Accepted                               | File input interaction — E2E only layer |
| TC-106  | Multiple Candidates to Same Vacancy                      | Vacancy FK allows multiple candidates |
| TC-200  | ESS: No Recruitment in Side Navigation                   | Role-based menu visibility; requires login flow |
| TC-201  | ESS: Direct URL to Add Candidate — No Functional Form    | Direct URL bypass check; requires ESS login |
| TC-202  | XSS in First Name Does Not Execute                       | Stored XSS render check; requires browser DOM |
| TC-203  | XSS in Keywords/Notes Does Not Execute                   | Stored XSS on multiple fields |
| TC-300  | Empty Form — All Required Errors Visible                 | Aggregate validation UX |
| TC-301  | Missing First Name → Required Error                      | Individual field validation |
| TC-302  | Missing Last Name → Required Error                       | Individual field validation |
| TC-303  | Missing Email → Required Error                           | Individual field validation |
| TC-304  | Invalid Email Format → Validation Error                  | Format validation |
| TC-305  | Cancel Returns to List Without Creating Record           | Navigation + no-write check |
| TC-307  | First Name > 30 Chars → Length Error                     | Boundary error on name fields |
| TC-400  | First Name at Max Length (30 chars)                      | Positive boundary — accepted |
| TC-401  | Contact Number with International Format                 | Free-text field acceptance |
| TC-402  | Keywords with Special Characters                         | Special char handling |
| TC-500  | Validation Errors Clear on Correction                    | Reactive inline validation UX |
| TC-501  | Consent Checkbox Toggle                                  | OXD checkbox interactivity |
| TC-502  | Add Button Visible on Candidates List (Admin)            | Admin permission → UI element |
| TC-503  | Vacancy Dropdown Opens/Closes on Click                   | OXD dropdown open/close behavior |
| TC-505  | Save Button Enabled Before Fill                          | Submit-time validation pattern |

---

### API Tests (no browser)

These scenarios can be fully validated at the HTTP layer and should not occupy browser resources:

| TC ID   | Title                                                    | Endpoint                                      | Rationale |
|---------|----------------------------------------------------------|-----------------------------------------------|-----------|
| TC-204  | Unauthenticated POST → 401                               | `POST /api/v2/recruitment/candidates`         | Auth check — no UI needed; pure HTTP |
| TC-306  | Missing Required Field → 422                             | `POST /api/v2/recruitment/candidates`         | Server-side validation contract |
| Anti-P  | ESS session POST → 403                                   | `POST /api/v2/recruitment/candidates`         | Role enforcement at API layer |

**Moved DOWN from E2E**: TC-204 and TC-306 were originally suggested as E2E but the behavior (HTTP status codes, response bodies) is best asserted at the API layer. The UI tests cover the same scenarios as user-visible validation feedback.

---

### Skipped / Deferred Scenarios

| TC ID   | Reason |
|---------|--------|
| TC-403  | Edge case "no active vacancies" — environment-dependent; hard to isolate reliably without deleting all vacancies |
| TC-404  | Notes boundary length — simple text persistence; validated implicitly by TC-002; low ROI as standalone E2E |
| TC-504  | File name display after upload — purely cosmetic; file upload covered in TC-105 |
| TC-506  | Spinner visibility — non-deterministic timing in CI; covered implicitly by `waitUntilTableLoaderDissapear()` used in all table tests |

---

## Anti-Patterns Found

1. **No anti-patterns in `add-vacancy.spec.ts`** — existing suite correctly uses `createIfAbsent`, cleans up in `afterAll`, and avoids E2E for HTTP assertions.

2. **Potential ice-cream cone risk**: TC-101 (valid email format) and TC-304 (invalid email format) are at E2E but could be API/unit. However, since the framework has no unit infrastructure and these also test the full OXD form submit flow, E2E is justified.

3. **TC-306 (API 422)** — correctly at API layer; do not duplicate as E2E (TC-303 covers the user-visible equivalent).

---

## Defense-in-Depth (Multi-Layer Coverage)

| Business Rule                  | E2E Coverage           | API Coverage          |
|-------------------------------|------------------------|-----------------------|
| Consent checkbox required      | TC-100                 | TC-306 (implicit)     |
| Auth required to create        | TC-200, TC-201         | TC-204                |
| Vacancy required               | TC-103                 | TC-306                |
| XSS sanitization               | TC-202, TC-203         | (not needed at API layer) |
