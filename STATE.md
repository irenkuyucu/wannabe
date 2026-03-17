# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: Continue the localhost-driven UI polish loop on top of the dedicated join/live-room route model, now with app-wide typography tokenization and the shared button primitive normalized
- Gate status: PENDING — The route-driven dedicated screens remain the only active flow, app-wide text sizing/weight normalization is now tokenized across mobile and desktop, and automated non-Playwright coverage is green, but ongoing visual polish still needs user review on localhost.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- fe3a82e on codex/m4-ui-foundation — Remove legacy panel UI path.
- 29d20d6 on codex/m4-ui-foundation — Unify in-game typography and shared toast styling.
- 256ee5b on codex/m4-ui-foundation — Refine toast behavior and lobby loading polish.
- 1d79093 on codex/m4-ui-foundation — Split room routes and restore live lobby refresh.
- 197b387 on codex/m4-ui-foundation — Refresh project state after dev workflow fix.
- 1f3fc7a on codex/m4-ui-foundation — Refine UI polish and align entry validation.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Refactored `src/components/ui/button.tsx` into the sole active shared button primitive, folding the old hold interaction semantics into a tokenized `interaction="hold"` path and deleting `src/components/hold-button.tsx`.
- Migrated the argument, rebuttal, resolution, and end-game screens onto the shared `Button` component and reduced duplicate per-screen button typography styling in `src/app/globals.css`.
- Finished tokenizing app-wide text sizing across splash, entry, invite, lobby, modal, toast, in-game, and end-game surfaces for both mobile/base and desktop remaps in `src/app/globals.css`.
- Added direct component coverage for the shared hold-button interaction in `tests/ui-components.test.tsx` and re-ran the non-Playwright automated suites successfully.
- The only remaining hardcoded size values in UI styling are now non-typographic visual values like icon/emoji geometry, spacing, and shadows rather than text size/weight rules.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- Further screen-by-screen desktop and visual polish is still ongoing and will continue from the now-fully dedicated route-driven screen flow, but text size/weight normalization no longer needs structural cleanup. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Resume the localhost-driven UI polish loop from the dedicated route-driven surfaces, starting with remaining desktop visual tuning and any non-typographic shared primitive cleanup.
