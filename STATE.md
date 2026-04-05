# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M5 — End-to-End Reliability and Release Readiness
- Task: `M5-T1A` is implemented. Room liveness now has a dedicated server-owned Firestore `presence` subcollection, and the phase-1 dual-write migration keeps the existing player-doc heartbeat field for compatibility while cleanup/sweep logic prefers `presence` when available.
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
- Presence/disconnect handling now uses dedicated server-owned `presence` documents alongside phase-1 compatibility heartbeat timestamps on player docs; phase 2 remains pending to remove the legacy player-doc heartbeat path.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added explicit `M5-T1A` / `M5-T1B` tasks for the presence data-model split and cleanup rollout, and updated `SPEC.md`/`PLAN.md`/`decision_log.md` to reflect the dedicated `presence` boundary.
- Added the dedicated Firestore `presence` subcollection to the room store, indexes, and rules, with phase-1 dual-write behavior on room create/join/heartbeat.
- Updated stale-player cleanup and scheduled sweeping to prefer dedicated `presence` records while falling back to legacy player-doc timestamps when presence is missing.
- Added unit and emulator coverage for matching presence-doc creation, heartbeat dual-write behavior, presence-preferred cleanup, and orphan-free hard removals.
- Full repo validation passed: `pnpm test:web`, `pnpm --dir functions typecheck`, and `pnpm verify`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for `P-T4`; the remaining required signal is user confirmation that background/foreground recovery and inactivity removal match the approved presence spec in a deployed environment. — Owner: user + team
- Presence/disconnect handling should not be treated as fully release-validated until the deferred post-deployment mobile checklist is completed. — Owner: user + team
- `M5-T1B` remains pending after the phase-1 dual-write split; the actual Firestore read-risk reduction only lands once the legacy player heartbeat writes and fallback cleanup reads are removed. — Owner: team
- `M5-T2` deployment readiness remains blocked for later by Firebase project billing; that work is unchanged by the presence refactor. — Owner: user + team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- `M5-T2` cannot pass until Firebase project `wannabe-game` is upgraded to Blaze so `cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`, and `artifactregistry.googleapis.com` can be enabled during deploy validation. This does not block `M5-T1A`. — Owner: user

## 7. Next task (max 1)
- Implement `M5-T1B`: remove the legacy player-doc heartbeat writes and fallback cleanup reads once the phase-1 split is validated, so the Firestore read-risk reduction actually lands.
