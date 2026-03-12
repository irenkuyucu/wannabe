# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T3 — In-game phase screens
- Gate status: PASS — User validation confirmed the live in-game phase flow, corrected timeout balancing, and current dev-facing layout/debug UX are sufficient to proceed.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- Pending on codex/m4-ui-foundation — Implement live in-game phase flow with balanced choice resolution.
- cba2e56 on codex/m4-ui-foundation — Add live entry and lobby room flow.
- bb03e05 on codex/m4-ui-foundation — Add frontend UI direction board.
- 763d27a on main — Add ended room expiry lifecycle handling.
- bfffbb9 on main — Add Firestore member read security rules.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend root route now serves the live entry, lobby, and timed in-game phase flow, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added client round subscriptions and callable helpers for live choice, argument, rebuttal, verdict, and timeout ticking.
- Replaced the in-game placeholder with real phase screens, then condensed the left desktop column during active rounds to free more width for the live game panel.
- Fixed the choice-screen live lock-in panel to show actual lock-state badges instead of score bubbles.
- Updated choice timeout rules and scoring docs so explicit picks remain fixed unless a side is empty, missing picks resolve to the most balanced final split possible, empty-side correction can move multiple players, and the bonus now follows the lone-side player instead of a forced-player flag.
- Refactored round persistence from single forced-player fields to `forceAssignedPlayerIds` plus `bonusEligiblePlayerId`, expanded automated coverage across web, functions, rules, and isolated Firestore emulator suites, and closed the M4-T3 gate with user PASS feedback.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- Host auto-promotion outside the Resolution phase remains unimplemented and out of scope under the current `SPEC.md`; only the Resolution host guardrail exists today. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M4-T4 — Resolution + game over.
