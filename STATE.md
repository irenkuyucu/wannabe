# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T5 — Production-adjacent UI simplification + responsive polish
- Gate status: PASS — User directed closure after the full UI foundation pass, with agent-owned checks passing across web, functions, emulator-backed backend flows, and Playwright multiplayer coverage.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- d2c7003 on codex/m4-ui-foundation — Update planning and spec documentation.
- 6820beb on codex/m4-ui-foundation — Implement redesigned game screens and resilient host promotion.
- dc0f16a on codex/m4-ui-foundation — Simplify player-facing room UI and add responsive checks.
- e81241f on codex/m4-ui-foundation — Add Playwright resolution flow coverage.
- 2e12f09 on codex/m4-ui-foundation — Add resolution and game-over frontend flow and Playwright setup.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend root route now serves the live entry, lobby, full in-game phase loop, resolution scoreboard, and game-over surfaces, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, and the repo now has a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Replaced the old single-shell player flow with dedicated mobile-first screens for splash, entry, invite-join, lobby, choice, argument, rebuttal, verdict, resolution, and end-game, while preserving the toy-like gradient/checkered visual direction and desktop responsiveness.
- Wired the bundled `Bangers` font, local arrow icon asset, floating avatar motion fields, validation/assignment/promotion toasts, and end-game winner presentation into the new UI system.
- Strengthened backend round and room behavior by fixing concurrent round-write races, moving host promotion beyond resolution-only guardrails, and recording host-promotion metadata for the frontend toast flow.
- Expanded non-E2E coverage with frontend integration tests plus backend unit and emulator tests, and added seeded/full-flow Playwright multiplayer coverage for the redesigned live game loop.
- Updated `PLAN.md` and `SPEC.md` to reflect the current lone-side bonus-scoring rules and UI constraints.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team
- Broader Playwright best-practice work is intentionally deferred: richer multiplayer architecture, codegen-assisted workflow where helpful, and auditable test artifact design should be expanded later when end-to-end coverage scope grows. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Await user direction on whether to tackle real disconnect/presence handling next or proceed into M5-T1 — Full emulator scenarios.
