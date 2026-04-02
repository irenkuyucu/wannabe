# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: Pre-M5 Follow-up — Presence and Disconnect Handling
- Task: `P-T3` feature verification sweep is complete on top of `main`, with the full presence validation matrix rerun after the client recovery-gate work landed.
- Gate status: PASS — Backend tests, web tests, both emulator presence suites, and the aggregate `pnpm verify` pass are all green; the next step is the user-owned mobile/background validation handoff in `P-T4`.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 7c60acc on main — Add client presence recovery handling.
- 29fc5f0 on main — Implement backend presence lifecycle cleanup.
- 4cc5f76 on main — Update project logs for completed UI refactor.
- 3c6b4e8 on main — Refine shared UI primitives and loading states.
- 8556972 on main — Consolidate shared game screen structure.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Reran `pnpm test:functions` after the client presence work to reconfirm the backend two-tier presence rules still hold under the integrated feature.
- Reran `pnpm test:web`, including the new recovery-gate integration coverage, to verify the client-side foreground return behavior remains green.
- Reran both emulator-backed presence suites: `pnpm run test:functions:room-lifecycle:emulator` and `pnpm run test:functions:round-actions:emulator`.
- Reran `pnpm verify` end-to-end, including lint, typecheck, web tests, functions tests, and Firestore rules validation.
- No new scoped feature code was added in `P-T3`; this task is the bundled verification/logging pass required before the user-owned mobile validation handoff.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- `P-T4` mobile/background validation handoff is still outstanding; the remaining required signal is real-device confirmation that the implemented recovery and inactivity behavior matches the approved presence spec. — Owner: user + team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user + team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Commit/push the completed `P-T3` feature verification sweep slice, then hand off `P-T4` with the required mobile/background validation checklist.
