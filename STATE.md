# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T2 — Room lifecycle APIs
- Gate status: PASS — Room lifecycle callables (create/join/leave/ready/start) shipped with strict validation, collision handling, and green agent checks including Firestore emulator integration.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 9de99da on main — Add domain engine for round transitions and scoring.
- d9e9480 on main — Add deterministic prompt loader and session deck sampling.
- 8042eee on main — Add prompt seed dataset and validation tests.
- 9fd207f on main — Add baseline verify scripts and smoke tests.
- 04b53d5 on main — Scaffold Firebase functions package and callable framework.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Room lifecycle service + Firestore store now cover create/join/leave/ready/start flows.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added room lifecycle domain module with strict validators and lifecycle orchestration in `functions/src/domain/room-lifecycle.ts`.
- Added Firestore-backed room store in `functions/src/data/firestore-room-store.ts`.
- Exported lifecycle callables in `functions/src/index.ts`: `createRoom`, `joinRoom`, `leaveRoom`, `setReady`, `startGame`.
- Added lifecycle integration tests in `functions/tests/room-lifecycle.test.ts` and Firestore-emulator spec in `functions/tests/room-lifecycle-emulator.spec.ts`.
- Added emulator lifecycle test scripts in root/functions `package.json` and validated with `pnpm verify` plus `pnpm run test:functions:room-lifecycle:emulator`.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M3-T3 — Implement round action callable APIs (`tickRoom`, `submitChoice`, `endArgumentTurn`, `advanceRebuttal`, `submitVerdict`, `advanceResolution`) with role/phase checks.
