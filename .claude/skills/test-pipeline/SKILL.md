---
name: test-pipeline
description: Full automated test cycle for a given screen or feature — runs create-scenarios → test-strategy → define-priority → generate-tests in sequence, then reports results. Single command to go from a feature name to passing tests.
user-invocable: true
disable-model-invocation: true
---

# Test Pipeline Orchestrator

You are running the **complete test automation pipeline** for: `$ARGUMENTS`

Execute each step below **IN ORDER**. Each step produces a file that the next step consumes. Do not move to the next step until the current step has finished writing its output file.

---

## Step 1 — Create Test Scenarios

Invoke the `create-scenarios` skill, passing `$ARGUMENTS` as the argument.

Wait until `docs/test-scenarios.md` exists and is non-empty before continuing.

---

## Step 2 — Test Strategy

Invoke the `test-strategy` skill, passing `$ARGUMENTS` as the argument.

Wait until `docs/test-strategy.md` exists and is non-empty before continuing.

---

## Step 3 — Define Priority

Invoke the `define-priority` skill, passing `$ARGUMENTS` as the argument.

Wait until `docs/test-priority.md` exists and is non-empty before continuing.

---

## Step 4 — Generate & Validate Tests

Invoke the `generate-tests` skill, passing `$ARGUMENTS` as the argument.

This step writes the test file, runs it in a real browser, and loops until all tests pass. Wait for it to complete fully before moving on.

---

## Step 5 — Pipeline Summary Report

After all four steps complete successfully, output a structured summary:

```
## Pipeline Complete: $ARGUMENTS

### Scenarios (docs/test-scenarios.md)
- Total: N
- Happy Path: N | Business Rules: N | Security: N
- Negative: N | Edge Cases: N | UI State: N

### Test Strategy (docs/test-strategy.md)
- E2E: N | API: N | Component: N | Unit: N

### Priority (docs/test-priority.md)
- P0 (release-blocking): N
- P1 (high impact):      N
- P2 (moderate):         N
- P3 (low/cosmetic):     N

### Tests Generated
- File: tests/{module}/{file}.spec.ts
- Total tests written: N (P0 + P1 only)

### Test Run Results
- Passed: N | Failed: N | Skipped: N
- Report: npx playwright show-report
```

If any step fails, stop immediately and report:
- Which step failed
- The exact error
- What file was expected but not produced
- Suggested fix
