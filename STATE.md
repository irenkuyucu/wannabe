# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: Transition from Pre-M5 Follow-up to M5
- Task: `P-T4` real-device/mobile presence validation is user-deferred until a post-M5 deployed environment is available; agent-owned presence implementation and verification remain complete.
- Gate status: PENDING — User-approved deferment. Mobile/background validation is still required, but it will be executed against the deployed app after M5 instead of blocking current implementation progress.
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
- Agent-owned presence validation is complete: `pnpm test:functions`, `pnpm test:web`, both emulator presence suites, and `pnpm verify` all passed after the full feature landed.
- Added extra Firestore-emulator coverage for the automatable `P-T4` lobby-side cases: soft-timeout host demotion/ready reset/promotion and hard-timeout stale-player removal with single-player start prevention.
- `P-T4` real-device/mobile validation was explicitly deferred by the user until the app is deployed, because local-only infrastructure makes honest phone testing cumbersome right now.
- The deferment is intentional risk carry, not a pass: mobile/background presence behavior remains to be validated later against the deployed app.
- The only current unrelated worktree change is the pre-existing unstaged `src/components/toast.tsx` edit, which is outside the presence task scope.
- The next required repo updates for this feature are `test_log.md` plus another `STATE.md` update once post-deployment mobile validation is actually performed.

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
- Resume the main plan at `PLAN.md` `M5-T1`, while carrying the deferred `P-T4` mobile/background validation as an explicit open item to be executed post-deployment.
