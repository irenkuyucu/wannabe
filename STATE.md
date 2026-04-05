# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M5 — End-to-End Reliability and Release Readiness
- Task: `M5-T1B` is implemented. Room liveness now uses dedicated server-owned Firestore `presence` documents as the sole liveness source, with the legacy player-doc heartbeat compatibility path removed after validating the phase-1 split.
- Gate status: PASS — docs, rules/indexes, unit tests, emulator coverage, and full `pnpm verify` are green.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 914992d on main — Add Firestore emulator full-game verification.
- d40ec7f on main — Update README.
- db5f5e1 on main — Use next image for toast close icon.
- f268fab on main — Add emulator coverage for presence timeout cleanup.
- 86c2fd3 on main — Record presence verification sweep.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses a single root route with explicit query-based URL state for invite join (`/?join=123456`) and active live-room restoration (`/?live=123456`), backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.
- Presence/disconnect handling now uses dedicated server-owned `presence` documents as the sole liveness source; stable `players` docs no longer carry heartbeat timestamps.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added explicit `M5-T1A` / `M5-T1B` tasks for the presence data-model split and cleanup rollout, and updated `SPEC.md`/`PLAN.md`/`decision_log.md` to reflect the dedicated `presence` boundary.
- Added the dedicated Firestore `presence` subcollection to the room store, indexes, and rules, with phase-1 dual-write behavior on room create/join/heartbeat.
- Removed the legacy player-doc heartbeat writes and fallback cleanup reads so stale-player pruning and scheduled sweeping now rely exclusively on dedicated `presence` records.
- Updated unit and emulator coverage so player docs no longer expose `lastSeenAtMs`, while presence-doc creation, presence-only cleanup, and orphan-free hard removals remain covered.
- Full repo validation passed: `pnpm test:web`, `pnpm --dir functions typecheck`, and `pnpm verify`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for `P-T4`; the remaining required signal is user confirmation that background/foreground recovery and inactivity removal match the approved presence spec in a deployed environment. — Owner: user + team
- Presence/disconnect handling should not be treated as fully release-validated until the deferred post-deployment mobile checklist is completed. — Owner: user + team
- `M5-T2` deployment readiness remains blocked for later by Firebase project billing; that work is unchanged by the presence refactor. — Owner: user + team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- `M5-T2` cannot pass until Firebase project `wannabe-game` is upgraded to Blaze so `cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`, and `artifactregistry.googleapis.com` can be enabled during deploy validation. This does not block the completed presence tasks. — Owner: user

## 7. Next task (max 1)
- Resume `M5-T2`: finish deployment-readiness validation once the Firebase project billing blocker is resolved, or explicitly re-scope deployment if Blaze remains unacceptable.
