# Test Strategy — Directory Module

> Input: `docs/test-scenarios_Directory.md` (33 scenarios)
> Framework reality: this repo is a **black-box automation suite** against a deployed OrangeHRM instance (`tests/` = Playwright E2E per module + `tests/api/` = API project, `src/api/orangehrmOSAPI/*` request helpers). There is no access to app source for true Unit/Component tests — scenarios that would ideally sit at Unit/Component are pushed to **API** when they are server-side contracts, or to **E2E** when they are Vue rendering behavior. This is noted per assignment below.

## Distribution

| Layer | Count | Focus | Est. runtime |
|-------|-------|-------|--------------|
| API | 9 | filter param contracts, error codes, read-only enforcement, terminated-employee rule, field projection | ~10s total (single session reuse) |
| E2E | 20 | filter UX, hint autocomplete, card grid, detail sidebar, role access, validation surfaces | ~2–4 min (serial, 1 worker) |
| Component | 0 | n/a — OXD components not importable in this repo | — |
| Unit | 0 | n/a — no app source | — |
| Deferred/absorbed | 4 | TC-100, TC-501, TC-503, TC-402-UI absorbed into other tests (see notes) | — |

E2E is heavier than a classic pyramid because the Directory module is almost entirely a UI read-view over one GET endpoint — the interesting risk is in the Vue grid/sidebar/autocomplete behavior, which only exists at E2E. All pure contract checks are pushed down to API.

## Layer Assignments

### API layer (`tests/api/directory.spec.ts` — project `api`)
| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-005 | Combined filters intersect | Pure query-param contract (`empNumber`+`jobTitleId`+`locationId` AND-combine); E2E adds nothing but runtime |
| TC-104 | Terminated employees excluded | Needs create→terminate→query lifecycle; fast and destructive-safe only via API with disposable employee |
| TC-107 | Directory-safe field projection | Response-shape assertion — API only |
| TC-201 | Unauthenticated → 401 | Auth contract; **anti-pattern to test at E2E** |
| TC-203 | POST/PUT → 405 read-only | Method contract; API only |
| TC-302 | List `empNumber=999999` → 422 | Error-code contract; **anti-pattern at E2E** |
| TC-303 | Detail `9999?model=detailed` → 422 | Error-code contract |
| TC-304 (API half) | `?nameOrId=` no match → empty `data` | Contract; the dropdown rendering half stays E2E |
| TC-402 | `limit=14` default paging + `meta.total` | Param contract; UI pagination needs >14 employees — assert contract at API, skip UI half unless data volume exists |

### E2E layer (`tests/directory/directory.spec.ts` — project `chromium`)
| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Landing page lists all employees | Critical render path — count + cards vs API truth |
| TC-002 | Search via hint selection (+ absorbs TC-100 singular grammar) | Full autocomplete→select→search journey; only exists in UI |
| TC-003 | Job Title filter match | Requires seeded job details; verifies dropdown→query→grid wiring |
| TC-004 | Location filter match | Same wiring for location |
| TC-006 | Card click → detail panel w/ work email | Sidebar behavior only exists in UI |
| TC-007 | Reset restores defaults | UI state restoration |
| TC-008 | Back arrow closes panel | Sidebar toggle |
| TC-101 | Hints show matching employees | Autocomplete UX |
| TC-102 | Job Title options match Admin config | Dropdown contents (UI render of config data) |
| TC-103 | Location options match Admin config | Dropdown contents |
| TC-105 | Card hides null subtitle/body | Conditional render — would be Component if importable; only E2E available |
| TC-106 | Contact rows only for populated fields | Conditional render |
| TC-200 | Unauthed page → login redirect | Routing guard — one cheap E2E |
| TC-202 | ESS sees full directory (+ absorbs TC-503 ESS menu item) | Role-based journey |
| TC-300 | Unselected free text → "Invalid" | Client-side validation surface (no API equivalent — request never fires) |
| TC-301 | No-match search → "No Records Found" | Empty-state render |
| TC-304 (UI half) | Hints dropdown "No Records Found" | Empty-hint render |
| TC-401 | Full name = First Middle Last | Card text render |
| TC-403 | Case-insensitive hint | Cheap add-on to TC-101 |
| TC-404 | Empty-filter Search reloads full list | UI behavior |
| TC-500 | Default state | Cheap first assertion of the suite |
| TC-502 | Panel switches between cards | Sidebar state |

### Absorbed / deferred
- **TC-100** → asserted inside TC-002 (`(1) Record Found`) and TC-001 (`(N) Records Found`) — not a standalone test.
- **TC-501** (transient "Searching....") → flaky-by-design; assert final hint options only (inside TC-101). Loading-state assertion deferred.
- **TC-503** (menu item per role) → absorbed into TC-202 (ESS) and TC-001 (admin nav already exercised by fixtures).
- **TC-402 UI pagination** → deferred unless env has >14 employees; API half kept.

## Contested decisions
1. **TC-300 at E2E, not API**: the "Invalid" rule is purely client-side — no request is fired when text isn't a selected hint, so there is no API surface to test. E2E is the *lowest* layer that can observe it.
2. **TC-005 at API, not E2E**: combined-filter intersection is parameter algebra. The UI wiring of each individual filter is already covered by TC-002/003/004; repeating the 3-way combination through the UI would be redundant E2E (ice-cream-cone smell).
3. **TC-105/106 at E2E**: ideal Component tests (null-prop hiding), but OXD/Vue components are not importable in this black-box repo — E2E is the only available layer. Flagged, not fixable here.
4. **TC-104 at API**: terminating a UI-visible seeded employee would poison other suites; API lifecycle with a disposable employee is safe and 10× faster.

## Anti-patterns found in existing tests (spot check)
- `tests/api/pim-employees.spec.ts` exists and correctly keeps PIM CRUD contracts at API — pattern to follow.
- Several module suites assert error codes via UI toasts where an API assertion would do; the Directory plan avoids importing that pattern (all 4xx/405 checks at API).

## Seeding plan (consumed by generate-tests)
- Use existing helpers: `EmployeesApi` (create disposable employee), `JobTitlesApi` / `LocationsApi` (resolve seeded ids by name — never hardcode ids).
- Assign job details to the **disposable** employee via `PUT /api/v2/pim/employees/{empNumber}/job-details` (extend `EmployeesApi` if no helper exists).
- Clean up disposable employees in `afterAll` via `DELETE /api/v2/pim/employees`.
- Do not mutate the 5 seeded employees (Ruwan/Marcus/Joshua/Peter/Elena) — other suites depend on them.
