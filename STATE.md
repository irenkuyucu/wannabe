# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T6 — End-of-life lifecycle logic
- Gate status: PASS — Final game-over and zero-player ended paths now stamp `expiresAtMs = now + 2h`, preserve ended-room readability semantics, and block resume/rejoin with green direct and Firestore-emulator integration coverage.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- bfffbb9 on main — Add Firestore member read security rules.
- 2b638bc on main — Harden resolution host guardrail behavior.
- 57a6c03 on main — Add callable round phase actions and persistence.
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.
- 9de99da on main — Add domain engine for round transitions and scoring.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now stamps room expiry on ended states and blocks rejoin/resume while retaining ended-room data until best-effort cleanup.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added shared ended-room patch generation in `functions/src/domain/room-lifecycle.ts` and reused it from lifecycle + round-action end paths.
- Updated `functions/src/domain/round-actions.ts` to stamp `expiresAtMs` on final game-over and zero-player end transitions via shared ended-room logic.
- Expanded direct integration coverage in `functions/tests/round-actions.test.ts` for final-round expiry timestamps and ended-room non-resumability.
- Expanded Firestore emulator coverage in `functions/tests/round-actions-emulator.spec.ts` for persisted ended-room expiry and post-end join blocking.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M4-T1 — Draft and validate the initial UI direction.
