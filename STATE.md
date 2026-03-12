# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T4 — Resolution + game over
- Gate status: PASS — User validation confirmed M4-T4 works end to end, with explicit caveats that oversized desktop scaling and broken-looking desktop layouts need major retouching in M4-T5.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 2e12f09 on codex/m4-ui-foundation — Add resolution and game-over frontend flow and Playwright setup.
- 3e2a723 on codex/m4-ui-foundation — Add live phase screens with balanced choice resolution.
- cba2e56 on codex/m4-ui-foundation — Add live entry and lobby room flow.
- bb03e05 on codex/m4-ui-foundation — Add frontend UI direction board.
- 763d27a on main — Add ended room expiry lifecycle handling.
- bfffbb9 on main — Add Firestore member read security rules.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Frontend root route now serves the live entry, lobby, full in-game phase loop, resolution scoreboard, and game-over surfaces, backed by anonymous auth, Firebase callables, and Firestore room/round subscriptions over the approved toy-like UI system, and the repo now has a Chromium Playwright harness for browser-side validation.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Expanded Playwright bootstrapping so `pnpm test:e2e` now starts the Firebase emulator trio plus `pnpm dev`, with explicit shutdown handling between runs.
- Added emulator-backed helpers and `tests/e2e/m4-t4-resolution.spec.ts` to automate the delegated M4-T4 checks: non-final resolution host advance vs. non-host waiting state, final-round resolution opening game over, and return-to-main/non-resumable ended-room behavior.
- Validated the new delegated browser coverage with passing runs of `pnpm exec playwright test tests/e2e/m4-t4-resolution.spec.ts` and a passing narrowed rerun of the non-final resolution scenario while debugging selector/hold-state issues.
- Updated Playwright README guidance to reflect the automatic emulator startup and the expanded e2e suite surface.
- Closed M4-T4 with user PASS feedback plus explicit polish caveats for M4-T5: oversized desktop scaling, incomplete full-screen fit at 100% zoom, and broken-looking desktop component layouts.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user
- Host auto-promotion outside the Resolution phase remains unimplemented and out of scope under the current `SPEC.md`; only the Resolution host guardrail exists today. — Owner: team
- `pnpm lint:web` still fails on pre-existing `functions/lib/*.js` `require()` import violations outside `M4-T4`; task-scoped lint for touched frontend files passed. — Owner: team
- M4-T5 needs major desktop polish work: several UI surfaces are oversized at 100% zoom, some screens do not fit fully without zooming out, and some desktop components still look visually broken. — Owner: team
- Broader Playwright best-practice work is intentionally deferred: richer multiplayer architecture, codegen-assisted workflow where helpful, and auditable test artifact design should be expanded later when end-to-end coverage scope grows. — Owner: team

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M4-T5 — Responsive polish pass.
