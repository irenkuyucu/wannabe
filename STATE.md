# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T4 — Host guardrail behavior
- Gate status: PASS — Resolution host guardrail is hardened behind dedicated helper logic with green direct and Firestore-emulator integration coverage for host-missing promotion and no-player shutdown.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 57a6c03 on main — Add callable round phase actions and persistence.
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.
- 9de99da on main — Add domain engine for round transitions and scoring.
- d9e9480 on main — Add deterministic prompt loader and session deck sampling.
- 8042eee on main — Add prompt seed dataset and validation tests.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now persists round docs, timed phase state, and resolution host-guardrail transitions across lifecycle + round action APIs.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Extracted dedicated resolution host-guardrail helpers in `functions/src/domain/round-actions.ts` to centralize auto-promotion and immediate room shutdown when the host is missing.
- Added direct integration coverage for resolution host-guardrail promotion and zero-player shutdown in `functions/tests/round-actions.test.ts`.
- Added Firestore emulator coverage for resolution host auto-promotion in `functions/tests/round-actions-emulator.spec.ts`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M3-T5 — Implement Firestore security rules enforcing member reads and denying authoritative client writes.
