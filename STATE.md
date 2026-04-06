# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M6 — Post-Launch Stabilization and Product Refinement
- Task: Phase transition complete. Milestones `M1-M5` are now treated as the shipped MVP baseline, and the repo is ready to begin `M6-T1` post-launch gameplay edge-case corrections when approved.
- Gate status: PASS — the MVP is shipped, the release-fix follow-up is committed, and the project has formally moved from pre-launch work into post-launch iteration.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- fe26a15 on main — Pin Firebase deploy target and extend browser release coverage.
- 89168f3 on main — Fix lobby hydration retries and browser entry flow.
- f4bb026 on main — Make Firestore presence the sole liveness source.
- 31df531 on main — Split room presence into a dedicated Firestore collection.
- b1335c5 on main — Checkpoint commit.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- The MVP is now live in production and has been exercised through a full real production round.
- Frontend now uses a single root route with explicit query-based URL state for invite join (`/?join=123456`) and active live-room restoration (`/?live=123456`), backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.
- Presence/disconnect handling now uses dedicated server-owned `presence` documents as the sole liveness source; stable `players` docs no longer carry heartbeat timestamps.
- Entry create/join actions are auth-gated so they cannot silently no-op before anonymous sign-in resolves.
- The browser E2E helper now waits for enabled entry actions and verified lobby readiness/recovery, and the targeted home/multiplayer browser smoke is green again on the local dev/emulator stack.
- Deployment dry-runs now complete successfully for both `functions` alone and the combined `hosting,functions,firestore:indexes` target set against `wannabe-game`.
- `pnpm verify` is green on the current `main` state immediately before the final user-owned acceptance handoff.
- Playwright now explicitly covers the actual lobby share-link copy action and verifies that a late member can still reload/read an ended room before expiry.
- Release hardening has been reopened as `M5-T2A` because the current deploy path still depends on locally generated Functions output, the standalone verify path is not clean-checkout-safe, and production env/setup checks are not yet enforced by tooling.
- `M5-T2A` now adds deterministic release scripts (`build:web`, `build:functions`, `build:release`), a tested production-env preflight, clean-checkout-safe verification, updated deployment/runbook guidance, and the Functions runtime/tooling upgrade to Node 22 + current Firebase packages.
- The first live production smoke exposed a post-upgrade callable transport regression: browser requests now reach the deployed `createRoom` endpoint with a Firebase ID token, but Cloud Run rejects the callable before handler execution unless the HTTPS invoker is explicitly public.
- The same production smoke also exposed a release-script gap: Firestore rules were not part of the supported deploy target set, so live client reads stayed blocked by stale rules even after Hosting and Functions were updated.
- After deploying Firestore rules and reconciling Cloud Run invoker access across the browser-called callable services, the production app completed a full live round successfully; remaining issues are limited to visible UI bugs and the rest of the deferred deployment checklist.
- The current Node 22 repo gate is clean again: the web `.test.mjs` utility tests now match the loader's default-export shape under `tsx`, so `pnpm verify` is green alongside the production fixes.
- Milestones `M1-M5` are now closed as the shipped MVP chapter; remaining issues and improvements move forward under `M6`.

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
- Reopened milestone execution with `M5-T2A` to harden the release contract before launch: deterministic release builds/deploys, production-env preflight, clean-checkout-safe verification, deployment console prerequisites, and the bundled Functions Node 22 / dependency upgrade.
- Added `scripts/predeploy-check.mjs` plus regression coverage, split root release scripts into `build:web`, `build:functions`, `build:release`, updated deploy paths to enforce the new contract, removed the web typecheck dependency on `.next/types`, upgraded the Functions package to Node 22 / current Firebase dependencies, and refreshed the README/deployment runbook accordingly.
- Revalidated the repo from a clean checkout by deleting `.next` and `functions/lib`, then running `pnpm verify` successfully; `pnpm build:release` also passed with explicit production-safe env overrides.
- The final `pnpm deploy:dry-run` validation has now been rerun successfully after Firebase CLI reauth and production-env injection, closing the temporary external blocker on `M5-T2A`.
- Investigated the failed live `createRoom` smoke and confirmed the browser is calling the deployed `createRoom` endpoint with a Firebase auth token, but production logs still show the request as unauthenticated at the transport layer; the current hotfix explicitly adds `invoker: "public"` to shared callable runtime options and adds a regression test for that contract.
- Confirmed that the root deploy scripts were still omitting `firestore:rules`; updated the release scripts/runbook so the supported production path now deploys Hosting, Functions, Firestore rules, and Firestore indexes together.
- Confirmed in production that a full create/join/start/play round works after manually granting `allUsers` the Cloud Run Invoker role on the browser-called callable services and deploying Firestore rules.
- Re-ran `pnpm verify` after updating the affected web utility tests to match the current `tsx` loader behavior; the full repo gate is green again and the release-fix changes are now commit-ready.
- Closed the MVP phase in the project docs: `M5` is now treated as complete/shipped, and `M6` has been opened for post-launch stabilization and refinement.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Real-device/mobile validation is still outstanding for the deferred presence checklist; background/foreground recovery and inactivity removal still need explicit live-device confirmation. — Owner: user + team
- Presence/disconnect behavior has shipped, but the remaining real-device validation and newly discovered stale-player gameplay edge cases now belong to post-launch work under `M6`. — Owner: user + team
- Local Functions commands now warn under Node 20 because the package runtime target moved to Node 22; the team should use Node 22 locally before the next release-validation pass to match the deployed runtime. — Owner: team
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- Visual bugs are still present in the live UI and should receive a focused polish pass after the remaining deployment checklist items are confirmed. — Owner: team
- The release runbook still depends on an explicit Cloud Run invoker verification/remediation step for browser-called callable services until a future deploy proves the repo-side `invoker: "public"` setting reconciles IAM on its own. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None

## 7. Next task (max 1)
- Begin `M6-T1` when approved: specify and implement the first post-launch gameplay edge-case fixes, starting with stale-player/lone-player semantics and scoreboard retention expectations.
