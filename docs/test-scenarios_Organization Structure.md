# Test Scenarios — Organization Structure (Admin → Organization → Structure)

**Feature under test**: `Admin → Organization → Structure` (`/web/index.php/admin/viewCompanyStructure`)
**Source knowledge**: `orangehrm-opensource-domain` skill (business-rules, ui-selectors, api-reference) + verified-live memory `org-structure-subunits`.

## Feature Model (verified-live behaviour)
- Page heading **"Organization Structure"** (h6). Renders a **tree**: a root company node (level 0, name from General Information, e.g. `Automation` on kord) plus sub-units. Each node label is `unitId: name`, or just `name` when unitId is blank.
- **Edit mode** is a header **"Edit" toggle** (`getByRole('checkbox', {name:'Edit'})`). OFF = read-only tree (no Add / action controls). ON = an **"Add"** button at the company root + a per-node **kebab** menu (`.org-action`) with **Delete / Edit / Add** (Add = add a child under that node).
- **Add / Edit dialog** ("Add Organization Unit" / "Edit Organization Unit"): **Unit Id** (optional, max 100), **Name*** (required, max 100), **Description** (optional textarea, placeholder "Type description here"). The Add dialog shows the note "This unit will be added under <parentName>"; the Edit dialog has no note. "* Required", **Cancel**, **Save**.
- **Validation**: empty Name → "Required"; Name or Unit Id > 100 chars → "Should not exceed 100 characters"; **duplicate Name is GLOBAL (not per-sibling)** → inline field error **"Organization unit name should be unique"** (NOT "Already exists"), blocks save client-side (no POST fired).
- **NO success toast** — on save the dialog closes and the tree re-renders. Assert via the new/updated node text, never a toast.
- **Delete** uses the standard "Are you Sure?" dialog ("No, Cancel" / "Yes, Delete") and **cascades to all descendants**. The root company node cannot be deleted (Add-only, no kebab).
- **API** `/api/v2/admin/subunits`: GET `?mode=tree` → nested `{id,unitId,name,level,children[]}`; GET (no params) → flat list; POST `{unitId,name,description,parentId}` (parentId 1 = root); PUT `/{id}` `{unitId,name,description}`; DELETE `/{id}` — **single id in the path, NOT bulk `{ids}`**.
- **Known app bug (verified live 2026-06-11)**: editing a unit that has **no description** makes the UI send `description: null` → `422 {invalidParamKeys:["description"]}`; the edit fails **silently** (no toast, dialog stays open, change lost). Editing the same unit after typing any description string → 200.
- **Security**: ESS / unauthorised users hitting `/admin/viewCompanyStructure` get the "Credential Required" page; Admin module absent from their side nav.

---

## Happy Path (TC-001–099)

### TC-001: View the organization structure tree as Admin
**Category**: Happy Path
**Preconditions**: Admin logged in; at least one sub-unit seeded.
**Steps**:
1. Navigate to `/admin/viewCompanyStructure`.
2. Observe the page heading and tree.
**Expected Results**: Heading "Organization Structure" visible; root company node rendered at level 0; seeded sub-units rendered beneath it.
**Business Rule**: Page renders a tree with a root company node + sub-units.
**Suggested Layer**: E2E

### TC-002: Enable Edit mode reveals Add + per-node action controls
**Category**: Happy Path
**Preconditions**: Admin on the structure page.
**Steps**:
1. Toggle the "Edit" checkbox ON.
**Expected Results**: An "Add" button appears at the company root; each node shows a kebab action button. Toggling OFF hides them again (read-only).
**Business Rule**: Edit toggle gates all mutating controls.
**Suggested Layer**: E2E

### TC-003: Add a top-level sub-unit under the company root
**Category**: Happy Path
**Preconditions**: Admin on the structure page, Edit mode ON.
**Steps**:
1. Click the root "Add" button.
2. In "Add Organization Unit", fill Unit Id, Name (unique), Description.
3. Click Save.
**Expected Results**: Dialog closes (no toast); the new node appears under the root with label `unitId: name`; a `POST /api/v2/admin/subunits` with `parentId:1` returned 2xx.
**Business Rule**: Add creates a sub-unit under the company root; success has no toast — assert via tree node.
**Suggested Layer**: E2E

