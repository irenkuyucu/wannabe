# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M5 — End-to-End Reliability and Release Readiness
- Task: `M5-T1` full emulator scenarios are implemented on `main`; the repo now carries a deterministic Firestore-emulator 10-round lifecycle suite plus existing critical edge-case coverage, while the deferred post-deployment `P-T4` mobile/background validation remains an explicit open risk.
- Gate status: PASS — `pnpm verify` is green, including the rules suite and the Firestore-emulator integration suite.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- d40ec7f on main — Update README.
- db5f5e1 on main — Use next image for toast close icon.
- f268fab on main — Add emulator coverage for presence timeout cleanup.
- 86c2fd3 on main — Record presence verification sweep.
- 7c60acc on main — Add client presence recovery handling.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added a deterministic Firestore-emulator full-session scenario that runs a complete 10-round game, verifies prompt uniqueness within the session, penalty carryover, score accumulation, verdict timeout handling, and final ended-room persistence.
- Promoted the emulator coverage into the main validation path by adding a combined `test:functions:emulator` root script and including it in `pnpm verify`.
- Serialized the combined emulator runner with `--test-concurrency=1` because the emulator specs intentionally flush shared Firestore state and are not safe to run in parallel.
- Re-ran the full repository gate successfully: `pnpm verify` now passes with web tests, functions unit tests, Firestore rules, and Firestore-emulator integration coverage.
- The deferred `P-T4` real-device/mobile validation remains intentionally open for post-deployment execution and is still not counted as a pass.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for `P-T4`; the remaining required signal is user confirmation that background/foreground recovery and inactivity removal match the approved presence spec in a deployed environment. — Owner: user + team
- Presence/disconnect handling should not be treated as fully release-validated until the deferred post-deployment mobile checklist is completed. — Owner: user + team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Proceed to `PLAN.md` `M5-T2` (deployment readiness), while carrying the deferred `P-T4` mobile/background validation as an explicit post-deployment follow-up item.
