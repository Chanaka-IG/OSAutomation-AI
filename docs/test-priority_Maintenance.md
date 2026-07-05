# Test Priority — Maintenance

**Input:** `docs/test-strategy_Maintenance.md` (E2E scenarios only, per skill scope)
**Scope:** E2E scenarios for the Maintenance module, prioritised P0–P3 by business impact, failure risk, and user reach.

The Maintenance module has two high-stakes responsibilities: an **admin re-authentication gate** protecting critical functions, and **irreversible/sensitive data operations** (permanent purge, GDPR personal-data export). Anything that (a) lets an unauthorised user in, (b) lets the gate be bypassed, or (c) breaks the purge/export happy path is release-blocking.

---

## P0 — Release-blocking

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-001 | Unlock module with correct password | Entry point to the entire module; if it fails, nothing in Maintenance is usable. Core flow, no workaround. |
| TC-002 | Purge a terminated employee (happy path) | The module's primary destructive function. Data-integrity + GDPR compliance; must work exactly. |
| TC-004 | Download personal data (Access Records) | GDPR data-access obligation; core happy path for the second sub-feature. |
| TC-102 | Correct vs wrong password (grant/deny) | Security boundary of a critical-function gate. |
| TC-200 | ESS has no menu / URL blocked | Authorization: a non-admin must never reach purge/export. Compliance + data integrity. |
| TC-203 | Gate protects direct deep-links | Bypassing the gate would expose destructive actions without re-auth. Security. |
| TC-301 | Wrong password → "Invalid credentials" | Negative half of the security boundary; must deny cleanly. |

## P1 — High impact

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-100 | Purge lists only past employees | Prevents accidentally purging an *active* employee — high data-integrity impact; primary UI safeguard. |
| TC-103 | Gate re-prompts on every entry | Defence-in-depth of the re-auth model; high security relevance, but a stale session is the only failure mode. |
| TC-202 | ESS blocked on Access Records URL | Authorization on the export sub-feature; high reach across roles. |
| TC-305 | Cancel on Purge confirmation aborts | Guards against irreversible mistakes; the confirm step is the last safety net. |
| TC-003 | Selected Employee panel shows correct identity | Ensures the admin purges the *intended* person; wrong-target risk. |
| TC-101 | Access lists current + past | Primary-path correctness for export selection. |

## P2 — Moderate

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-006 | Cancel on gate leaves module | Secondary navigation; low blast radius. |
| TC-007 | Tab switching Purge/Access | Navigation convenience; workaround = reload. |
| TC-105 | Username field fixed to admin | Reinforces re-auth identity; minor if the password check still holds. |
| TC-300 | Empty password rejected | Validation; overlaps with wrong-password denial. |
| TC-302 | Search with nothing selected blocked | Form validation on a common path. |
| TC-501 | Purge confirmation dialog content | Copy/label check on an important dialog. |

## P3 — Low / cosmetic

| ID | Scenario | Rationale |
|----|----------|-----------|
| TC-005 | Access panel shows Download affordance | Largely covered by TC-004. |
| TC-104 | Purge anonymizes (UI half) | Backend guarantee; API layer owns the hard assertion. |
| TC-303 | Free-typed invalid name rejected | Rare edge; autocomplete already constrains selection. |
| TC-304 | "No Records Found" in purge autocomplete | Empty-state cosmetic. |
| TC-500/502/503/504/505 | Gate copy, read-only fields, alert clear, default landing, empty option | Cosmetic/state polish; fold into higher-priority flows. |

---

## Notes on contested calls
- **TC-301 placed P0** (not P2 with other negatives): it is the *deny* side of the security boundary — a gate that accepts wrong passwords is as bad as one that blocks right ones.
- **TC-100 placed P1, not P0**: the server also enforces `onlyPast` (API TC-204), so the UI filter is a safeguard, not the sole guarantee — high impact but not the last line of defence.
- **TC-104 dropped to P3 for E2E**: the meaningful assertion (record truly gone, 422) lives at the API layer; the E2E half is a weak echo.
- **TC-305 kept P1**: cancelling a *permanent* purge is a genuine safety mechanism, above ordinary form validation.