### TC-004: Add a child sub-unit under an existing sub-unit
**Category**: Happy Path
**Preconditions**: Admin, Edit mode ON, a parent sub-unit exists.
**Steps**:
1. Open the parent node's kebab → "Add".
2. Confirm the note reads "This unit will be added under <parentName>".
3. Fill Name (unique) + Description, Save.
**Expected Results**: The child node nests under the chosen parent; `POST` carries the parent's id as `parentId`.
**Business Rule**: Add-under-node nests a child; the note reflects the parent.
**Suggested Layer**: E2E

### TC-005: Edit an existing sub-unit's name (with a description present)
**Category**: Happy Path
**Preconditions**: Admin, Edit mode ON, a sub-unit that HAS a non-empty description.
**Steps**:
1. Open the node's kebab → "Edit".
2. Change the Name; leave the (non-empty) Description as is.
3. Save.
**Expected Results**: Dialog closes; node text updates to the new name; `PUT /api/v2/admin/subunits/{id}` returned 200.
**Business Rule**: Edit updates the unit; success has no toast.
**Suggested Layer**: E2E

### TC-006: Delete a leaf sub-unit
**Category**: Happy Path
**Preconditions**: Admin, Edit mode ON, a leaf sub-unit (no children) exists.
**Steps**:
1. Open the node's kebab → "Delete".
2. Confirm "Yes, Delete".
**Expected Results**: "Are you Sure?" dialog shown; after confirm the node disappears; `DELETE /api/v2/admin/subunits/{id}` returned 2xx.
**Business Rule**: Delete removes the unit via the standard confirm dialog.
**Suggested Layer**: E2E

### TC-007: Add with only the required Name (Unit Id + Description blank)
**Category**: Happy Path
**Preconditions**: Admin, Edit mode ON.
**Steps**:
1. Root Add → fill Name only → Save.
**Expected Results**: Node created and rendered with just the name (no `unitId:` prefix). Note: a unit created without a description triggers the edit bug later (see TC-301).
**Business Rule**: Unit Id and Description are optional; Name is the only required field.
**Suggested Layer**: E2E

---

## Business Rules (TC-100–199)

### TC-100: Duplicate name is rejected GLOBALLY, not just among siblings
**Category**: Business Rule
**Preconditions**: Admin, Edit mode ON, a sub-unit named `X` exists somewhere in the tree.
**Steps**:
1. Add a NEW unit under a DIFFERENT parent with Name = `X`.
**Expected Results**: Inline field error "Organization unit name should be unique"; save blocked client-side; **no POST fired**; tree unchanged.
**Business Rule**: Sub-unit name uniqueness is global across the whole tree.
**Suggested Layer**: E2E (rule) + API (contract)

### TC-101: Empty Name blocks save
**Category**: Business Rule
**Preconditions**: Admin, Add dialog open.
**Steps**:
1. Leave Name blank → Save.
**Expected Results**: "Required" under Name; dialog stays open; no node added.
**Business Rule**: Name is mandatory.
**Suggested Layer**: E2E

### TC-102: Delete cascades to all descendants
**Category**: Business Rule
**Preconditions**: Admin, Edit mode ON, a parent sub-unit with at least one child.
**Steps**:
1. Delete the parent → confirm "Yes, Delete".
**Expected Results**: Parent AND all descendant nodes are removed from the tree; child ids no longer present via API.
**Business Rule**: Delete cascades to all descendants.
**Suggested Layer**: E2E

### TC-103: Root company node cannot be deleted
**Category**: Business Rule
**Preconditions**: Admin, Edit mode ON.
**Steps**:
1. Inspect the root company node's controls.
**Expected Results**: Root exposes only "Add" (no kebab / Delete option).
**Business Rule**: The company root is add-only and cannot be deleted.
**Suggested Layer**: E2E

