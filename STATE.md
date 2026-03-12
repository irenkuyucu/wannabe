# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T2 — Entry + lobby UI
- Gate status: PASS — The live entry and lobby flow, including create/join/share-link/ready/start interactions, was validated successfully against the M4-T2 checklist on local devices.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 763d27a on main — Add ended room expiry lifecycle handling.
- bfffbb9 on main — Add Firestore member read security rules.
- 2b638bc on main — Harden resolution host guardrail behavior.
- 57a6c03 on main — Add callable round phase actions and persistence.
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now stamps room expiry on ended states and blocks rejoin/resume while retaining ended-room data until best-effort cleanup.
- Frontend root route now serves the real entry and lobby flow, backed by anonymous auth, Firebase callables, and Firestore subscriptions.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Replaced the M4-T1 direction board with the actual main-screen and lobby experience on the root route.
- Added frontend Firebase client wiring for anonymous auth bootstrap, callable room actions, and Firestore room/player subscriptions.
- Implemented create/join, join-via-share-link prefills, lobby player list rendering, ready toggles, host-only start gating, and copyable query-format share links.
- Added tested lobby/share-link helpers in `src/lib/lobby-utils.js` with web test coverage in `tests/lobby-utils.test.mjs`.
- Updated README local-review instructions for the now-live frontend Firebase flow, including the required `pnpm --dir functions build` step before running emulators.
- User validated the full M4-T2 checklist successfully and passed the gate.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M4-T3 — In-game phase screens.
