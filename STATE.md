# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T4 — Resolution + game over
- Gate status: PENDING — Agent-owned frontend checks passed for the new resolution/game-over flow; awaiting user validation on end-of-round and end-of-game comprehension.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 3e2a723 on codex/m4-ui-foundation — Add live phase screens with balanced choice resolution.
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
- Frontend root route now serves the live entry, lobby, full in-game phase loop, resolution scoreboard, and game-over surfaces, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added pure session-summary helpers plus web tests for round score deltas, resolution reasoning, scoreboard ordering, and final-session winner/tie summaries.
- Replaced the in-game resolution placeholder with the real round-result surface: verdict breakdown, per-player round deltas, bonus/dissenter messaging, and host hold-to-advance controls.
- Added a reusable session scoreboard and a dedicated game-over panel so ended rooms now show winners, final standings, ended-room messaging, and return-to-main flow.
- Cached the latest round client-side so the final game-over screen can keep the last-round outcome visible after the room transitions to `ended`.
- Added the repo `@playwright/test` dev dependency ahead of the next session so post-relaunch agent-driven browser validation can extend the still-open M4-T4 gate.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- Host auto-promotion outside the Resolution phase remains unimplemented and out of scope under the current `SPEC.md`; only the Resolution host guardrail exists today. — Owner: team
- `pnpm lint:web` still fails on pre-existing `functions/lib/*.js` `require()` import violations outside `M4-T4`; task-scoped lint for touched frontend files passed. — Owner: team
- User requested a workflow exception: commit/push the still-pending M4-T4 work before user-owned validation completes so the next Codex session can relaunch with Playwright/MCP testing capabilities. — Owner: user/team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Resume M4-T4 validation after relaunch, adding Playwright-enabled testing coverage without closing the task gate until user-owned checks are complete.
