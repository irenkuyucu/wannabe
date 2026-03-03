# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T1 — Domain engine
- Gate status: PASS — Pure TS game domain engine added with transition/scoring/penalty unit coverage and full verify pass.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- d9e9480 on main — Add deterministic prompt loader and session deck sampling.
- 8042eee on main — Add prompt seed dataset and validation tests.
- 9fd207f on main — Add baseline verify scripts and smoke tests.
- 04b53d5 on main — Scaffold Firebase functions package and callable framework.
- 6747bb4 on main — Add Firebase emulator config and local env templates.
- 05e5016 on main — Scaffold Next.js app with Tailwind and base UI primitives.
- 2e89f9e on main — Initialize Wannabe planning docs.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Tailwind CSS v4 is configured with base theme tokens in `src/app/globals.css`.
- Base shadcn-style primitive setup exists via `src/components/ui/button.tsx` and `src/lib/utils.ts`.
- Firebase local emulator configuration exists (`firebase.json`, Firestore rules/indexes, `.firebaserc`).
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added pure TS game domain engine module in `functions/src/domain/game-domain.ts`.
- Added domain unit tests in `functions/tests/game-domain.test.ts` and migrated functions smoke test to TypeScript.
- Updated `functions/package.json` scripts/dependencies for TS-based Node test runner (`tsx`) and test lint coverage.
- Updated lockfile and removed legacy `functions/tests/smoke.test.mjs`.
- Updated `STATE.md` for M3-T1 PASS gate status.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M3-T2 — Implement room lifecycle callable APIs (create/join/leave/ready/start) with validations and name collision handling.
