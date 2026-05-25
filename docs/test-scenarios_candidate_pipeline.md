# Test Scenarios: Candidate Pipeline

**Feature**: Recruitment → Candidate Pipeline (status transitions on candidate profile)
**URL**: `/web/index.php/recruitment/addCandidate/{id}`
**Generated**: 2026-05-24

---

## Pipeline State Machine (from domain skill)

```
APPLICATION_INITIATED
      ↓ [Shortlist]
SHORTLISTED ────── [Reject] ──→ REJECTED
      ↓ [Schedule Interview]
INTERVIEW_SCHEDULED ── [Mark Interview Failed] ──→ INTERVIEW_FAILED
      ↓ [Mark Interview Passed]
INTERVIEW_PASSED
      ↓ [Offer Job]
JOB_OFFERED ──── [Decline Offer] ──→ OFFER_DECLINED
      ↓ [Hire]
HIRED  ← triggers auto-creation of PIM Employee record
```

**At any non-terminal stage**: a Reject action is also available.

---

## Happy Path Scenarios (TC-001–099)

### TC-001: Full pipeline — APPLICATION_INITIATED → HIRED
**Category**: Happy Path
**Preconditions**: Admin logged in; candidate in APPLICATION_INITIATED status; vacancy is active
**Steps**:
1. Open candidate profile
2. Click "Shortlist" → confirm in modal → status = Shortlisted
3. Click "Schedule Interview" → confirm → status = Interview Scheduled
4. Click "Mark Interview Passed" → confirm → status = Interview Passed
5. Click "Offer Job" → confirm → status = Job Offered
6. Click "Hire" → confirm Hire dialog → status = Hired
**Expected Results**: Each stage transition updates the status badge on the profile; final status is "Hired"; action buttons disappear (no further actions possible)
**Business Rule**: Complete recruitment pipeline terminates at HIRED
**Suggested Layer**: E2E

### TC-002: Shortlist a candidate
**Category**: Happy Path
**Preconditions**: Candidate in APPLICATION_INITIATED
**Steps**:
1. Open candidate profile
2. Click "Shortlist" action button
3. (Optional) Add a note in the modal
4. Click Save on the modal
**Expected Results**: Status badge updates to "Shortlisted"; "Schedule Interview" action button appears
**Business Rule**: APPLICATION_INITIATED → SHORTLISTED requires explicit Shortlist action
**Suggested Layer**: E2E

### TC-003: Schedule an interview
**Category**: Happy Path
**Preconditions**: Candidate in SHORTLISTED
**Steps**:
1. Open candidate profile
2. Click "Schedule Interview"
3. Confirm in modal
**Expected Results**: Status badge updates to "Interview Scheduled"; action buttons for "Mark Interview Passed" and "Mark Interview Failed" appear
**Business Rule**: SHORTLISTED → INTERVIEW_SCHEDULED
**Suggested Layer**: E2E

### TC-004: Mark interview as passed
**Category**: Happy Path
**Preconditions**: Candidate in INTERVIEW_SCHEDULED
**Steps**:
1. Open candidate profile
2. Click "Mark Interview Passed"
3. Confirm in modal
**Expected Results**: Status badge updates to "Interview Passed"; "Offer Job" action button appears
**Business Rule**: INTERVIEW_SCHEDULED → INTERVIEW_PASSED
**Suggested Layer**: E2E

### TC-005: Offer job to candidate
**Category**: Happy Path
**Preconditions**: Candidate in INTERVIEW_PASSED
**Steps**:
1. Open candidate profile
2. Click "Offer Job"
3. Confirm in modal
**Expected Results**: Status badge updates to "Job Offered"; "Hire" and "Decline Offer" action buttons appear
**Business Rule**: INTERVIEW_PASSED → JOB_OFFERED
**Suggested Layer**: E2E

### TC-006: Hire a candidate — auto-creates PIM Employee record
**Category**: Happy Path
**Preconditions**: Candidate in JOB_OFFERED
**Steps**:
1. Open candidate profile
2. Click "Hire"
3. Confirm in the Hire dialog
**Expected Results**: Status badge updates to "Hired"; action buttons disappear; navigating to PIM Employee List and searching by the candidate's name reveals the auto-created employee record
**Business Rule**: HIRE triggers PIM Employee auto-creation using candidate's first/last name/email
**Suggested Layer**: E2E

