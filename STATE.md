# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M1 — Foundation and Local Tooling
- Task: M1-T2 — Firebase local setup
- Gate status: PASS — Emulator config/env templates added and smoke test passed.
- Active branch: main

## 2. Last commit(s) (max 5)
- 05e5016 on main — Scaffold Next.js app with Tailwind and base UI primitives.
- 2e89f9e on main — Initialize Wannabe planning docs.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Tailwind CSS v4 is configured with base theme tokens in `src/app/globals.css`.
- Base shadcn-style primitive setup exists via `src/components/ui/button.tsx` and `src/lib/utils.ts`.
- Firebase local emulator configuration exists (`firebase.json`, Firestore rules/indexes, `.firebaserc`).
- Environment template exists in `.env.example` with emulator host defaults.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added Firebase emulator configuration: `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`.
- Added env template file `.env.example` and unignored it in `.gitignore`.
- Added placeholder `functions/.gitkeep` for upcoming Functions scaffold.
- Replaced `README.md` with project-specific setup instructions for env/emulators/checks.
- Updated `STATE.md` for M1-T2 gate tracking.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M1-T3 — Add Cloud Functions v2 TypeScript scaffold and callable handler framework.
