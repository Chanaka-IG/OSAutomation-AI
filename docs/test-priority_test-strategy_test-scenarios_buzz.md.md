# Test Priority: Buzz (E2E scenarios)

> Input: `docs/test-strategy_test-scenarios_buzz.md` (E2E layer only — 38 scenarios
> folded into journeys J1–J9).
> Scenario detail source: `docs/test-scenarios_buzz.md`.
> Consumed by: `/generate-tests` skill.
> Scope note: the 41 API-layer scenarios are **excluded** here per the strategy's layer
> split — this document prioritizes only the E2E test generation order. Journey tags
> (J1–J9) are carried through so generation can build whole journeys in priority order.

## Priority Summary

| Priority | Count | Journeys most affected | Generation guidance |
|----------|-------|------------------------|---------------------|
| P0 | 6 | J1, J7, J8 | Generate first — smoke + security rendering set; release gate |
| P1 | 12 | J1–J6 | Generate second — primary feature paths for all roles |
| P2 | 14 | J1, J2, J5, J9 | Generate third — secondary flows and boundary UX |
| P3 | 6 | J4, J7, J2, J9 | Generate last — cosmetic/load-state polish |
| **Total** | **38** | | |

---

## P0 — Release Blocking (6)

Core business flow, security, or data integrity with no workaround. A failure here
means Buzz is unusable or unsafe to ship.

| ID | Journey | Scenario | Rationale |
|----|---------|----------|-----------|
| TC-001 | J7 | Admin opens Buzz from the main menu; composer + feed render | Gateway smoke test — if the page fails to render, every other Buzz function is dead. Core flow, no workaround. |
| TC-003 | J1 | Create a text (status) post appears at top of feed | The single most-used Buzz action and the seed for every other scenario. Core business flow; a regression blocks the entire feature. |
| TC-015 | J1 | Delete own post removes it permanently from the feed | Destructive core flow with data-integrity stakes: a broken delete either strands unwanted content (compliance risk on a social feed) or silently loses data. No UI workaround. |
| TC-200 | J8 | Unauthenticated access to `/buzz/viewBuzz` redirects to login | Security/authentication boundary. Feed content leaking to anonymous visitors is a release blocker regardless of any other behavior. |
| TC-205 | J8 | Stored XSS payload in post text renders inert in another user's session | Security — stored XSS on a company-wide social feed is the classic worst case (every employee is an execution target). The strategy explicitly keeps this at E2E because only a real DOM proves output encoding. |
| TC-206 | J8 | XSS payloads in comments and reshare text render inert | Same stored-XSS exposure through the two remaining user-supplied text surfaces. Cannot be downgraded: an escape in any one surface compromises all viewers. |

**Contested call — TC-001 at P0 rather than P1**: on its own a landing-page render is a
smoke check, but every J1–J9 journey starts from this page; if it fails nothing else can
even execute. That "blocks everything downstream" property is the P0 definition.

**Contested call — TC-015 at P0 while TC-110 (Admin delete) is P1**: self-delete is the
universal path every user depends on and the only way a user can retract their own
content; Admin moderation delete has the self-delete + API paths as partial workarounds.

---

## P1 — High Business Impact (12)

