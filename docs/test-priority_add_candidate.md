# Test Priority: Add Candidates — E2E Tests

> Input: `docs/test-strategy.md` — 28 E2E scenarios (+ 3 API)
> Feature: `Recruitment → Candidates → Add Candidate`
> Generated: 2026-05-24

Only **E2E** scenarios are prioritized here (API tests are always executed; priority applies to E2E generation order).

---

## P0 — Release-Blocking (Core business flow, data integrity, security)

These tests block a release if they fail. They cover the primary CRUD path, GDPR compliance, and role-based access control.

| TC ID  | Title                                              | Rationale |
|--------|----------------------------------------------------|-----------|
| TC-001 | Add Candidate with Required Fields Only            | Core write path — if this fails, no candidates can be created; release blocker |
| TC-004 | Candidate Visible in List After Creation           | Persistence check — data integrity; confirms save is committed to DB |
| TC-100 | Consent Checkbox Is Mandatory (GDPR)               | GDPR compliance — saving a candidate without consent is a legal violation; release blocker |
| TC-200 | ESS: No Recruitment in Side Navigation             | Security/compliance — ESS must not see Recruitment; role boundary is core to multi-tenancy |
| TC-201 | ESS: Direct URL to Add Candidate — No Functional Form | Security — ESS URL bypass must be blocked; data protection |
| TC-300 | Empty Form — All Required Errors Visible           | Data integrity — form must enforce all required fields on submit |
| TC-305 | Cancel Returns to List Without Creating Record     | Data integrity — Cancel must not persist partial data |

**P0 total: 7**

---

## P1 — High Impact (Primary feature paths, major integrations)

These tests cover critical flows that affect large portions of users or integrate with other modules.

| TC ID  | Title                                              | Rationale |
|--------|----------------------------------------------------|-----------|
| TC-002 | Add Candidate with All Optional Fields             | Full field persistence — validates complete form end-to-end; high user reach |
| TC-003 | Profile Shows APPLICATION_INITIATED After Save     | Status pipeline start — required for all subsequent pipeline actions (shortlist, hire) |
| TC-005 | Only Active Vacancies in Vacancy Dropdown          | Business rule integration — closed vacancies must not pollute the dropdown |
| TC-103 | Vacancy Field Is Required                          | Required field enforcement — vacancy is the primary FK linking candidate to pipeline |
| TC-202 | XSS in First Name Does Not Execute                 | Security — stored XSS on candidate names rendered in lists and profiles across multiple pages |
| TC-203 | XSS in Keywords/Notes Does Not Execute             | Security — stored XSS on free-text fields displayed across search results |
| TC-301 | Missing First Name → Required Error                | Individual required field validation — First Name is the primary identity field |
| TC-302 | Missing Last Name → Required Error                 | Individual required field validation |
| TC-303 | Missing Email → Required Error                     | Email is the communication key for candidate outreach |
| TC-304 | Invalid Email Format → Validation Error            | Format validation — invalid email prevents candidate outreach |
| TC-307 | First Name > 30 Chars → Length Error               | Boundary enforcement — prevents DB truncation / ORM error |
| TC-400 | First Name at Max Length (30 chars)                | Positive boundary — confirms max-length inputs are accepted |

**P1 total: 12**

---

## P2 — Moderate Impact (Secondary flows, edge cases on common paths)

These tests cover useful but non-critical behaviors. A workaround exists, or the impact affects a minority of users.

| TC ID  | Title                                              | Rationale |
|--------|----------------------------------------------------|-----------|
| TC-101 | Valid Email Format Accepted                        | Positive format test — implicit in TC-001; useful as explicit boundary but not blocking |
| TC-102 | Date of Application Defaults to Today              | UX default — omission is noticeable but not data-breaking |
| TC-104 | Keywords Comma-Separated Values Accepted           | Secondary field — keywords used for filtering only; not in pipeline flow |
| TC-105 | Resume PDF Upload Accepted                         | Optional attachment; workaround is adding resume later via edit |
| TC-106 | Multiple Candidates to Same Vacancy                | Common scenario but each candidate is independent; failure only affects bulk-apply workflows |
| TC-401 | Contact Number with International Format           | Optional field; low user impact if only domestic format accepted |
| TC-402 | Keywords with Special Characters                   | Edge on optional field; workaround is avoiding special chars |
| TC-500 | Validation Errors Clear on Correction              | UX improvement; incorrect behavior here is annoying but not blocking |
| TC-501 | Consent Checkbox Toggle                            | Cosmetic/interactivity; consent enforcement is covered by TC-100 |
| TC-502 | Add Button Visible on Candidates List (Admin)      | Navigation entry point; if missing, user can still use direct URL |
| TC-503 | Vacancy Dropdown Opens/Closes on Click             | OXD component behavior; implicit in all dropdown tests above |

**P2 total: 11**

---

## P3 — Low Impact (Cosmetic, rare edge cases, nice-to-have)

These tests are low priority; they cover cosmetic states or behaviors that rarely affect users.

| TC ID  | Title                                              | Rationale |
|--------|----------------------------------------------------|-----------|
| TC-505 | Save Button Enabled Before Fill                    | Framework behavior expectation; cosmetic; submit-time validation is confirmed by all negative tests |

**P3 total: 1**

---

## Summary

| Priority | Count |
|----------|-------|
| P0       | 7     |
| P1       | 12    |
| P2       | 11    |
| P3       | 1     |
| **Total E2E** | **31** |

**Generate tests for**: P0 + P1 (19 tests total)
