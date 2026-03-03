# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M1 — Foundation and Local Tooling
- Task: M1-T3 — Functions scaffold
- Gate status: PASS — Cloud Functions v2 TypeScript scaffold and callable framework added; checks passed.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 6747bb4 on main — Add Firebase emulator config and local env templates.
- 05e5016 on main — Scaffold Next.js app with Tailwind and base UI primitives.
- 2e89f9e on main — Initialize Wannabe planning docs.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Tailwind CSS v4 is configured with base theme tokens in `src/app/globals.css`.
- Base shadcn-style primitive setup exists via `src/components/ui/button.tsx` and `src/lib/utils.ts`.
- Firebase local emulator configuration exists (`firebase.json`, Firestore rules/indexes, `.firebaserc`).
- Functions package scaffold exists with TypeScript sources and callable framework in `functions/src/*`.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added workspace configuration for functions package in `pnpm-workspace.yaml`.
- Added functions package files: `functions/package.json`, `functions/tsconfig.json`, `functions/eslint.config.mjs`.
- Added callable scaffold and shared constants in `functions/src/index.ts`, `functions/src/shared/*`.
- Updated `.gitignore` for workspace `node_modules` and expanded README quality-check instructions.
- Updated `STATE.md` for M1-T3 gate tracking.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M1-T4 — Define baseline verify scripts (`typecheck`, `lint`, `test`, `test:rules`, `verify`) and run them.
