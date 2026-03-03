# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M1 — Foundation and Local Tooling
- Task: M1-T4 — Verify scripts baseline
- Gate status: PASS — Baseline script matrix (`typecheck`, `lint`, `test`, `test:rules`, `verify`) added and full `pnpm verify` passed.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
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
- Functions package scaffold exists with TypeScript sources, callable framework, and test harness in `functions/src/*`.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added root script matrix in `package.json`: `typecheck`, `lint`, `test`, `test:rules`, and `verify`.
- Added functions `test` script in `functions/package.json`.
- Added baseline smoke tests: `tests/smoke.test.mjs` and `functions/tests/smoke.test.mjs`.
- Updated `README.md` to standardize validation on `pnpm verify`.
- Updated `STATE.md` for M1-T4 gate tracking.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M2-T1 — Generate vetted 50-question prompt seed and schema/uniqueness checks; hand off for user-owned prompt content review.