### TC-007: Reject at APPLICATION_INITIATED stage
**Category**: Happy Path
**Preconditions**: Candidate in APPLICATION_INITIATED
**Steps**:
1. Open candidate profile
2. Click "Reject" action
3. Confirm in modal
**Expected Results**: Status badge updates to "Rejected"; no further action buttons available
**Business Rule**: Any non-terminal stage supports Reject; REJECTED is a terminal state
**Suggested Layer**: E2E

---

## Business Rule Scenarios (TC-100–199)

### TC-100: Reject at SHORTLISTED stage
**Category**: Business Rule
**Preconditions**: Candidate in SHORTLISTED
**Steps**:
1. Open candidate profile
2. Click "Reject"
3. Confirm
**Expected Results**: Status = Rejected; pipeline terminates
**Business Rule**: SHORTLISTED → REJECTED (reject available at every non-terminal stage)
**Suggested Layer**: E2E

### TC-101: Mark interview as failed
**Category**: Business Rule
**Preconditions**: Candidate in INTERVIEW_SCHEDULED
**Steps**:
1. Open candidate profile
2. Click "Mark Interview Failed"
3. Confirm
**Expected Results**: Status = Interview Failed; pipeline terminates (no further positive actions)
**Business Rule**: INTERVIEW_SCHEDULED → INTERVIEW_FAILED (terminal negative branch)
**Suggested Layer**: E2E

### TC-102: Decline job offer
**Category**: Business Rule
**Preconditions**: Candidate in JOB_OFFERED
**Steps**:
1. Open candidate profile
2. Click "Decline Offer"
3. Confirm
**Expected Results**: Status = Offer Declined; pipeline terminates
**Business Rule**: JOB_OFFERED → OFFER_DECLINED (candidate declined)
**Suggested Layer**: E2E

### TC-103: Action button label matches current pipeline stage
**Category**: Business Rule
**Preconditions**: Admin logged in; candidates seeded at APPLICATION_INITIATED, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEW_PASSED, JOB_OFFERED stages
**Steps**:
1. Open profile of APPLICATION_INITIATED candidate → assert "Shortlist" button visible
2. Open profile of SHORTLISTED candidate → assert "Schedule Interview" button visible
3. Open profile of INTERVIEW_SCHEDULED candidate → assert "Mark Interview Passed" button visible
4. Open profile of INTERVIEW_PASSED candidate → assert "Offer Job" button visible
5. Open profile of JOB_OFFERED candidate → assert "Hire" button visible
**Expected Results**: Each stage shows the correct next-action label in the action button area
**Business Rule**: Action button is state-driven and always reflects the next logical step
**Suggested Layer**: E2E

### TC-104: Hired candidate profile is read-only — no further pipeline actions
**Category**: Business Rule
**Preconditions**: Candidate in HIRED status
**Steps**:
1. Open candidate profile
2. Inspect the action area
**Expected Results**: No pipeline action buttons (Shortlist/Interview/Offer/Hire) visible; the profile shows "Hired" status
**Business Rule**: Once HIRED, the candidate record is locked from Recruitment; further changes happen on PIM
**Suggested Layer**: E2E

### TC-105: Notes field is present on pipeline action modals
**Category**: Business Rule
**Preconditions**: Candidate in APPLICATION_INITIATED
**Steps**:
1. Open candidate profile
2. Click "Shortlist" — before confirming, check modal for a notes/comment textarea
**Expected Results**: A text area for notes is visible in the action modal
**Business Rule**: Notes are optional on pipeline transitions; the textarea must be present for auditing purposes
**Suggested Layer**: E2E

### TC-106: Hire dialog shows candidate name for confirmation
**Category**: Business Rule
**Preconditions**: Candidate in JOB_OFFERED
**Steps**:
1. Open candidate profile
2. Click "Hire"
**Expected Results**: The Hire confirmation dialog displays the candidate name as part of the confirmation message, and has a "Hire" (or "Save") confirm button
**Business Rule**: Hire is irreversible — explicit confirmation required with candidate identity visible
**Suggested Layer**: E2E

---

## Security Scenarios (TC-200–299)

### TC-200: ESS user cannot perform pipeline actions on candidate profile
**Category**: Security
**Preconditions**: Logged in as ESS user; candidate exists
**Steps**:
1. Log in as ESS user
2. Navigate directly to `/recruitment/addCandidate/{id}`
**Expected Results**: No Shortlist/Reject/Interview/Offer/Hire action buttons visible; profile may render as read-only or be inaccessible
**Business Rule**: ESS role has no access to Recruitment module actions
**Suggested Layer**: E2E

