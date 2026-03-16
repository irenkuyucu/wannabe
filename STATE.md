# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: Continue the localhost-driven UI polish loop on top of the dedicated join/live-room route model
- Gate status: PENDING — Today’s toast cleanup, route-scoped splash simplification, lobby-copy refinements, and lobby-shaped room-restore skeleton are committed and pushed, but the latest visual behavior still needs user review on localhost.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 256ee5b on codex/m4-ui-foundation — Refine toast behavior and lobby loading polish.
- 1d79093 on codex/m4-ui-foundation — Split room routes and restore live lobby refresh.
- 197b387 on codex/m4-ui-foundation — Refresh project state after dev workflow fix.
- 08b4b76 on codex/m4-ui-foundation — Switch local dev to webpack by default.
- 1f3fc7a on codex/m4-ui-foundation — Refine UI polish and align entry validation.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, with a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Committed and pushed the dedicated room-route migration in `1d79093`: `/` remains main entry/create, `/join/[roomCode]` handles invites, `/rooms/[roomCode]` restores active rooms, and room code is now the canonical room document id.
- Reworked entry/error toasts in `src/components/entry-screen.tsx`, `src/components/wannabe-app.tsx`, and `src/app/globals.css` so entry errors use dismissible overlay toasts with shared sizing, pointer cursors, and short-lived behavior instead of inline status bars.
- Simplified splash behavior so the title splash appears only on `/` and never on `/join/[roomCode]` or `/rooms/[roomCode]`, removing the abandoned session/cookie tracking logic from the route pages and `src/components/wannabe-app.tsx`.
- Replaced the standalone “Restoring room” card with a lobby-shaped loading skeleton in `src/components/lobby-screen.tsx`, `src/components/wannabe-app.tsx`, and `src/app/globals.css` so room refreshes stay visually anchored to the lobby surface.
- Continued localhost-driven lobby polish in `src/app/globals.css` and `src/components/lobby-screen.tsx`, including `Room {code} Lobby` copy, content-sized ready chips, global pointer cursors on buttons, and removal of the redundant “Share link copied.” callout.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- Further screen-by-screen entry/lobby/in-game UI polish is still ongoing and will continue from the current localhost-reviewed visual state. — Owner: user + team
- The new lobby-shaped restore skeleton is intentionally a first pass and still needs user review/tuning on the next session. — Owner: user + team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Resume the localhost-driven UI polish loop tomorrow, starting with user review of the new lobby restore skeleton and any follow-up tuning on entry/lobby/join surfaces.
