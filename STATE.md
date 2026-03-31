# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: Close out the UI refactoring/polish initiative on top of the dedicated join/live-room route model, now with shared field/modal/avatar/progress primitives, centered loading/fallback surfaces, and expanded automated coverage for the refactored UI.
- Gate status: PASS — The user accepted the refactored UI as passable for the milestone, the work is committed/pushed on the active branch, and the added web/Playwright coverage for the new primitives and fallback surfaces is green.
- Active branch: codex/m4-ui-refactor

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 3c6b4e8 on codex/m4-ui-refactor — Refine shared UI primitives and loading states.
- 8556972 on codex/m4-ui-foundation — Consolidate shared game screen structure.
- 6e8d0dc on codex/m4-ui-foundation — Rename shared toast component and remove button tracking.
- 0fea2e0 on codex/m4-ui-foundation — Unify app typography tokens and shared button behavior.
- fe3a82e on codex/m4-ui-foundation — Remove legacy panel UI path.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend now uses three explicit navigation states: `/` for main entry/create, `/join/[roomCode]` for invite join, and `/rooms/[roomCode]` for active live-room restoration, all backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved dedicated-screen UI system, with shared `MenuScreen`, `Scoreboard`, `Toast`, behavior-only `Button`, `GameSyncScreen`, `Field*`, `ModalShell`, shared game-screen meta/timer structure, and ghost-wireframe loading/fallback surfaces.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Renamed the lingering `entry-avatar` surface to `menu-avatar`, introduced shared `Field*` and `ModalShell` primitives, and moved the menu/input/avatar-picker flows onto those shared CSS-first shells.
- Consolidated more shared UI primitives in `src/app/globals.css`, including shared avatar-frame treatment, shared progress bars, renamed `surface-enter` animation, and final menu-control geometry alignment for the invite CTA.
- Rebuilt `src/components/floating-avatar-field.tsx` around a bounded inner canvas and lightweight JS particle motion so avatars bounce off walls and each other instead of leaking into phase headers or overlapping.
- Reworked `src/components/game-sync-screen.tsx` and `src/components/lobby-screen.tsx` loading states into ghost-wireframe skeletons that trace their actual UI structure rather than generic filled blocks.
- Expanded automated coverage with `tests/ui-primitives.test.tsx`, `tests/e2e/loading-surfaces.spec.ts`, and invite-route responsive checks so the new field/modal/loading surfaces are covered alongside the existing gameplay/browser suites.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Turbopack remains available as `pnpm dev:turbo`, but it is currently known to be unreliable for global CSS invalidation in this repo and should not be used for UI polish until revisited. — Owner: team
- The user accepted the current UI refactor as passable for the milestone, but some optional cleanup remains for later, especially button taxonomy cleanup, deeper geometry/token normalization, and any stricter future design-system compaction. — Owner: user + team
- The dedicated-screen flow is now the only active UI path; any future detail/debug inspection UI will need to be reintroduced intentionally rather than relying on the deleted composite panel shell. — Owner: team
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- `src/components/toast.tsx` still has a non-blocking Next lint warning for using `<img>` instead of `next/image`. — Owner: team
- True disconnect/presence handling is still unimplemented: closing a tab/browser does not currently remove a player from the room automatically, so host/player removal still depends on explicit backend leave/removal paths. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- Move on from M4 UI refactoring into M5 reliability/release-readiness work, with the next likely implementation task being broader end-to-end scenario coverage and release-adjacent validation rather than further design-system cleanup.
