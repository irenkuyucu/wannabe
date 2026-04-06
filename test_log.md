# Wannabe Test Log (Append-Only)

## Purpose
This file is the canonical, append-only record of validation checks/acceptance tests performed by the agent and the user. Must be used following instructions in `AGENTS.md`. Do not log PASSing agent-owned checks. Append an entry only in case of escalated agent-owned FAILs, and for all PASS/FAIL feedbacks from user-owned tests.

---

## Entry template
- Date: YYYY-MM-DD
- Test ID: prefixed by "TEST-", incremented by 1 per entry
- Milestone/task reference: reference point to the concerned milestone/task gate
- Scenario: briefly describe validation scenario.
- Expected behavior: briefly describe expected behavior.
- Observed behavior: briefly describe observed behavior. If the test is a PASS, simply state observed behavior matches expected behavior.
- Result: `PASS` or `FAIL`
- User feedback: use this field only if the user provides additonal comments beyond observed behavior descriptions.

---

- Date: 2026-03-03
- Test ID: TEST-001
- Milestone/task reference: M2-T1 gate
- Scenario: User-owned prompt content validation of the 50-item seed set (tone/safety, identity-role format fit, variety, and product-fit acceptability).
- Expected behavior: Prompt seed is playful/socially acceptable, conforms to "Would you rather be [Side A] or [Side B]" role framing, provides adequate variety, and is acceptable as canonical initial seed.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`

- Date: 2026-03-11
- Test ID: TEST-002
- Milestone/task reference: M4-T1 gate
- Scenario: User-owned visual direction validation of the Milestone 4 homepage review artifact, including the toy-like/mobile-game-inspired styling and representative title/lobby/choice/resolution screens.
- Expected behavior: The direction should feel workable for the MVP, clearly avoid a SaaS-like visual language, and provide a reusable component system for subsequent frontend tasks.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: The direction is solid and workable as a stylistic foundation even though not every detail is fully locked yet; continued refinements remain acceptable in later frontend tasks.

- Date: 2026-03-12
- Test ID: TEST-003
- Milestone/task reference: M4-T2 gate
- Scenario: User-owned validation of the live entry and lobby flow, including create-room, join-by-code, join-via-share-link, ready toggles, host-only start gating, and general usability against the M4-T2 checklist.
- Expected behavior: The main screen and lobby should work end-to-end against the local Firebase emulators, with the share-link query flow, lobby realtime updates, and start gating all behaving correctly.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: All checklist items passed with flying colors and the flow worked as expected once the local frontend and emulator setup were corrected.

- Date: 2026-03-12
- Test ID: TEST-004
- Milestone/task reference: M4-T3 gate
- Scenario: User-owned validation of the live in-game phase flow, including choice timeout balancing, empty-side correction, desktop/dev-layout usability, live lock-in debug state, and overall control ergonomics across choice, argument, rebuttal, and verdict.
- Expected behavior: Timed phase flow should work end-to-end against the local Firebase emulators, with corrected side balancing, passable desktop/mobile usability for development, and no remaining blockers for advancing to Resolution/Game Over work.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: The balancing logic now works as intended, the current desktop/dev UI is passable for continued work, bonus-specific outcome checks can wait until Resolution is wired, and host-promotion outside Resolution remains acceptable to defer for now.

- Date: 2026-03-12
- Test ID: TEST-005
- Milestone/task reference: M4-T4 gate
- Scenario: User-owned validation of the remaining M4-T4 checks, focused on end-of-round comprehension and game-over winner/scoreboard communication after the delegated Playwright browser scenarios passed.
- Expected behavior: Resolution and Game Over should function correctly end to end, with understandable outcome/winner communication and no blockers to beginning the responsive polish pass.
- Observed behavior: Observed behavior matches expected behavior with caveats. The flow works and looks broadly intended, but several desktop surfaces are oversized at 100% zoom, some screens cannot fit fully without zooming out, and some desktop components still appear visually broken.
- Result: `PASS`
- User feedback: Major retouches and polishing are expected next in M4-T5, especially reducing oversized components at normal desktop zoom and fixing remaining broken-looking desktop layouts.

- Date: 2026-03-13
- Test ID: TEST-006
- Milestone/task reference: M4-T5 gate
- Scenario: User-owned validation of the first M4-T5 responsive polish pass on real desktop browsers at 100% zoom, focused on whether text, buttons, and major layout surfaces were brought back to a sane scale.
- Expected behavior: Desktop entry, lobby, and in-game surfaces should no longer feel oversized at standard browser zoom and should read as visually balanced across real browsers.
- Observed behavior: Validation failed. Multiple real-browser screenshots still showed the UI as materially oversized, with overly large text, buttons, and cards across entry and live-game surfaces.
- Result: `FAIL`
- User feedback: "everything (every text, button, component) is big and oversized beyond reason" and needed to be fixed before anything else.

- Date: 2026-03-15
- Test ID: TEST-007
- Milestone/task reference: UI polish pass follow-up on M4-T5
- Scenario: User-owned validation of the post-foundation polish fixes, focused on the entry join-control cleanup, SVG avatar-system replacement, and the mobile avatar-picker overlay behavior.
- Expected behavior: Entry controls should present cleanly on mobile, the placeholder CSS/emoji avatars should be fully replaced by the shipped SVG set, and the avatar picker should fit inside the viewport with internal scrolling and no background-page scroll while open.
- Observed behavior: Observed behavior matches expected behavior after iterative polish, with the user accepting the current result for commit/push.
- Result: `PASS`
- User feedback: "nice job. can you commit and push this?"

- Date: 2026-03-15
- Test ID: TEST-008
- Milestone/task reference: UI polish workflow follow-up on M4-T5
- Scenario: User-owned validation of the local dev workflow after switching the default `pnpm dev` path from Turbopack to webpack.
- Expected behavior: Local CSS edits should invalidate and reflect reliably during `pnpm dev`, without the stale compiled global-CSS behavior seen during the polish pass.
- Observed behavior: Observed behavior matches expected behavior.
- Result: `PASS`
- User feedback: The user reported that the local workflow is now fixed and the stale CSS issue no longer reproduces in their environment.

- Date: 2026-03-15
- Test ID: TEST-009
- Milestone/task reference: Route/navigation follow-up on `PLAN.md` M4-T2 and M5 automated scenarios 16-17
- Scenario: Agent-owned validation of the dedicated join/live route migration and room-code identity simplification after replacing `/?room=` links with `/join/[roomCode]` and `/rooms/[roomCode]`.
- Expected behavior: Dedicated invite and live-room routes should work end to end, live-room refresh should restore the lobby instead of dropping to join mode, Firestore rules should still enforce membership boundaries, and the overall local verify stack should stay green.
- Observed behavior: Observed behavior matches expected behavior. `pnpm exec playwright test tests/e2e/home.spec.ts`, `pnpm run test:rules`, and `pnpm verify` all passed after the route split and backend identity changes landed.
- Result: `PASS`
- User feedback: The user approved integrating the routing fix back onto `codex/m4-ui-foundation` and continued with the localhost-driven UI polish loop.

- Date: 2026-03-31
- Test ID: TEST-010
- Milestone/task reference: M4-T5 gate
- Scenario: User-owned validation of the completed UI refactor/polish pass, including shared primitive extraction, route-driven entry/lobby/in-game surfaces, skeleton/fallback treatment, and the final pass over button/control geometry.
- Expected behavior: The refactored UI should be accepted as a passable implementation for the milestone, with the dedicated surfaces, shared primitives, and latest loading/fallback fixes all working well enough to close the initiative even if some taxonomy/polish work remains for later.
- Observed behavior: Observed behavior matches expected behavior with caveats. The user accepted the current implementation as good enough to close the UI refactoring initiative, while explicitly noting that some areas still are not in the exact compact or fully normalized shape they would want long-term and may receive later cleanup.
- Result: `PASS`
- User feedback: The user accepted the refactor as passable for now, with remaining caveats/open issues limited to optional future polish such as button taxonomy cleanup, possible further tokenization/consolidation, and minor non-blocking UI details.

- Date: 2026-04-02
- Test ID: TEST-011
- Milestone/task reference: M5-T2 gate
- Scenario: Agent-owned deployment-readiness validation after switching from Firebase App Hosting to standard Firebase Hosting, including static export build, updated env/runbook wiring, and `firebase deploy --only hosting,functions,firestore:indexes --dry-run`.
- Expected behavior: The repo should build as a static export, local verification should stay green, and the Firebase deploy dry-run should validate Hosting, Functions, and Firestore indexes successfully against the target project.
- Observed behavior: Static export and local verification succeeded (`pnpm build`, `pnpm verify`), but the Firebase deploy dry-run failed when enabling required Functions deployment APIs because project `wannabe-game` is not on the Blaze plan. Firebase reported that `cloudbuild.googleapis.com` cannot be enabled until billing is upgraded.
- Result: `FAIL`

- Date: 2026-04-05
- Test ID: TEST-012
- Milestone/task reference: Post-M5 entry auth-readiness guard follow-up
- Scenario: Agent-owned browser validation after disabling entry actions until anonymous auth resolves, using `pnpm exec playwright test tests/e2e/multiplayer-flow.spec.ts tests/e2e/home.spec.ts`.
- Expected behavior: The app should keep create/join disabled until auth is ready, and the targeted browser smoke should pass end to end against the local emulator stack.
- Observed behavior: The new unit regression test passed, but Playwright still failed in `tests/e2e/multiplayer-flow.spec.ts` while waiting for the guest invite flow to reach the lobby heading. The app-level auth gating landed, but the existing invite-join helper still clicks immediately after the button appears and has not yet been updated to wait for the new auth-readiness gate.
- Result: `FAIL`

- Date: 2026-04-05
- Test ID: TEST-013
- Milestone/task reference: Post-M5 Playwright/browser follow-up
- Scenario: Agent-owned browser validation after updating the E2E helper to wait for enabled entry actions, backend room membership, and a recovered live-room load, using repeated runs of `pnpm exec playwright test tests/e2e/multiplayer-flow.spec.ts tests/e2e/home.spec.ts`.
- Expected behavior: The multiplayer browser smoke should recover from the auth-gated entry flow, allow the guest invite join to settle onto a hydrated live-room lobby, and then complete the one-round game flow successfully.
- Observed behavior: The helper changes got past the original stale entry-action race, but Playwright still failed in `tests/e2e/multiplayer-flow.spec.ts`. After invite join, the guest flow can still end up on a live-room shell or loading surface without hydrating the joined player, even after backend membership is observed and the helper retries the live-room load via reload/new-page recovery. Browser validation therefore remains red for a deeper guest live-room hydration issue rather than the original button-readiness race.
- Result: `FAIL`

- Date: 2026-04-05
- Test ID: TEST-014
- Milestone/task reference: Post-M5 browser hydration follow-up
- Scenario: Agent-owned validation after isolating the live-room hydration loop, stabilizing the lobby subscription effect, and keeping the Playwright helper aligned with the auth-gated entry flow.
- Expected behavior: The targeted browser smoke should pass against a clean local dev/emulator stack, with both the home-route checks and the one-round multiplayer flow completing without the guest or host lobby getting stuck.
- Observed behavior: Observed behavior matches expected behavior. `node --import tsx --test tests/live-room-hydration.test.tsx tests/entry-auth-readiness.test.tsx` passed, and `pnpm exec playwright test tests/e2e/multiplayer-flow.spec.ts tests/e2e/home.spec.ts --reporter=line` passed with 4/4 tests green on a clean restart.
- Result: `PASS`

- Date: 2026-04-06
- Test ID: TEST-015
- Milestone/task reference: `M5-T2A` gate
- Scenario: Agent-owned release-hardening validation after adding deterministic release scripts, production-env preflight, clean-checkout-safe verification, and the bundled Functions runtime/tooling upgrade.
- Expected behavior: `pnpm verify`, `pnpm build:release`, and `pnpm deploy:dry-run` should all pass, proving the repo is launch-ready from a clean checkout and the Firebase dry-run still validates the release bundle against `wannabe-game`.
- Observed behavior: `pnpm verify` passed from a clean checkout after deleting `.next` and `functions/lib`, and `pnpm build:release` passed with production-safe env overrides. `pnpm deploy:dry-run` rebuilt successfully through the new release path but then failed at the Firebase CLI step because the local credentials are expired (`Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth`), so the final deployment validation could not complete.
- Result: `FAIL`

- Date: 2026-04-06
- Test ID: TEST-016
- Milestone/task reference: `M5-T3` gate
- Scenario: User-owned post-deploy production smoke on the live Firebase Hosting site, focused on the create-room happy path after the first production publish.
- Expected behavior: After choosing an avatar and display name, the live app should create a room successfully and transition into the lobby.
- Observed behavior: The live site loaded, but create-room failed immediately with an `internal` toast. Browser inspection showed the callable request reached `https://europe-west1-wannabe-game.cloudfunctions.net/createRoom`, and production logs reported the request as unauthenticated before the handler ran.
- Result: `FAIL`
- User feedback: The deployed game is live but currently broken because room creation fails in production.

