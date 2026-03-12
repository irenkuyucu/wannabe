# Wannabe Test Log (Append-Only)

## Purpose
This file is the canonical, append-only record of validation checks/acceptance tests performed by the agent and the user. Must be used following instructions in `AGENTS.md`. Do not log PASSing agent-owned checks. Append an entry only in case of escalated agent-owned FAILs, and for all PASS/FAIL feedbacks from user-owned tests.

---

## Entry template
- Date: YYYY-MM-DD
- Test ID: prefixed by "TEST-", incremented by 1 per entry
- Milestone/task reference: reference point to the concerned milestone/task gate
- Scenario: briefly describe validation scenario.
- Expected behavior: briefly describe expected behavior.
- Observed behavior: briefly describe observed behavior. If the test is a PASS, simply state observed behavior matches expected behavior.
- Result: `PASS` or `FAIL`
- User feedback: use this field only if the user provides additonal comments beyond observed behavior descriptions.

---

- Date: 2026-03-03
- Test ID: TEST-001
- Milestone/task reference: M2-T1 gate
- Scenario: User-owned prompt content validation of the 50-item seed set (tone/safety, identity-role format fit, variety, and product-fit acceptability).
- Expected behavior: Prompt seed is playful/socially acceptable, conforms to "Would you rather be [Side A] or [Side B]" role framing, provides adequate variety, and is acceptable as canonical initial seed.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`

- Date: 2026-03-11
- Test ID: TEST-002
- Milestone/task reference: M4-T1 gate
- Scenario: User-owned visual direction validation of the Milestone 4 homepage review artifact, including the toy-like/mobile-game-inspired styling and representative title/lobby/choice/resolution screens.
- Expected behavior: The direction should feel workable for the MVP, clearly avoid a SaaS-like visual language, and provide a reusable component system for subsequent frontend tasks.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: The direction is solid and workable as a stylistic foundation even though not every detail is fully locked yet; continued refinements remain acceptable in later frontend tasks.

- Date: 2026-03-12
- Test ID: TEST-003
- Milestone/task reference: M4-T2 gate
- Scenario: User-owned validation of the live entry and lobby flow, including create-room, join-by-code, join-via-share-link, ready toggles, host-only start gating, and general usability against the M4-T2 checklist.
- Expected behavior: The main screen and lobby should work end-to-end against the local Firebase emulators, with the share-link query flow, lobby realtime updates, and start gating all behaving correctly.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: All checklist items passed with flying colors and the flow worked as expected once the local frontend and emulator setup were corrected.

- Date: 2026-03-12
- Test ID: TEST-004
- Milestone/task reference: M4-T3 gate
- Scenario: User-owned validation of the live in-game phase flow, including choice timeout balancing, empty-side correction, desktop/dev-layout usability, live lock-in debug state, and overall control ergonomics across choice, argument, rebuttal, and verdict.
- Expected behavior: Timed phase flow should work end-to-end against the local Firebase emulators, with corrected side balancing, passable desktop/mobile usability for development, and no remaining blockers for advancing to Resolution/Game Over work.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: The balancing logic now works as intended, the current desktop/dev UI is passable for continued work, bonus-specific outcome checks can wait until Resolution is wired, and host-promotion outside Resolution remains acceptable to defer for now.

- Date: 2026-03-12
- Test ID: TEST-005
- Milestone/task reference: M4-T4 gate
- Scenario: User-owned validation of the remaining M4-T4 checks, focused on end-of-round comprehension and game-over winner/scoreboard communication after the delegated Playwright browser scenarios passed.
- Expected behavior: Resolution and Game Over should function correctly end to end, with understandable outcome/winner communication and no blockers to beginning the responsive polish pass.
- Observed behavior: Observed behavior matches expected behavior with caveats. The flow works and looks broadly intended, but several desktop surfaces are oversized at 100% zoom, some screens cannot fit fully without zooming out, and some desktop components still appear visually broken.
- Result: `PASS`
- User feedback: Major retouches and polishing are expected next in M4-T5, especially reducing oversized components at normal desktop zoom and fixing remaining broken-looking desktop layouts.

- Date: 2026-03-13
- Test ID: TEST-006
- Milestone/task reference: M4-T5 gate
- Scenario: User-owned validation of the first M4-T5 responsive polish pass on real desktop browsers at 100% zoom, focused on whether text, buttons, and major layout surfaces were brought back to a sane scale.
- Expected behavior: Desktop entry, lobby, and in-game surfaces should no longer feel oversized at standard browser zoom and should read as visually balanced across real browsers.
- Observed behavior: Validation failed. Multiple real-browser screenshots still showed the UI as materially oversized, with overly large text, buttons, and cards across entry and live-game surfaces.
- Result: `FAIL`
- User feedback: "everything (every text, button, component) is big and oversized beyond reason" and needed to be fixed before anything else.