### TC-201: API pipeline action returns 403 for ESS session
**Category**: Security
**Preconditions**: ESS session active; candidate ID known
**Steps**:
1. PUT `/api/v2/recruitment/candidates/{id}/actions` with `{ action: "SHORTLIST" }` using ESS session
**Expected Results**: HTTP 403 response; candidate status unchanged
**Business Rule**: API enforces role-based access; only Admin/Hiring Manager can advance pipeline
**Suggested Layer**: API

### TC-202: Unauthenticated API pipeline action returns 401
**Category**: Security
**Preconditions**: No active session
**Steps**:
1. PUT `/api/v2/recruitment/candidates/{id}/actions` with no session cookie
**Expected Results**: HTTP 401 Unauthorized
**Business Rule**: All API endpoints require authentication
**Suggested Layer**: API

---

## Negative / Error Scenarios (TC-300–399)

### TC-300: Cannot shortlist a candidate who is already rejected
**Category**: Negative
**Preconditions**: Candidate in REJECTED status
**Steps**:
1. Open candidate profile for rejected candidate
2. Inspect action area
**Expected Results**: No "Shortlist" or positive action buttons visible; profile shows REJECTED status with no way to re-enter pipeline
**Business Rule**: REJECTED is a terminal state — no reverse transitions
**Suggested Layer**: E2E

### TC-301: API action with invalid action name returns 422
**Category**: Negative
**Preconditions**: Admin session; valid candidate ID
**Steps**:
1. PUT `/api/v2/recruitment/candidates/{id}/actions` with `{ action: "INVALID_ACTION" }`
**Expected Results**: HTTP 422 Unprocessable Entity
**Business Rule**: Only valid action enum values are accepted
**Suggested Layer**: API

### TC-302: API action on candidate in wrong state returns error
**Category**: Negative
**Preconditions**: Candidate in APPLICATION_INITIATED (not shortlisted); try SCHEDULE_INTERVIEW
**Steps**:
1. PUT `/api/v2/recruitment/candidates/{id}/actions` with `{ action: "SCHEDULE_INTERVIEW" }`
**Expected Results**: HTTP 4xx error (400 or 422); candidate status unchanged
**Business Rule**: Stage transitions must follow the defined state machine; skipping stages is rejected
**Suggested Layer**: API

---

## Edge Case Scenarios (TC-400–499)

### TC-400: Pipeline action with a long note is accepted
**Category**: Edge Case
**Preconditions**: Candidate in APPLICATION_INITIATED
**Steps**:
1. Open candidate profile
2. Click "Shortlist"
3. Fill in a 250-character note
4. Confirm
**Expected Results**: Transition succeeds; long note is accepted without truncation error
**Business Rule**: Notes field accepts up to 250 characters (textarea validation)
**Suggested Layer**: E2E

### TC-401: Hired candidate appears in PIM employee list with correct name
**Category**: Edge Case
**Preconditions**: Candidate with first name "HirePipeline" and last name "Test" has been HIRED
**Steps**:
1. Navigate to PIM → Employee List
2. Search for "HirePipeline Test"
**Expected Results**: Employee record found with auto-generated Employee ID; name matches candidate's name
**Business Rule**: HIRE auto-creates a PIM Employee using candidate firstName/lastName — bidirectional linking
**Suggested Layer**: E2E

---

## UI State Scenarios (TC-500–599)

### TC-500: Status badge on profile reflects current pipeline stage
**Category**: UI State
**Preconditions**: Candidate in SHORTLISTED status
**Steps**:
1. Open candidate profile
**Expected Results**: Status badge/paragraph clearly shows "Shortlisted"
**Business Rule**: Profile always reflects the current real-time status
**Suggested Layer**: E2E

### TC-501: Action area renders the correct action button(s) for JOB_OFFERED stage
**Category**: UI State
**Preconditions**: Candidate in JOB_OFFERED
**Steps**:
1. Open candidate profile
**Expected Results**: Both "Hire" and "Decline Offer" buttons are visible in the action area
**Business Rule**: JOB_OFFERED has two valid next states; both options must be available simultaneously
**Suggested Layer**: E2E

### TC-502: Interview Scheduled stage shows both Pass and Fail options
**Category**: UI State
**Preconditions**: Candidate in INTERVIEW_SCHEDULED
**Steps**:
1. Open candidate profile
**Expected Results**: Both "Mark Interview Passed" and "Mark Interview Failed" action buttons visible
**Business Rule**: Interview result can be either pass or fail; UI must present both
**Suggested Layer**: E2E
