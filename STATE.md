# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M5 — End-to-End Reliability and Release Readiness
- Task: `M5-T2` has been redefined and implemented for standard Firebase Hosting: the frontend now builds as a static export with query-based invite/live routing, and deployment docs/scripts were updated accordingly. The gate is currently blocked only by the target Firebase project not being on Blaze for Functions deployment dry-run.
- Gate status: FAIL — local/build validation passed, but `pnpm deploy:dry-run` cannot complete until Firebase project billing is upgraded.
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

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Re-scoped `M5-T2` from Firebase App Hosting to standard Firebase Hosting and recorded the decision in `SPEC.md`, `PLAN.md`, `STATE.md`, and `decision_log.md`.
- Replaced server-rendered `/join/[roomCode]` and `/rooms/[roomCode]` routes with root-route query state (`/?join=...`, `/?live=...`) so the frontend can be statically exported cleanly.
- Added standard Firebase Hosting config, static-export build settings, production env example updates, a deployment runbook, and a `pnpm deploy:dry-run` script.
- `pnpm build` and `pnpm verify` both passed after the hosting pivot, including the existing emulator/rules coverage.
- `pnpm deploy:dry-run` failed only because Firebase blocked Functions deployment on project `wannabe-game` until the project is upgraded to Blaze.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for `P-T4`; the remaining required signal is user confirmation that background/foreground recovery and inactivity removal match the approved presence spec in a deployed environment. — Owner: user + team
- Presence/disconnect handling should not be treated as fully release-validated until the deferred post-deployment mobile checklist is completed. — Owner: user + team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- `M5-T2` cannot pass until Firebase project `wannabe-game` is upgraded to Blaze so `cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`, and `artifactregistry.googleapis.com` can be enabled during deploy validation. — Owner: user

## 7. Next task (max 1)
- Upgrade Firebase project billing for `wannabe-game`, rerun `pnpm deploy:dry-run`, and if it passes, close `M5-T2` before proceeding to `M5-T3`.
