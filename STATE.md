# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M3 — Authoritative Backend Game Engine
- Task: M3-T5 — Security rules
- Gate status: PASS — Firestore security rules now enforce member-only room reads and deny direct client writes to authoritative room, player, round, and room-code documents, with a green emulator rules matrix.
- Active branch: main

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 2b638bc on main — Harden resolution host guardrail behavior.
- 57a6c03 on main — Add callable round phase actions and persistence.
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.
- 9de99da on main — Add domain engine for round transitions and scoring.
- d9e9480 on main — Add deterministic prompt loader and session deck sampling.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now includes member-read security rules plus authoritative-write denial over room lifecycle and round state.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Added member-aware Firestore rules in `firestore.rules` for room, player, and round reads while denying all direct client writes and room-code reads.
- Replaced the placeholder rules smoke script with an emulator-backed rules matrix in root `package.json`.
- Added `tests/firestore.rules.spec.mjs` covering member reads, non-member/guest read denial, room-code read denial, and authoritative write denial.
- Added root dev dependencies `@firebase/rules-unit-testing` and `firebase`, updating `pnpm-lock.yaml` for the rules test harness.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M3-T6 — Implement end-of-life lifecycle logic for ended rooms and expiry semantics.
