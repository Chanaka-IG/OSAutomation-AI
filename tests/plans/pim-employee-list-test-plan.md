# Test plan — PIM · Employee List

**Application:** [OrangeHRM OS](https://automationtest-os-kord.orangehrm.com/) (instance used for automation)

**Navigation path:** Home → log in as admin → left sidebar **PIM** → **Employee List** (`/web/index.php/pim/viewEmployeeList`)

**Execution note (frontend):** run Playwright in headed mode when validating UI behaviour:

```bash
BASE_URL=https://automationtest-os-kord.orangehrm.com \
npx playwright test tests/pim/ --config automation.config.ts --headed --project=chromium
```

---

## Legend — test layers

| Layer | Scope (this project) |
|--------|----------------------|
| **Unit** | Pure helpers (e.g. URL builders, ID/name validators, mapping DTO ↔ UI) where implemented; otherwise **N/A**. |
| **API** | OrangeHRM REST v2 under `/web/index.php/api/v2/...` (e.g. PIM employees, employment sub-resources) plus negative HTTP/status handling. |
| **Frontend** | Playwright E2E: navigation, auth gate, table, filters, pagination, dialogs, toasts. |

---

## 1. Positive test cases

### TC-PIM-EL-001 — Employee List loads for authenticated admin

| Field | Details |
|--------|---------|
| **Preconditions** | Valid admin credentials; session not expired; instance reachable at `BASE_URL`. |
| **Test case description** | Open site → **Login** as admin → click **PIM** → open **Employee List**. Verify URL matches employee list route, page shows employee grid/table shell (headers + at least one row or empty state), and no unexpected error banner. |
| **Test layers** | **Unit:** N/A. **API:** Optional GET employee collection matches UI row count when called with same filters (smoke consistency). **Frontend:** Assert URL pattern `viewEmployeeList`, visible table or empty state, no login redirect. |

---

### TC-PIM-EL-002 — Sidebar navigation to Employee List is stable

| Field | Details |
|--------|---------|
| **Preconditions** | Logged in as admin; dashboard loaded. |
| **Test case description** | From another module (e.g. Leave or Admin), use sidebar **PIM** → **Employee List** (or equivalent submenu). Employee List loads without full-page error. |
| **Test layers** | **Unit:** N/A. **API:** N/A. **Frontend:** Multiple navigation paths land on same route and stable layout selectors. |

---

### TC-PIM-EL-003 — Search / filter by Employee Name returns matching rows

| Field | Details |
|--------|---------|
| **Preconditions** | At least one seeded or manual employee exists whose name is known; Employee List visible. |
| **Test case description** | Enter known substring in **Employee Name** (or primary name filter), trigger search. Table shows only matching employees (or empty state if none). Clear filter restores full list behaviour. |
| **Test layers** | **Unit:** Optional normalisation of search string (trim/case) if extracted to helper. **API:** GET/list employees with name query returns IDs consistent with UI rows. **Frontend:** Fill filter, assert row cells contain expected name / assert row count. |

---

### TC-PIM-EL-004 — Search / filter by Employee Id

| Field | Details |
|--------|---------|
| **Preconditions** | Known `employeeId` text exists in system; Employee List visible. |
| **Test case description** | Filter by Employee Id; results match id exactly or per product rules; clearing resets list. |
| **Test layers** | **Unit:** Validate employee id format rules if codified. **API:** Query by employee id returns single/narrow result set. **Frontend:** Filter input, assert matching row(s). |

---

### TC-PIM-EL-005 — Pagination — next / previous preserves filters

| Field | Details |
|--------|---------|
| **Preconditions** | Enough employees that pagination controls appear (~more than page size). |
| **Test case description** | Apply a filter that still yields multiple pages. Move to page 2, then back to page 1. Expect filter values unchanged and rows consistent with API ordering rules. |
| **Test layers** | **Unit:** N/A. **API:** Offset/limit parameters align with UI page index. **Frontend:** Click next/prev; URL or state retains query; row keys differ per page. |

---

### TC-PIM-EL-006 — Open Add Employee from Employee List

| Field | Details |
|--------|---------|
| **Preconditions** | Admin on Employee List; user has permission to add employees. |
| **Test case description** | Click **Add** / **Add Employee**. User lands on add-employee flow with expected route/title and form visible. Cancel/back returns to list without orphan sessions. |
| **Test layers** | **Unit:** N/A. **API:** Optional POST employee smoke in separate suite. **Frontend:** Navigate add flow; assert URL/title/locators; optional cancel path. |

---

### TC-PIM-EL-007 — Row action — open employee record (edit/view)

| Field | Details |
|--------|---------|
| **Preconditions** | At least one row in grid. |
| **Test case description** | Click row or edit icon for an employee. Detail/edit screen opens for same employee (id/name visible). Browser **Back** returns to list. |
| **Test layers** | **Unit:** N/A. **API:** GET single employee by id matches opened record. **Frontend:** Click-through; assert detail route or query params. |

---

## 2. Negative test cases

### TC-PIM-EL-N01 — Unauthenticated access redirects to login

| Field | Details |
|--------|---------|
| **Preconditions** | Clean browser context (no cookies / new context). |
| **Test case description** | Navigate directly to Employee List URL. Application redirects to login; after login, user can reach Employee List (happy path continuation). |
| **Test layers** | **Unit:** N/A. **API:** Unauthorised API calls return 401 (session expired message per product). **Frontend:** `openEmployeeList` without login → login URL (already observed in headed run). |

---

### TC-PIM-EL-N02 — Invalid session / expired session

| Field | Details |
|--------|---------|
| **Preconditions** | Simulate expired session (clear cookies mid-flow or wait for timeout if testable). |
| **Test case description** | User actions on Employee List redirect to login or show session expired; no silent data leak on partial UI. |
| **Test layers** | **Unit:** N/A. **API:** 401 on employee endpoints. **Frontend:** Session expiry handling and safe redirect. |

---

### TC-PIM-EL-N03 — Search with no matches

| Field | Details |
|--------|---------|
| **Preconditions** | Employee List accessible. |
| **Test case description** | Enter filter string guaranteed to match no employee (e.g. random long string). UI shows empty state / “no records” message; no 500 error page. |
| **Test layers** | **Unit:** N/A. **API:** Empty array / zero total with 200 OK. **Frontend:** Assert empty state component/message. |

---

### TC-PIM-EL-N04 — XSS / script injection in search box (smoke)

| Field | Details |
|--------|---------|
| **Preconditions** | Employee List visible; search input present. |
| **Test case description** | Enter benign HTML/script probe string (e.g. `<script>alert(1)</script>`). Value must not execute as script; stored/display reflects escaping rules. |
| **Test layers** | **Unit:** Sanitisation helper tests if introduced. **API:** Server rejects or escapes malicious payloads per policy. **Frontend:** No execution; DOM text-only. |

---

### TC-PIM-EL-N05 — Non-admin role denied (if applicable)

| Field | Details |
|--------|---------|
| **Preconditions** | ESS or custom role without PIM list permission. |
| **Test case description** | Login as restricted user; navigate to Employee List URL. Expect 403/forbidden UI or redirect, not full employee grid. |
| **Test layers** | **Unit:** N/A. **API:** 403 on restricted endpoints. **Frontend:** Route guard / error message. |

---

## 3. Edge test cases

### TC-PIM-EL-E01 — Maximum length / special characters in Employee Name filter

| Field | Details |
|--------|---------|
| **Preconditions** | Employee List visible. |
| **Test case description** | Paste very long string and strings with unicode/special chars. Application remains responsive; no crash; sensible validation or truncation messages. |
| **Test layers** | **Unit:** Length limits on filter helper. **API:** Stable response (400/422 or ignored tail) per contract. **Frontend:** No freeze; controlled input behaviour. |

---

### TC-PIM-EL-E02 — Pagination boundary — first page, last page

| Field | Details |
|--------|---------|
| **Preconditions** | Paginated dataset. |
| **Test case description** | On first page, **Previous** disabled or no-op; on last page, **Next** disabled or no-op; page numbers consistent with total count. |
| **Test layers** | **Unit:** Page index math helper if extracted. **API:** Last page returns remainder rows. **Frontend:** Button disabled states / aria. |

---

### TC-PIM-EL-E03 — Concurrent filter change + search

| Field | Details |
|--------|---------|
| **Preconditions** | Employee List visible; slow network simulated optional. |
| **Test case description** | Change filter twice quickly; final results match last applied filter (no stale-result flash or race showing wrong rows). |
| **Test layers** | **Unit:** N/A. **API:** Idempotent queries. **Frontend:** Debounce / loading indicator; final assertion on stable network idle. |

---

### TC-PIM-EL-E04 — Duplicate Employee Id on Add (API-aligned)

| Field | Details |
|--------|---------|
| **Preconditions** | Known existing `employeeId`; navigate to Add Employee from list. |
| **Test case description** | Attempt add with duplicate **Employee Id**. Expect validation error; record not created; user remains on form with message. |
| **Test layers** | **Unit:** Id uniqueness rule if modelled locally. **API:** POST returns error payload for duplicate id. **Frontend:** Error toast/inline message. |

---

### TC-PIM-EL-E05 — Sort column (if UI exposes sorting)

| Field | Details |
|--------|---------|
| **Preconditions** | Multiple rows; sortable column headers enabled. |
| **Test case description** | Sort by name/id asc/desc; order updates; refresh preserves sort if product supports it. |
| **Test layers** | **Unit:** Comparator for sort keys if client-side. **API:** Sort query params match UI order. **Frontend:** Header clicks + first-row assertions. |

---

## Coverage summary

| Category | Count (this document) |
|-----------|-------------------------|
| Positive | 7 |
| Negative | 5 |
| Edge | 5 |

**Recommended automation priority (frontend headed first):** TC-PIM-EL-N01 (auth gate), TC-PIM-EL-001 (smoke), TC-PIM-EL-003 / EL-004 (filters), TC-PIM-EL-005 (pagination), then API parity checks for the same scenarios.

---

## References

- Target environment: [automationtest-os-kord.orangehrm.com](https://automationtest-os-kord.orangehrm.com/)
- OrangeHRM API documentation (patterns): [OrangeHRM API docs](https://help.orangehrm.com/hc/en-us/articles/900001765703-OrangeHRM-API-Documentation)