- Date: 2026-04-06
- Test ID: TEST-017
- Milestone/task reference: `M5-T3` gate
- Scenario: User-owned follow-up production smoke after manually making the callable transport public and retrying room creation on the live site.
- Expected behavior: Room creation should succeed and the lobby should hydrate with the host player visible.
- Observed behavior: Room creation started working after the Cloud Run invoker change, but the live lobby remained stuck in its loading skeleton. This matches a Firestore client-read failure; the repo deploy scripts were found to deploy Hosting, Functions, and Firestore indexes without deploying Firestore rules.
- Result: `FAIL`
- User feedback: The deployed room can now be created, but the lobby still does not load and likely blocks the rest of the game as well.

- Date: 2026-04-06
- Test ID: TEST-018
- Milestone/task reference: `M5-T3` gate
- Scenario: User-owned production smoke after deploying Firestore rules and reconciling Cloud Run invoker access for all browser-called callable services, then running through a full live round.
- Expected behavior: The production app should support create-room, lobby hydration, ready/start actions, and a complete round without functional blockers.
- Observed behavior: Observed behavior matches expected behavior with caveats. The live app now supports room creation, lobby hydration, callable room actions, and completion of an entire round in production. Some visual bugs remain, but the core game flow works.
- Result: `PASS`
- User feedback: The game is working end to end in production, though some UI polish issues are still visible.

