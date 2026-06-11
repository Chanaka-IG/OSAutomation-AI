# Test Strategy — Organization Structure (Admin → Organization → Structure)

**Input**: `docs/test-scenarios_Organization Structure.md` (30 scenarios)
**Backend**: `orangehrmAdminPlugin` — `Api/SubunitApi` family over `/api/v2/admin/subunits` (POST/PUT, GET `?mode=tree`, DELETE `/{id}`); service `CompanyStructureService` / `SubunitService`. Frontend: `orangehrmAdminPlugin` Vue view `viewCompanyStructure` (jstree-like tree + OXD dialog).
**Standards**: `playwright-best-practices`, `automation-framework`.

## Distribution

| Layer | Count | Focus | Est. time |
|-------|-------|-------|-----------|
| **E2E** | 19 | Tree render, Edit-mode gating, Add/Edit/Delete dialogs, no-toast assertions, cascade delete, the silent description-null edit bug, ESS page lockout, stored-XSS render | ~6–8 min |
| **API** | 7 | POST/DELETE contracts, global-name-uniqueness, required-name 422, ESS 403, unit-id-not-unique, the description-null 422 root cause | ~30 s |
| **Component** | 0 | — (no isolated OXD component contract worth a component harness here) | — |
| **Unit** | 0 | — (no pure functions exposed to this framework; backend PHP units are out of scope) | — |

Pyramid note: this feature is inherently a **full-stack tree UI** — most rules only manifest in the rendered tree + dialog, so E2E is justifiably heavy. Backend contracts (uniqueness, required-name, the null-description 422, ESS authorization) are pushed DOWN to fast API tests for defense-in-depth.

## Layer Assignments

### E2E (`tests/admin/organization-structure.spec.ts`)
| ID | Scenario | Why E2E |
|----|----------|---------|
| TC-001 | View tree as Admin | Multi-node render only verifiable in the browser |
| TC-002 | Edit toggle reveals controls | Conditional UI state |
| TC-003 | Add top-level sub-unit | Full dialog→tree journey, no-toast assert |
| TC-004 | Add child under a node | Nesting + parent note |
| TC-005 | Edit name (with description) | Dialog→tree update |
| TC-006 | Delete a leaf | Confirm dialog→tree removal |
| TC-007 | Add with Name only | Optional-field path |
| TC-100 | Duplicate name global guard | Inline error rendered client-side (no POST) — UI-only behaviour |
| TC-101 | Empty name blocks save | Inline "Required" |
| TC-102 | Delete cascades | Tree-wide removal visible only in UI |
| TC-103 | Root cannot be deleted | Absence of kebab on root |
| TC-202 | Stored-XSS inert render | Render-time escaping |
| TC-300 | Duplicate name error in dialog | Inline validation |
| TC-301 | **Silent description-null edit bug** | Regression guard at the UI layer (the bug *is* a UI behaviour) |
| TC-302 | Cancel discards add | Dialog state |
| TC-303 | "No, Cancel" keeps unit | Dialog state |
| TC-401 | Name 101 chars → length error | Inline validation |
| TC-500 | Edit OFF = read-only | Conditional UI |
| TC-501 | Add dialog parent note | Contextual UI text |

(TC-400 / TC-402 / TC-403 / TC-502 / TC-503 are covered E2E only if the P0/P1 budget allows — see priority doc; otherwise folded or deferred.)

### API (`tests/api/organization-structure.spec.ts` — if budget allows; otherwise asserted inline via SubunitsApi in the E2E suite hooks)
| ID | Scenario | Why API |
|----|----------|---------|
| TC-104 | POST creates sub-unit | Pure contract |
| TC-105 | DELETE single-id path | Contract shape (differs from bulk) |
| TC-201 | ESS POST → 403 | Authorization at the API boundary — must NOT be tested through the UI |
| TC-304 | Blank name → 422 Required | Backend validation contract |
| TC-404 | Same Unit Id, diff Name allowed | Cheap contract assertion |
| TC-100 (defense-in-depth) | Global uniqueness → 422 | Backend rule mirror of the UI guard |
| TC-301 (root cause) | `description:null` → 422 invalidParamKeys | Confirms the bug is a payload contract issue |

## Decision Rationale (contested assignments)

- **TC-100 duplicate-name → E2E primary, API secondary.** The user-visible guard is *client-side* (error shown, no POST fired), so the customer-facing behaviour lives in E2E. The backend 422 is mirrored at API for defense-in-depth, since the UI guard alone could regress to firing a POST.
- **TC-201 ESS authorization → API only, NOT E2E.** Best-practice: authorization/error-code checks belong at the API layer. TC-200 already covers the *UI* lockout (no menu, Credential Required page); duplicating the 403 through a browser would be an ice-cream-cone anti-pattern.
- **TC-301 silent edit bug → both layers.** The *symptom* (dialog stays open, change lost, no toast) is UI and belongs in E2E as a regression guard. The *root cause* (`description:null` → 422) is a payload contract best pinned at API so we know exactly when the backend starts accepting null. Per generate-tests rules, this is a **potential app bug** — the test documents/asserts the current (buggy) behaviour and the report flags it; it must not be silently "fixed" by sending a dummy description.
- **TC-105 / TC-104 DELETE/POST → API.** Pure request/response contracts; the single-id-in-path DELETE shape is the kind of thing that silently breaks and is invisible from the UI.

## Anti-Patterns Found in Existing Tests
- None specific to Organization Structure (no prior suite). The sibling `add-employment-status.spec.ts` correctly seeds via API in hooks and asserts toasts in-test — **but Organization Structure has NO success toast**, so any copied `waitForSuccessToast()` would hang. New suite must assert via tree-node text instead. This is the single biggest porting hazard to flag for the generator.