### TC-104: API POST creates a sub-unit (contract)
**Category**: Business Rule
**Preconditions**: Admin session/CSRF.
**Steps**:
1. `POST /api/v2/admin/subunits` `{unitId,name,description,parentId:1}`.
**Expected Results**: 2xx; response data carries the new id; `GET ?mode=tree` shows it nested under the root.
**Business Rule**: POST contract for sub-unit creation.
**Suggested Layer**: API

### TC-105: API DELETE uses a single id in the path (not bulk ids)
**Category**: Business Rule
**Preconditions**: A sub-unit id exists.
**Steps**:
1. `DELETE /api/v2/admin/subunits/{id}`.
**Expected Results**: 2xx; the unit (and descendants) gone from the tree. (Differs from job-titles/employment-statuses bulk `{ids}` shape.)
**Business Rule**: Subunit DELETE is single-id path-based.
**Suggested Layer**: API

---

## Security (TC-200–299)

### TC-200: ESS user cannot access the Organization Structure page
**Category**: Security
**Preconditions**: ESS user credentials.
**Steps**:
1. Log in as ESS.
2. Confirm "Admin" is absent from the side menu.
3. Deep-link to `/admin/viewCompanyStructure`.
**Expected Results**: "Credential Required" page; no tree, no Add button, no Edit toggle rendered.
**Business Rule**: Organization Structure is Admin-only.
**Suggested Layer**: E2E

### TC-201: ESS session cannot mutate sub-units via the API
**Category**: Security
**Preconditions**: ESS session cookie/token.
**Steps**:
1. `POST /api/v2/admin/subunits` with the ESS session.
**Expected Results**: 403 Unauthorized; no sub-unit created.
**Business Rule**: Cross-role data-group permission blocks ESS writes.
**Suggested Layer**: API

### TC-202: Name field stores script payload inert (no stored XSS)
**Category**: Security
**Preconditions**: Admin, Edit mode ON.
**Steps**:
1. Add a unit with Name = `<script>alert('xss')</script> OU <ts>`.
**Expected Results**: Payload stored/rendered as literal text in the tree node; no dialog fires; no inline `<script>` executes.
**Business Rule**: Input is escaped on render (defensive).
**Suggested Layer**: E2E

---

## Negative / Error (TC-300–399)

### TC-300: Duplicate name typed into the Add dialog shows the unique-name error
**Category**: Negative
**Preconditions**: Admin, Add dialog open, an existing unit name known.
**Steps**:
1. Type the existing name into Name.
**Expected Results**: "Organization unit name should be unique" appears; Save is blocked; no POST.
**Business Rule**: Duplicate-name guard (negative path of TC-100).
**Suggested Layer**: E2E

### TC-301: Editing a description-less unit fails silently (KNOWN APP BUG)
**Category**: Negative
**Preconditions**: Admin, Edit mode ON, a sub-unit created WITHOUT a description.
**Steps**:
1. Open the unit's Edit dialog; change the Name; leave Description empty; Save.
**Expected Results (documented bug)**: UI sends `description:null` → `422 {invalidParamKeys:["description"]}`; dialog stays open, no toast, change lost. The same edit succeeds once any Description text is added.
**Business Rule**: Documented defect — a description-less unit cannot be renamed via UI until a description is supplied. **Report, don't silently adapt.**
**Suggested Layer**: E2E (regression guard) + API (root-cause: null description → 422)

### TC-302: Cancel on the Add dialog discards input
**Category**: Negative
**Preconditions**: Admin, Add dialog open with fields filled.
**Steps**:
1. Click Cancel.
**Expected Results**: Dialog closes; no node added; tree unchanged.
**Business Rule**: Cancel is non-destructive.
**Suggested Layer**: E2E

### TC-303: "No, Cancel" on the delete dialog keeps the unit
**Category**: Negative
**Preconditions**: Admin, Edit mode ON, delete dialog open for a node.
**Steps**:
1. Click "No, Cancel".
**Expected Results**: Dialog closes; the node remains in the tree.
**Business Rule**: Delete is opt-in; cancelling is safe.
**Suggested Layer**: E2E

