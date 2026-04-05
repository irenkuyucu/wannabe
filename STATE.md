# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M5 — End-to-End Reliability and Release Readiness
- Task: `M5-T3` final acceptance session is pending user-owned validation. The full automated repo gate is green on the current `main` state, and the remaining milestone signal is the final real-session acceptance checklist.
- Gate status: PENDING — agent-owned validation is green; awaiting user-owned final acceptance results.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 89168f3 on main — Fix lobby hydration retries and browser entry flow.
- f4bb026 on main — Make Firestore presence the sole liveness source.
- 31df531 on main — Split room presence into a dedicated Firestore collection.
- b1335c5 on main — Checkpoint commit.
- 914992d on main — Add Firestore emulator full-game verification.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses a single root route with explicit query-based URL state for invite join (`/?join=123456`) and active live-room restoration (`/?live=123456`), backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.
- Presence/disconnect handling now uses dedicated server-owned `presence` documents as the sole liveness source; stable `players` docs no longer carry heartbeat timestamps.
- Entry create/join actions are auth-gated so they cannot silently no-op before anonymous sign-in resolves.
- The browser E2E helper now waits for enabled entry actions and verified lobby readiness/recovery, and the targeted home/multiplayer browser smoke is green again on the local dev/emulator stack.
- Deployment dry-runs now complete successfully for both `functions` alone and the combined `hosting,functions,firestore:indexes` target set against `wannabe-game`.
- `pnpm verify` is green on the current `main` state immediately before the final user-owned acceptance handoff.
- Playwright now explicitly covers the actual lobby share-link copy action and verifies that a late member can still reload/read an ended room before expiry.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added explicit `M5-T1A` / `M5-T1B` tasks for the presence data-model split and cleanup rollout, and updated `SPEC.md`/`PLAN.md`/`decision_log.md` to reflect the dedicated `presence` boundary.
- Added the dedicated Firestore `presence` subcollection to the room store, indexes, and rules, with phase-1 dual-write behavior on room create/join/heartbeat.
- Removed the legacy player-doc heartbeat writes and fallback cleanup reads so stale-player pruning and scheduled sweeping now rely exclusively on dedicated `presence` records.
- Updated unit and emulator coverage so player docs no longer expose `lastSeenAtMs`, while presence-doc creation, presence-only cleanup, and orphan-free hard removals remain covered.
- Added a new web regression test for entry auth-readiness gating and updated the app so create/join buttons remain disabled until anonymous auth is ready.
- Updated the live-room hydration logic so initial lobby subscriptions can retry safely without creating a resubscribe loop when room/player snapshots arrive.
- Added focused web regression coverage for the live-room hydration retry paths and for stable player-list updates without lobby-listener resubscribe churn.
- Updated the Playwright entry/lobby helpers to wait for enabled entry actions and verified lobby readiness/recovery, then revalidated the targeted home + multiplayer smoke successfully.
- Re-ran `firebase deploy --only functions --dry-run --project wannabe-game` and `pnpm deploy:dry-run` after the Blaze upgrade; both completed successfully.
- Re-ran the full repo gate with `pnpm verify`; typecheck, lint, web tests, functions tests, rules tests, and emulator integration tests all passed.
- Added targeted Playwright coverage for automated scenario `16` (clipboard-backed lobby share-link copy) and `17` (late-member readability of an ended room via refreshed/live route), and the affected browser specs pass.
- Pinned the root deploy scripts and Hosting site to `wannabe-game`, replaced the stale `next start` script with a Hosting-emulator preview path, and updated the deployment docs to match the static-export Firebase Hosting model more closely.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for `P-T4`; the remaining required signal is user confirmation that background/foreground recovery and inactivity removal match the approved presence spec in a deployed environment. — Owner: user + team
- Presence/disconnect handling should not be treated as fully release-validated until the deferred post-deployment mobile checklist is completed. — Owner: user + team
- Cloud Functions deploy validation emits non-blocking warnings that Node.js 20 is approaching deprecation and `firebase-functions` is outdated; this should be handled before the runtime cutoff. — Owner: team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None

## 7. Next task (max 1)
- Await the user's `M5-T3` final acceptance results, then record PASS/FAIL in `test_log.md`, update the gate in `STATE.md`, and commit only if the user-owned validation passes.
