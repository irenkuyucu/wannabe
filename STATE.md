# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: UI polish checkpoint committed; next step is stale dev-CSS invalidation investigation
- Gate status: PENDING — Current UI polish changes are checkpointed on the branch at user request, but reliable user-owned validation is blocked because the local Next dev server is intermittently serving stale compiled CSS that does not match source edits.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- d33be81 on codex/m4-ui-foundation — Replace placeholder avatars with SVG picker assets.
- e69b207 on codex/m4-ui-foundation — Refresh project state snapshot.
- d2c7003 on codex/m4-ui-foundation — Update planning and spec documentation.
- 6820beb on codex/m4-ui-foundation — Implement redesigned game screens and resilient host promotion.
- dc0f16a on codex/m4-ui-foundation — Simplify player-facing room UI and add responsive checks.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend root route now serves the live entry, lobby, full in-game phase loop, resolution scoreboard, and game-over surfaces, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, and the repo now has a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Replaced the temporary emoji/CSS avatar direction with the new local SVG avatar set in `public/avatars`, including a tap/click avatar picker overlay during entry/join and shared avatar rendering across the app.
- Converted the frontend sizing system away from rem/Tailwind scale shortcuts and onto explicit px values across `src/app/globals.css`, live room panels, shared buttons, scoreboards, and floating avatar motion variables to make visual polish iteration literal and consistent.
- Tightened the entry-screen controls and validation rules during the polish pass: shared local close icon usage, entry control geometry updates, display-name limit alignment to the spec’s 12-character rule, and matching backend/frontend validation coverage.
- Adjusted the entry-screen room-code row so the join button sits in a real two-column layout instead of absolutely overlaying the input, preventing overflow on tighter mobile widths.
- Replaced the old single-shell player flow with dedicated mobile-first screens for splash, entry, invite-join, lobby, choice, argument, rebuttal, verdict, resolution, and end-game, while preserving the toy-like gradient/checkered visual direction and desktop responsiveness.
- Wired the bundled `Bangers` font, local arrow icon asset, floating avatar motion fields, validation/assignment/promotion toasts, and end-game winner presentation into the new UI system.
- Strengthened backend round and room behavior by fixing concurrent round-write races, moving host promotion beyond resolution-only guardrails, and recording host-promotion metadata for the frontend toast flow.
- Expanded non-E2E coverage with frontend integration tests plus backend unit and emulator tests, and added seeded/full-flow Playwright multiplayer coverage for the redesigned live game loop.
- Updated `PLAN.md` and `SPEC.md` to reflect the current lone-side bonus-scoring rules and UI constraints.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- The current localhost UI polish branch checkpoint still needs reliable user-owned visual validation once the stale dev-CSS issue is resolved. — Owner: user + team
- The local Next dev workflow is intermittently serving stale compiled CSS from `.next/dev/static/chunks` even when source `src/app/globals.css` has changed, which is blocking trustworthy polish iteration. — Owner: team
- Further small entry/lobby/in-game polish may still be requested later, but the current localhost-driven avatar and entry-control pass is accepted. — Owner: user + team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- Reliable UI validation is currently blocked by local stale-CSS invalidation in the Next dev workflow. — Owner: team

## 7. Next task (max 1)
- Create a fresh branch from this checkpoint and investigate the root cause of the stale compiled CSS / unreliable Next dev reload behavior before resuming further UI polish.
