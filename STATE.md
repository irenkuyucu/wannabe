# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M1 — Foundation and Local Tooling
- Task: M1-T1 — Bootstrap app
- Gate status: PASS — Next.js/Tailwind app scaffolded and M1-T1 checks passed.
- Active branch: main

## 2. Last commit(s) (max 5)
- 2e89f9e on main — Initialize Wannabe planning docs.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Tailwind CSS v4 is configured with base theme tokens in `src/app/globals.css`.
- Base shadcn-style primitive setup exists via `src/components/ui/button.tsx` and `src/lib/utils.ts`.
- Firebase/project planning docs (`SPEC.md`, `PLAN.md`) remain in place.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added app scaffold files: `src/app/*`, `public/*`, `tsconfig.json`, `next.config.ts`, lint/postcss configs.
- Added package manager artifacts and deps: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `node_modules/`.
- Added base UI primitive files: `src/components/ui/button.tsx`, `src/lib/utils.ts`.
- Updated app shell styling/content for initial Wannabe foundation.
- Updated `STATE.md` for M1-T1 gate tracking.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- M1-T2 requires Firebase emulator wiring and env template setup. — Owner: agent

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M1-T2 — Configure Firebase local platform (Auth/Firestore/Functions emulators) and establish env templates.