- Date: 2026-04-06
- Test ID: TEST-019
- Milestone/task reference: Post-production-fix repo validation
- Scenario: Agent-owned repo gate after adding the callable invoker hotfix, corrected deploy target set, and updated production runbook/logs, using `pnpm verify` under the current Node 22 local environment.
- Expected behavior: The repository verification stack should stay green after the release-fix changes.
- Observed behavior: `pnpm verify` failed in `pnpm test:web` before reaching the functions/rules/emulator phases. Multiple existing `.test.mjs` files now fail with ESM named-export errors against repo-root `src/lib/*.js` modules (for example `entry-validation.js`, `in-game-ui.js`, `lobby-utils.js`, `prompt-loader.js`, `room-presence.ts`, and `session-summary.js`). This appears to be a broader local web-test/module-interop issue under the current Node 22 setup rather than a failure caused by the production hotfix itself.
- Result: `FAIL`

- Date: 2026-04-06
- Test ID: TEST-020
- Milestone/task reference: Post-production-fix repo validation
- Scenario: Agent-owned revalidation after aligning the affected web utility tests with the current Node 22 `tsx` loader import shape.
- Expected behavior: `pnpm verify` should return to green so the shipped-production follow-up changes can be committed normally.
- Observed behavior: Observed behavior matches expected behavior. `pnpm verify` passed again after the web utility test imports were updated to match the loader's default-export behavior.
- Result: `PASS`

- Date: 2026-04-06
- Test ID: TEST-021
- Milestone/task reference: `M5-T3` closure
- Scenario: Formal project-phase closure after the live production round and production hotfix follow-up.
- Expected behavior: The MVP should be accepted as shipped, with remaining caveats and refinements explicitly moved into post-launch work rather than keeping `M5` open.
- Observed behavior: Observed behavior matches expected behavior. The MVP is now treated as shipped, and remaining issues are being tracked as post-launch work under `M6`.
- Result: `PASS`
