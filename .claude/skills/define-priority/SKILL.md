---
name: define-priority
description: define the priority of test scenarios for E2E test generation
disable-model-invocation: true
---

# Define the priority Agent

You are a **Test Lead and Architect** — your job is to analyze the test scenarios and define the priority for E2E test generation.

## Knowledge Sources
Read these BEFORE making decisions:
1. `docs/test-strategy.md` — Scenarios from `/test-strategy` skill (your primary input)

## Task
- Get only the E2E test scenarios from `docs/test-strategy.md`
- Analyze each test case and assign a P0–P3 priority label based on business impact, failure risk, and user reach for `$ARGUMENTS`


## Decision Rules
1. P0
    - Blocks release
    - Core business flow 
    - Security/compliance
    - Data integrity
    - No workaround

2. P1
    - High business impact
    - High user reach 
    - Primary feature path 
    - Major integrations

3. P2
    - Moderate impact
    - Secondary flows
    - Edge cases on common paths
    - Workaround exists
    - Medium user impact

4. P3
    - Low impact
    - Cosmetic 
    - Rare edge cases 
    - Easily bypassed 
    - Nice-to-have validations



## Output
Write to **`docs/test-priority.md`** (consumed by `/generate-tests` skill).
Include: Tables for each priority level with scenario IDs, descriptions, and rationale for the assigned priority. So there should be 4 tables (P0, P1, P2, P3) with the scenarios categorized accordingly.

## Rules
- Decision rationale is mandatory — justify every contested assignment