### TC-304: API rejects creating a sub-unit with a missing/blank name
**Category**: Negative
**Preconditions**: Admin session.
**Steps**:
1. `POST /api/v2/admin/subunits` `{name:"", parentId:1}`.
**Expected Results**: 422 Invalid Parameter; `data.name = "Required"`; nothing created.
**Business Rule**: Backend enforces the required-name rule.
**Suggested Layer**: API

---

## Edge Cases (TC-400–499)

### TC-400: Name at the 100-char boundary is accepted
**Category**: Edge Case
**Preconditions**: Admin, Add dialog open.
**Steps**:
1. Enter a 100-char Name → Save.
**Expected Results**: Saved; node rendered with the full 100-char name.
**Business Rule**: Name max length = 100 (inclusive).
**Suggested Layer**: E2E

### TC-401: Name at 101 chars shows the length error
**Category**: Edge Case
**Preconditions**: Admin, Add dialog open.
**Steps**:
1. Enter a 101-char Name.
**Expected Results**: "Should not exceed 100 characters"; save blocked.
**Business Rule**: Name max length boundary (exclusive at 101).
**Suggested Layer**: E2E

### TC-402: Unit Id at 101 chars shows the length error
**Category**: Edge Case
**Preconditions**: Admin, Add dialog open.
**Steps**:
1. Enter a 101-char Unit Id, a valid Name.
**Expected Results**: "Should not exceed 100 characters" on Unit Id; save blocked.
**Business Rule**: Unit Id max length = 100.
**Suggested Layer**: E2E

### TC-403: Whitespace-only Name is treated as empty
**Category**: Edge Case
**Preconditions**: Admin, Add dialog open.
**Steps**:
1. Enter spaces only in Name → Save.
**Expected Results**: "Required" (or save blocked); no node created.
**Business Rule**: Trimmed name must be non-empty.
**Suggested Layer**: E2E

### TC-404: Two units with the same Unit Id but different names are allowed
**Category**: Edge Case
**Preconditions**: Admin, Edit mode ON.
**Steps**:
1. Create unit A `{unitId:'DUP', name:'A '+ts}`.
2. Create unit B `{unitId:'DUP', name:'B '+ts}`.
**Expected Results**: Both created — only Name (not Unit Id) is the uniqueness key.
**Business Rule**: Uniqueness is on Name, not Unit Id.
**Suggested Layer**: API (cheap to assert the contract)

---

## UI State (TC-500–599)

### TC-500: With Edit OFF the tree is read-only
**Category**: UI State
**Preconditions**: Admin on the structure page, Edit toggle OFF.
**Steps**:
1. Inspect the page.
**Expected Results**: No Add button, no kebab action buttons; nodes are display-only.
**Business Rule**: Read-only is the default; mutation requires Edit ON.
**Suggested Layer**: E2E

### TC-501: Add dialog shows the contextual parent note
**Category**: UI State
**Preconditions**: Admin, Edit mode ON.
**Steps**:
1. Open root Add — note references the company root.
2. Open a sub-unit's "Add" — note reads "This unit will be added under <thatUnit>".
**Expected Results**: The note text reflects the selected parent; the Edit dialog shows no such note.
**Business Rule**: The Add dialog communicates the insertion parent.
**Suggested Layer**: E2E

### TC-502: Edit dialog pre-fills existing values
**Category**: UI State
**Preconditions**: Admin, Edit mode ON, a unit with known Unit Id/Name/Description.
**Steps**:
1. Open the unit's Edit dialog.
**Expected Results**: Unit Id, Name, Description inputs are pre-populated with the stored values; heading reads "Edit Organization Unit".
**Business Rule**: Edit loads current state.
**Suggested Layer**: E2E

### TC-503: Length error clears once Name is shortened back under the limit
**Category**: UI State
**Preconditions**: Admin, Add dialog open with a 101-char name showing the error.
**Steps**:
1. Shorten the Name to a valid length.
**Expected Results**: The "Should not exceed 100 characters" message disappears.
**Business Rule**: Live validation clears when input becomes valid.
**Suggested Layer**: E2E
