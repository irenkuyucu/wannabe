# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: Continue the localhost-driven UI polish loop on top of the dedicated join/live-room route model, now with app-wide typography tokenization, shared button/toast primitives, and the first pass of shared game-screen structure consolidation in place
- Gate status: PENDING — The route-driven dedicated screens remain the only active flow, typography and several shared primitives are normalized, and automated non-Playwright coverage is green, but the latest structural CSS consolidation still needs user review on localhost.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 8556972 on codex/m4-ui-foundation — Consolidate shared game screen structure.
- 6e8d0dc on codex/m4-ui-foundation — Rename shared toast component and remove button tracking.
- 0fea2e0 on codex/m4-ui-foundation — Unify app typography tokens and shared button behavior.
- fe3a82e on codex/m4-ui-foundation — Remove legacy panel UI path.
- 29d20d6 on codex/m4-ui-foundation — Unify in-game typography and shared toast styling.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, `Button`, `GameSyncScreen`, and shared game-screen meta/timer structure.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Renamed `src/components/entry-screen.tsx` to `src/components/menu-screen.tsx` and removed the old invite-mode modifier-class structure by making invite spacing local to `menu-invite-copy`.
- Renamed `src/components/results-scoreboard-table.tsx` to `src/components/scoreboard.tsx`, aligned the CSS namespace to `scoreboard*`, and updated the active screen imports and browser selector coverage.
- Replaced the old text-based in-game sync fallback with `src/components/game-sync-screen.tsx`, a shared skeleton-backed sync surface that reuses the generalized `.skeleton-block` styling now shared with lobby loading.
- Flattened the floating avatar shell by deleting the extra `.avatar-orb` layer and consolidating the live animated avatar styling into `.floating-avatar`.
- Extracted shared game-screen structure in `src/app/globals.css` and the dedicated phase components: standard game screens now share `.game-screen`, `.game-screen-shell`, and `.game-meta*` classes with mobile `40px` side padding, while lobby/resolution/end-game use the wide-screen `20px` mobile padding/table-width path.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- Further screen-by-screen desktop and visual polish is still ongoing and will continue from the now-fully dedicated route-driven screen flow, with the next likely cleanup target being repeated phase body-spacing/rhythm rather than typography or route architecture. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Resume the localhost-driven UI polish loop from the dedicated route-driven surfaces, starting with user review of the new shared game-screen structure and then tightening vertical spacing/max-width rhythm where the first-pass consolidation exposes differences.
