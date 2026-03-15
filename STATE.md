# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: Separate invite and live-room navigation into dedicated routes and restore the lobby correctly on refresh
- Gate status: PASS — Dedicated `/join/[roomCode]` and `/rooms/[roomCode]` routes are implemented, room code is now the canonical room document id, and the routing/backend/test updates all passed the full agent-owned validation stack.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 08b4b76 on codex/m4-ui-foundation — Switch local dev to webpack by default.
- 1f3fc7a on codex/m4-ui-foundation — Refine UI polish and align entry validation.
- d33be81 on codex/m4-ui-foundation — Replace placeholder avatars with SVG picker assets.
- e69b207 on codex/m4-ui-foundation — Refresh project state snapshot.
- d2c7003 on codex/m4-ui-foundation — Update planning and spec documentation.
- dc0f16a on codex/m4-ui-foundation — Simplify player-facing room UI and add responsive checks.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, with a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added dedicated join and live-room App Router pages at `src/app/join/[roomCode]/page.tsx` and `src/app/rooms/[roomCode]/page.tsx`, while keeping `/` as the main entry/create surface.
- Reworked `src/components/wannabe-app.tsx` and `src/lib/lobby-utils.js` so share links use `/join/[roomCode]`, successful create/join transitions land on `/rooms/[roomCode]`, and refreshing a live room restores the lobby instead of falling back to join mode.
- Simplified backend room identity so the 6-digit room code is the canonical room document id, removing the room-code indirection layer from `functions/src/domain/room-lifecycle.ts`, `functions/src/data/firestore-room-store.ts`, `functions/src/domain/round-actions.ts`, `functions/tests/test-helpers.ts`, and `firestore.rules`.
- Updated browser/unit/rules/functions coverage for the route and identity change in `tests/e2e/home.spec.ts`, `tests/e2e/helpers/game.ts`, `tests/lobby-utils.test.mjs`, `tests/firestore.rules.spec.mjs`, `functions/tests/room-lifecycle.test.ts`, `functions/tests/round-actions.test.ts`, and `functions/tests/round-actions-emulator.spec.ts`.
- Preserved the current localhost-driven UI polish work in `src/app/globals.css`, `src/components/entry-avatar.tsx`, and `src/components/entry-screen.tsx`, including the latest desktop entry/join/lobby sizing and button-treatment tweaks.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- Further screen-by-screen entry/lobby/in-game UI polish is still ongoing and will continue from the current localhost-reviewed visual state. — Owner: user + team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Resume the localhost-driven screen-by-screen UI polish loop from the current entry/lobby/join surfaces, now on top of the dedicated join/live-room route model.
