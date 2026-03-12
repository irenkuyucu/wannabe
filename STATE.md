# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T5 — Production-adjacent UI simplification + responsive polish
- Gate status: PENDING — Agent-owned checks passed on the production-adjacent UI simplification pass; awaiting user-owned validation of the new default player-facing surfaces and the optional details/debug reveal.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- e81241f on codex/m4-ui-foundation — Add Playwright resolution flow coverage.
- 2e12f09 on codex/m4-ui-foundation — Add resolution and game-over frontend flow and Playwright setup.
- 3e2a723 on codex/m4-ui-foundation — Add live phase screens with balanced choice resolution.
- cba2e56 on codex/m4-ui-foundation — Add live entry and lobby room flow.
- bb03e05 on codex/m4-ui-foundation — Add frontend UI direction board.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend root route now serves the live entry, lobby, full in-game phase loop, resolution scoreboard, and game-over surfaces, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, and the repo now has a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Updated `PLAN.md` so M4-T5 now explicitly covers production-adjacent UI simplification, with the player-facing default UI change recorded in `decision_log.md` rather than expanded in `SPEC.md`.
- Reworked the root route into a more player-facing default UI: simpler entry messaging, a leaner lobby action surface, compact joined-room summary rail, and no default milestone/task chrome.
- Simplified the in-game default surfaces so choice/argument/rebuttal/verdict/resolution emphasize the current player action first, while the previous state-heavy inspection UI now sits behind the optional details toggle.
- Kept and reused the details layer for room-state diagnostics, live lock-in boards, side rosters, vote boards, and similar debugging aids instead of deleting that utility entirely.
- Added `tests/e2e/responsive.spec.ts` to cover entry and lobby usability plus horizontal-overflow regressions at mobile and desktop widths.
- Validated the revised pass with passing runs of `pnpm exec playwright test tests/e2e/responsive.spec.ts` and a clean `pnpm verify`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- Host auto-promotion outside the Resolution phase remains unimplemented and out of scope under the current `SPEC.md`; only the Resolution host guardrail exists today. — Owner: team
- M4-T5 still needs user-owned confirmation that the new default player-facing UI is the right direction on real target devices and browsers before the gate can close. — Owner: user
- Broader Playwright best-practice work is intentionally deferred: richer multiplayer architecture, codegen-assisted workflow where helpful, and auditable test artifact design should be expanded later when end-to-end coverage scope grows. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Await M4-T5 user-owned responsive/visual validation; if PASS, proceed to M5-T1 — Full emulator scenarios.
