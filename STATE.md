# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: Pre-M5 Follow-up — Presence and Disconnect Handling
- Task: `P-T1` backend presence lifecycle is implemented on top of `main`, with the approved scoped spec/plan docs bundled in the same working tree and agent-owned validation complete.
- Gate status: PASS — Backend two-tier presence cleanup, heartbeat pre-refresh, scheduled stale sweep, Firestore index config, and backend automated validation are complete; client recovery-gate work remains for `P-T2`.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 4cc5f76 on main — Update project logs for completed UI refactor.
- 3c6b4e8 on main — Refine shared UI primitives and loading states.
- 8556972 on main — Consolidate shared game screen structure.
- 6e8d0dc on main — Rename shared toast component and remove button tracking.
- 0fea2e0 on main — Unify app typography tokens and shared button behavior.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Amended `SPEC.md` and `PLAN.md` only where needed to reflect the approved two-tier presence model and added the auxiliary pair `presence_spec.md` / `presence_plan.md`.
- Added backend presence lifecycle support: `SOFT_TIMEOUT_MS` / `HARD_TIMEOUT_MS`, shared stale-player cleanup with inactive-player tracking, heartbeat pre-refresh, and the scheduled disconnected-player sweep.
- Updated backend lobby/game rules so soft-inactive players stay in-room, lobby readiness/start gating uses active players only, hard-removed players still end empty rooms, and stale hosts are promoted from active remaining players.
- Updated Firestore store/helpers and lifecycle/round-action tests to cover soft inactivity, hard removal, host promotion, and scheduled cleanup under the new backend model.
- Firestore index config now includes the collection-group `players.lastSeenAtMs` index required for the scheduled stale-player sweep in production.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- `P-T2` client recovery gate and disconnect UX is not implemented yet; current app-side return-from-background behavior is still governed by the old in-progress client changes in the working tree and should not be treated as task-complete. — Owner: team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user + team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Commit/push the completed `P-T1` backend presence lifecycle slice, then await approval to start `P-T2` client recovery gate and disconnect UX.
