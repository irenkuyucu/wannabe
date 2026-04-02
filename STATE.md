# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: Pre-M5 Follow-up — Presence and Disconnect Handling
- Task: `P-T2` client recovery gate and disconnect UX is implemented on top of `main`, with targeted client coverage and full agent-owned validation complete.
- Gate status: PASS — Foreground recovery gating, visibility-driven heartbeat handling, explicit leave-on-return-to-main, targeted permission-denied eviction handling, and client automated validation are complete; feature-level verification remains for `P-T3`.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 29fc5f0 on main — Implement backend presence lifecycle cleanup.
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
- Added the client-side presence helper layer: inactivity copy update, lost-membership helper usage, and a pure `shouldEnterPresenceRecovery(...)` decision helper with direct unit coverage.
- Updated `WannabeApp` to support the approved foreground recovery gate: visibility-driven awaited heartbeat on return, blocked room actions and auto-ticks while recovering, explicit leave-on-return-to-main, and targeted permission-denied eviction handling in the lobby subscription path.
- Added dedicated recovery-gate integration coverage around `WannabeApp` for blocked actions, resumed play after successful heartbeat, clean exit after lost membership, and suppressed timed phase ticks during recovery.
- Kept the web client’s presence call surface aligned with backend presence support via `heartbeatRoom`, `isLostRoomMembershipError`, and `PlayerDoc.lastSeenAtMs`.
- Full agent-owned validation now passes again, including `pnpm test:web` and `pnpm verify`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- `P-T3` feature verification sweep is still outstanding; the presence feature now needs its bundled verification/logging pass before the mobile validation handoff. — Owner: team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user + team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Commit/push the completed `P-T2` client recovery gate and disconnect UX slice, then await approval to start `P-T3` feature verification sweep.
