# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M2 — Prompt Seed Bridge
- Task: M2-T1 — Generate 50 prompts
- Gate status: PASS — Agent checks passed and user-owned prompt content validation reported PASS.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
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
- Functions package scaffold exists with TypeScript sources, callable framework, and test harness in `functions/src/*`.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added prompt seed file with 50 curated prompts in `data/prompts.seed.json`.
- Added schema/uniqueness validation tests in `tests/prompts.seed.test.mjs`.
- Ran full agent-owned checks (`pnpm verify`), including rules smoke test.
- Appended user-owned validation PASS outcome in `test_log.md` (T-1).
- Updated `STATE.md` for M2-T1 PASS gate status.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M2-T2 — Wire prompt loader utility and deterministic per-session sampling helper with without-replacement tests.
