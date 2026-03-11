# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T3 — Round action APIs
- Gate status: PASS — Timed round action callables (`tickRoom`, `submitChoice`, `endArgumentTurn`, `advanceRebuttal`, `submitVerdict`, `advanceResolution`) shipped with per-round persistence, timeout handling, scoring, and green agent checks including Firestore emulator coverage.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.
- 9de99da on main — Add domain engine for round transitions and scoring.
- d9e9480 on main — Add deterministic prompt loader and session deck sampling.
- 8042eee on main — Add prompt seed dataset and validation tests.
- 9fd207f on main — Add baseline verify scripts and smoke tests.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now persists round docs and timed phase state across lifecycle + round action APIs.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Extended room and round persistence models with `currentPromptId`, `activeArgumentSide`, `pendingPenaltyPlayerId`, and `rooms/{roomId}/rounds/{roundIndex}` support.
- Added deterministic in-functions prompt-id deck helper and round creation wiring in `functions/src/domain/prompt-deck.ts` and `functions/src/domain/room-lifecycle.ts`.
- Added `RoundActionService` in `functions/src/domain/round-actions.ts` covering choice/argument/rebuttal/verdict/resolution progression, timeout handling, and score updates.
- Exported round action callables in `functions/src/index.ts`: `tickRoom`, `submitChoice`, `endArgumentTurn`, `advanceRebuttal`, `submitVerdict`, `advanceResolution`.
- Added direct and Firestore-emulator coverage in `functions/tests/round-actions.test.ts`, `functions/tests/round-actions-emulator.spec.ts`, and emulator scripts in root/functions `package.json`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M3-T4 — Implement host guardrail behavior during resolution with dedicated integration coverage.
