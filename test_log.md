# Wannabe Test Log (Append-Only)

## Purpose
This file is the canonical, append-only record of validation checks/acceptance tests performed by the agent and the user. Must be used following instructions in `AGENTS.md`. Do not log PASSing agent-owned checks. Append an entry only in case of escalated agent-owned FAILs, and for all PASS/FAIL feedbacks from user-owned tests.

---

## Entry template
- Date: YYYY-MM-DD.
- Test ID: prefixed by "T-", incremented by 1 per entry.
- Milestone/task reference: reference point to the concerned milestone/task gate.
- Scenario: briefly describe validation scenario.
- Expected behavior: briefly describe expected behavior.
- Observed behavior: briefly describe observed behavior. If the test is a PASS, simply state observed behavior matches expected behavior.
- Result: `PASS` or `FAIL`
- User feedback: use this field only if the user provides additonal comments beyond observed behavior descriptions.

---
