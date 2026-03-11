# Wannabe Project State

## Purpose
This file is the project’s current operational snapshot. It is agent-maintained and used to keep work grounded across sessions and during active work.

---

## 1. Current status
- Milestone: M4 — Frontend UX with High-Cadence User Validation
- Task: M4-T1 — UI direction draft
- Gate status: PASS — Toy-like frontend direction, shared component styling, and representative title/lobby/choice/resolution screens were approved for Milestone 4 implementation on the M4 feature branch.
- Active branch: codex/m4-ui-foundation

## 2. Last commit(s) (max 5)
(Assume this section might be lagging by one commit when reading to pick up a new session; use `git log` as the source of truth for commit history.)
- 763d27a on main — Add ended room expiry lifecycle handling.
- bfffbb9 on main — Add Firestore member read security rules.
- 2b638bc on main — Harden resolution host guardrail behavior.
- 57a6c03 on main — Add callable round phase actions and persistence.
- 7d82980 on main — Add room lifecycle callables with validated Firestore service.

## 3. Project snapshot (max 5)
(Brief facts about the working state of the project/codebase. No rationale.)
- Next.js App Router TypeScript project is scaffolded at repo root.
- Firebase callable foundation is in place with authenticated callable helper utilities.
- Prompt seed bridge includes canonical seed file and deterministic sampling helper/test coverage.
- Game domain engine includes deterministic transition/scoring helpers with unit coverage.
- Firestore-backed backend now stamps room expiry on ended states and blocks rejoin/resume while retaining ended-room data until best-effort cleanup.
- Frontend homepage now doubles as a direction board for Milestone 4, showing a toy-like proposed visual identity and representative title/lobby/choice/resolution screens.

## 4. Changes since last update (max 5)
(Committed and uncommitted changes made since the last STATE update.)
- Created branch `codex/m4-ui-foundation` for frontend milestone work.
- Reworked the UI direction board toward a brighter toy-like mobile-game aesthetic instead of the earlier poster-like/web-product treatment.
- Replaced the homepage sample screens with chunkier title, lobby, choice, and resolution mockups built around arcade/HUD patterns.
- Refreshed global design tokens, background treatment, motion, and typography stacks to support the new blue-led toy-like visual language.
- Removed the remaining mono/typewriter-inspired HUD text treatment so labels and controls now use clean sans-serif styling throughout the review artifact.
- Added a minimal `turbopack.root` config so local production builds validate cleanly from the repo root.
- User approved the Milestone 4 Task 1 visual direction to unblock real screen implementation.

## 5. Open items (max 5)
(Open questions, decisions, caveats, risks, known issues. Use "None" if empty.)
- Firebase CLI project linking for deploy workflows is intentionally deferred to later milestones. — Owner: user

## 6. Blockers (max 5)
(Define any blockers here. Use "None" if empty.)
- None.

## 7. Next task (max 1)
- M4-T2 — Entry + lobby UI.