Primary feature paths and role-critical behavior with high user reach (Buzz ships in
every role's default menu). Failures degrade the feature badly but don't make it
unusable or unsafe.

| ID | Journey | Scenario | Rationale |
|----|---------|----------|-----------|
| TC-002 | J6 | ESS user opens Buzz and can see/compose posts | ESS is the highest-reach role (every employee). Buzz being Admin-only-by-accident would gut the feature's purpose, but Admin coverage (TC-001) already proves the page itself works — hence P1, not P0. |
| TC-004 | J5 | Photo post with one image and caption renders in feed | One of the three primary post types. High reach; text posts (P0) remain a workaround for sharing, so not release-blocking. |
| TC-005 | J5 | Video post with valid YouTube URL renders playable embed | Primary post type with the full validate→preview→post→embed chain. Same workaround logic as photos. |
| TC-007 | J2 | Like a post — icon state + count increment, persists on reload | Likes are the core engagement mechanic and feed the Most Liked tab ordering. Extremely high interaction frequency. |
| TC-009 | J2 | Comment on a post — renders with author, count increments | Second core engagement mechanic; feeds Most Commented ordering. High reach and frequency. |
| TC-013 | J3 | Reshare another user's post with own text; share count increments | Primary feature path (a dedicated post type) with a cross-user data composition (reshare wraps the original). |
| TC-014 | J1 | Edit own post — updated text visible to other users | Primary content-management path. Broken edit forces the delete-and-repost workaround, which loses likes/comments — high impact but recoverable. |
| TC-016 | J4 | Feed tabs order posts correctly (Recent / Most Liked / Most Commented) | The tabs are the feed's primary navigation contract. Wrong ordering silently misleads every viewer; API orderBy coverage doesn't prove the tab wiring. |
| TC-017 | J4 | Infinite scroll appends older posts without duplicates | Primary consumption path — without it only one page of the feed is reachable in the UI. Duplicate-append bugs are a classic regression here. |
| TC-109 | J6 | Non-author ESS sees no Edit option on another user's post | Authorization affordance for the author-only rule. The API guard (TC-203) is the hard enforcement, so this UI check is P1 not P0 — but showing the affordance would invite constant 403 confusion at full-company reach. |
| TC-110 | J6 | Admin deletes an ESS user's post from the UI | The moderation path — the business's only UI mechanism to remove inappropriate content from a company feed. Compliance-adjacent; workaround exists via API, hence P1. |
| TC-507 | J6 | ⋮ menu options differ between own and others' posts (ESS viewer) | Permission-scoped UI (Edit+Delete on own, neither for others as ESS). Complements TC-109/TC-110 to complete the role-affordance matrix. |

**Contested call — TC-016/TC-017 at P1 rather than P2**: tab ordering and paging feel
like "secondary navigation," but they are the only way users consume the feed beyond the
first screen, and the API layer (TC-018/TC-309/TC-409) proves the contract without
proving the UI wiring. Feed consumption is as primary as feed creation.

**Contested call — TC-109/TC-507 at P1 rather than P0 (security)**: the actual security
enforcement lives at the API layer (TC-202/TC-203/TC-204, already assigned there by the
strategy). These E2E checks cover the *affordance* only — a failure is a serious UX/
trust defect, not an exploitable hole, so P1 is correct despite the "security" label.

---

## P2 — Moderate Impact (14)

Secondary flows, boundary behavior on common paths, and interaction states where a
workaround exists or an API-layer test already covers the underlying rule.

| ID | Journey | Scenario | Rationale |
|----|---------|----------|-----------|
| TC-008 | J2 | Unlike a previously liked post — count decrements, persists | The reverse half of the like toggle. Secondary to liking (TC-007, P1); a stuck like is annoying but low-consequence and bypassed by ignoring it. |
| TC-010 | J2 | Like a comment — state + count persist | Engagement on a nested object; much lower traffic than post likes. Duplicate-guard rule already at API (TC-107). |
| TC-011 | J2 | Edit own comment in place, no duplicate | Secondary content management; delete-and-recomment is a full workaround. |
| TC-012 | J2 | Delete own comment — count decrements | Secondary flow; moderate reach. Ownership rule enforced at API (TC-204). |
| TC-308 | J1 | Editing own post to empty text is blocked | Validation UX on the edit path. The non-empty rule is hard-enforced at API (TC-100/TC-300), so this only guards the UI experience — the strategy's "rule down, widget state here" split puts it at P2. |
| TC-402 | J5 | Photo post with exactly 5 photos — gallery renders | Accept-side boundary the strategy deliberately kept at E2E for the 5-image gallery render risk. Boundary on a common path; the reject side (TC-102) is API. |
| TC-404 | J1 | Unicode, emoji, RTL text round-trip intact everywhere | Data-fidelity edge for international content. Piggybacks as J1's post body per the strategy, so it costs nearly nothing — but a failure degrades, not blocks. |
| TC-406 | J9 | Double-click on Post creates exactly one post | Data-integrity edge on the most common action. Duplicates are visible and manually deletable (workaround exists), keeping it out of P0/P1. |
| TC-502 | J9 | Post button disabled↔enabled tracks composer text live | UI half of the mandatory-text rule (subsumes TC-100's widget state). API enforcement (TC-100) is the safety net; this covers only the affordance. |
| TC-503 | J5 | Share Video modal: Share disabled until URL validates, preview shown | Modal state machine gating video posting. The allow-list rules are API-covered (TC-105/TC-207/TC-304); this is the interaction-state layer on top. |
| TC-504 | J5 | Attached photo can be removed in the modal before posting | Secondary composer flow; failure is worked around by cancelling and re-attaching. |
| TC-505 | J2 | Like control reflects liked/unliked state visually incl. after reload | State-correctness with persistence (per-user liked flag from the feed). More than cosmetic — a wrong state misleads on data — but consequence stays moderate. |
| TC-508 | J1 | Delete confirmation — Cancel keeps the post | Guard rail on the destructive flow. The destructive action itself is P0 (TC-015); the cancel branch failing loses one post at a time with an unmistakable symptom. |
| TC-511 | J3 | Reshare card shows both sharer and original author identities | Rendering composition of the reshare payload. Attribution errors mislead readers, but the reshare flow itself (TC-013, P1) still functions. |

**Contested call — TC-406 at P2 rather than P1**: duplicate posts corrupt the feed, which
sounds like data integrity (P0 territory). But the failure is self-evident, self-serviceable
(the author deletes the duplicate), and bounded to one post — "workaround exists, moderate
impact" is the better fit.

**Contested call — TC-508 at P2 rather than P0 despite touching delete**: the P0 risk in
deletion is the destructive action itself (TC-015). A broken Cancel deletes one post the
user was already staring at a delete dialog for — bad, recoverable, and immediately noticed.

---

## P3 — Low Impact (6)

Cosmetic states, load/empty polish, and interaction niceties that are easily bypassed
or conditionally runnable.

| ID | Journey | Scenario | Rationale |
|----|---------|----------|-----------|
| TC-405 | J9 | Multi-line text keeps line breaks; 500-char unbroken string doesn't break layout | Cosmetic/layout robustness. Content remains readable and functional even when the layout degrades. |
| TC-500 | J7 | Empty feed state renders cleanly | Rare state (fresh install / drained tab) and explicitly **conditional** in the strategy — implement behind a `test.skip` guard when the instance can't be drained. |
| TC-501 | J7 | Skeleton loader shows during feed fetch, then disappears | Loading-state polish. Every functional journey already waits out the spinner implicitly, so a stuck loader surfaces in P0/P1 tests anyway. |
| TC-506 | J2 | Comment section collapsed by default, toggles open | Interaction nicety; comments remain fully reachable either way. Easily bypassed. |
| TC-509 | J1 | Success toasts appear for create and delete actions | Feedback cosmetics. The underlying create/delete outcomes are asserted by feed state in TC-003/TC-015 (P0); the toast is the notification layer only. Kept because J1 asserts on toasts anyway per `playwright-best-practices`. |
| TC-510 | J4 | Active tab visually indicated; persists through a like | UI-state persistence nicety. A reset view is re-selected with one click — the definition of easily bypassed. |

**Contested call — TC-509 at P3 despite toasts being the suite's assertion convention**:
the *convention* (assert on toasts) is embedded in every higher-priority journey already;
this scenario only adds the toast-for-its-own-sake check (position, auto-dismiss), which
is cosmetic.

**Contested call — TC-501 at P3 rather than P2 (the §10 loader rule)**: waiting out
`.oxd-loading-spinner` is baked into every journey's wait strategy, so a loader that never
resolves fails TC-001/TC-003 first. The standalone scenario only adds the "appears then
disappears" choreography — polish.

---

## Coverage cross-check

- 38 scenarios prioritized = the strategy's full E2E allocation (J1: 7, J2: 8, J3: 2,
  J4: 3, J5: 5, J6: 4, J7: 3, J8: 3, J9: 3).
- TC-410 (timezone display) is intentionally absent: the strategy assigns it API-first
  with the display assertion deferred to exploratory/manual notes.
- All API-layer scenarios (41) are out of scope for this priority pass; if `/generate-tests`
  covers the API suite too, treat the strategy's API table as implicitly P0/P1 work since
  it carries the validation, authz, and data-integrity contracts.

## Generation order recommendation for `/generate-tests`

Journeys are the test-function unit, so generate by journey in the order of the highest
priority each contains: **J8, J7, J1** (P0 anchors) → **J2, J3, J4, J5, J6** (P1 anchors)
→ **J9** (P2 anchor). Within a journey, all folded scenarios are implemented together
regardless of individual priority — the priority labels drive execution tagging
(`@p0`…`@p3`) and triage order, not journey dismemberment.
