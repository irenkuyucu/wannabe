# Wannabe MVP Implementation Plan (Decision-Complete)

## Summary
Build Wannabe as a Firebase-backed, server-authoritative-lite web app with deterministic game rules from `SPEC.md`, and add a fixed 50-question prompt seed in **Milestone 2** so frontend wiring/testing can start early and reliably.  
The plan uses high-cadence user-owned validation across UX tasks, an agent-first UI draft with explicit review gates, and makes documentation updates mandatory inside every task rather than as standalone work.

## Locked Architecture and Workflow Decisions
1. Frontend: Next.js App Router (TypeScript, mostly client components).
2. Backend: Cloud Functions v2 callable APIs + Cloud Firestore realtime subscriptions.
3. Auth: Firebase Anonymous Auth.
4. Hosting: Firebase App Hosting; region `europe-west1`.
5. Styling: Tailwind + selective shadcn primitives + custom Wannabe styling.
6. Repo shape: single app + internal modules.
7. Presence model for host guardrail: explicit leave/membership only.
8. Quality gates: local `pnpm verify` required (no hosted CI in MVP).
9. User-owned validation cadence: high (multiple UX checkpoints, not only release-end).

## Public Interfaces and Types to Implement

### Callable APIs
| Function | Request | Response | Auth and validation requirements |
|---|---|---|---|
| `createRoom` | `{ displayName, avatarId? }` | `{ roomId, roomCode, playerId, assignedDisplayName }` | Auth required (anonymous allowed). Validates display name per MVP rules, then creates host membership + room code mapping. |
| `joinRoom` | `{ roomCode, displayName, avatarId? }` | `{ roomId, playerId, assignedDisplayName }` | Auth required. `roomCode` must be 6-digit numeric. Room must be joinable (`status=lobby`). Validates display name per MVP rules and applies unique suffixing for duplicates. |
| `leaveRoom` | `{ roomId }` | `{ roomStatus }` | Caller must be current room member. Removes member. If room becomes empty, set `status=ended`. |
| `setReady` | `{ roomId, ready }` | `{ ready }` | Caller updates only own ready flag. Allowed only in `lobby`. |
| `startGame` | `{ roomId }` | `{ roundIndex, phase, deadlineAtMs }` | Host only. Requires `playerCount >= 2` and all players ready. Initializes round 1 choice deadline. |
| `tickRoom` | `{ roomId }` | `{ phase, roundIndex, deadlineAtMs }` | Any room member can call. Uses server time to advance timed phases and apply timeout logic deterministically. |
| `submitChoice` | `{ roomId, side }` | `{ locked: true }` | Caller must be room member in `choice` phase. One locked submission per round. |
| `endArgumentTurn` | `{ roomId }` | `{ phase, activeArgumentSide? }` | Caller must belong to currently speaking side in `argument` phase. Ends current side turn immediately. |
| `advanceRebuttal` | `{ roomId }` | `{ phase: "verdict" }` | Host only in `rebuttal` phase. Enforces hold-to-act on UI; backend enforces role/phase only. |
| `submitVerdict` | `{ roomId, verdict }` | `{ locked: true }` | Caller must be room member in `verdict` phase. One locked verdict per round. |
| `advanceResolution` | `{ roomId }` | `{ nextState, roundIndex }` | Host only in `resolution`. If host not in player list, auto-promote from remaining players; if none remain, end room immediately. |

### Firestore Structure
| Path | Purpose | Required key fields |
|---|---|---|
| `rooms/{roomCode}` | canonical room/game state keyed by the 6-digit room code | `status`, `roomCode`, `hostPlayerId`, `roundsTotal`, `roundIndex`, `phase`, `phaseDeadlineAtMs`, `currentPromptId`, `createdAt`, `expiresAt` |
| `rooms/{roomCode}/players/{playerId}` | player/session state | `uid`, `displayName`, `avatarId`, `ready`, `score`, `joinedAt` |
| `rooms/{roomCode}/rounds/{roundIndex}` | immutable round outcomes/history | `promptId`, `choices`, `forceAssignedPlayerIds`, `bonusEligiblePlayerId`, `verdicts`, `outcome`, `dissenterPlayerId`, `startedAt`, `resolvedAt` |

### Player Session Model
`Player` is a room-session model stored at `rooms/{roomId}/players/{playerId}`.
- `uid`: authenticated Firebase Anonymous Auth user id for authorization.
- `displayName`: final in-room name after normalization and uniqueness suffixing.
- `avatarId`: selected local avatar asset id for this session.
- `ready`: lobby readiness flag controlled by the player.
- `score`: cumulative session score across rounds.
- `joinedAt`: server timestamp used for deterministic list ordering/tie handling.

### Prompt Seed Interface
| File | Schema |
|---|---|
| `data/prompts.seed.json` | array of 50 objects: `{ id: "WB001"... , sideA: string, sideB: string }` |

### Shared Domain Types
`RoomStatus`, `Phase`, `Side`, `Verdict`, `RoundOutcome`, plus pure transition/scoring/penalty helpers as single source of truth.

### Field Semantics (Normative)
- `avatarId`: optional request field on room create/join; selects one of the local avatar assets for the player session.
- `deadlineAtMs`: API response field representing the current phase absolute deadline as Unix epoch milliseconds (server time).
- `phaseDeadlineAtMs`: canonical room-state deadline field in Firestore using the same epoch-ms format; must be `null`/unset for untimed `resolution`.
- `bonusEligiblePlayerId`: round record field storing the lone-side player who earns a +1 bonus if their side wins that round after all choice-resolution assignment/correction is complete.

### Input Validation Rules (Normative)
- `displayName` must satisfy all of: trimmed, 1-16 characters, no leading/trailing spaces, allowed characters are ASCII letters (`A-Z`, `a-z`), spaces, hyphens, and apostrophes.
- `roomCode` must be exactly 6 numeric digits.

## Milestones, Tasks, and Gates

### Milestone M1 — Foundation and Local Tooling
Goal: runnable foundation with local emulator workflow and mandatory quality scripts.

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| M1-T1 | Bootstrap app | Next.js + TS + Tailwind + base shadcn primitives + base layout tokens | `pnpm typecheck`, `pnpm lint` | None | PASS on green checks |
| M1-T2 | Firebase local setup | emulator config (Auth/Firestore/Functions), env templates | emulator startup smoke test | None | PASS on successful startup |
| M1-T3 | Functions scaffold | callable framework + shared constants module | `pnpm typecheck`, `pnpm lint` | None | PASS on green checks |
| M1-T4 | Verify scripts baseline | `pnpm verify` (`typecheck+lint+test+rules`) | run full `pnpm verify` | None | PASS on green verify |

### Milestone M2 — Prompt Seed Bridge
Goal: create and validate a deterministic 50-question seed before backend game logic integration.

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| M2-T1 | Generate 50 prompts | `prompts.seed.json` with 50 “Would you rather be [A] or [B]” entries, safe/playful tone | schema/uniqueness test (`50`, unique ids, non-empty sides, format checks) | Prompt content review checklist (tone/safety/variety) | PENDING until user review; then PASS/FAIL |
| M2-T2 | Prompt loader wiring | loader util + deterministic sampling helper for session decks | unit tests for without-replacement behavior per session | None | PASS on green tests |

### Milestone M3 — Authoritative Backend Game Engine
Goal: deterministic server-driven game behavior exactly matching `SPEC.md`.

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| M3-T1 | Domain engine | pure TS transition/scoring logic (argument turn order/timers, quorum/unanimity, choice-resolution assignment/correction, lone-side bonus scoring, dissenter penalty and carryover) | comprehensive unit suite for edge cases | None | PASS on green tests |
| M3-T2 | Room lifecycle APIs | create/join/leave/ready/start with strict input validations (display name + room code) and name collision handling | emulator integration tests | None | PASS on green tests |
| M3-T3 | Round action APIs | choice/argument/rebuttal/verdict/resolution/tick callables + role checks | integration tests across phase paths/timeouts | None | PASS on green tests |
| M3-T4 | Host guardrail behavior | during resolution: missing host -> promote from remaining players; none -> room ended | dedicated integration tests | None | PASS on green tests |
| M3-T5 | Security rules | member-read enforcement, direct game-write denial from clients | emulator rules test matrix | None | PASS on green tests |
| M3-T6 | End-of-life lifecycle logic | on game end set `status=ended` and `expiresAt=now+2h`; enforce ended-room non-resumability and readable-until-expiry semantics (cleanup trigger explicitly deferred in MVP) | integration tests for ended/expiry semantics | None | PASS on green tests |

### Milestone M4 — Frontend UX with High-Cadence User Validation
Goal: deliver full playable UX with repeated user-owned checks.

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| M4-T1 | UI direction draft | first-pass visual system: typography, color tokens, component style patterns, sample screens | visual regression-friendly snapshot/unit checks where applicable | Review/approve visual direction before feature screens | PENDING until approval; then PASS/FAIL |
| M4-T2 | Entry + lobby UI | main screen, create/join, lobby list, ready toggles, start controls, share-link copy UX (dedicated join path), and join-via-share-link handling | component/integration tests | Validate clarity/usability on real device(s), including share-link flow | PENDING until approval; then PASS/FAIL |
| M4-T3 | In-game phase screens | choice, argument, rebuttal, verdict screens with countdowns and controls | component/integration tests for phase-state UI correctness | Validate in-person flow timing and control ergonomics | PENDING until approval; then PASS/FAIL |
| M4-T4 | Resolution + game over | scoreboard, winner/ties, return-main flow, ended-room messaging | component/integration tests | Validate end-of-round and end-of-game comprehension | PENDING until approval; then PASS/FAIL |
| M4-T5 | Production-adjacent UI simplification + responsive polish | simplify default UI to player-facing phase screens, move non-essential state inspection behind an explicit details/debug toggle, and complete mobile/desktop polish | regression checks + `pnpm verify` | Validate visual quality, responsiveness, and default player-facing clarity across target devices | PENDING until approval; then PASS/FAIL |

### Milestone M5 — End-to-End Reliability and Release Readiness
Goal: finalize correctness and deployment readiness.

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| M5-T1 | Full emulator scenarios | end-to-end integration suite for full 10-round lifecycle and critical edge cases | full `pnpm verify` including integration/rules suites | None | PASS on green verify |
| M5-T2 | Deployment readiness | Firebase App Hosting + Functions config, production env var docs, runbook | build/deploy-dry-run checks | None | PASS on successful dry-run checks |
| M5-T3 | Final acceptance session | consolidated multiplayer acceptance checklist mapped to spec | re-run `pnpm verify` on final state | Full real-session pass/fail feedback | PENDING until user outcome; then PASS/FAIL |

## Required Automated Test Scenarios (Must Pass by End of M5)
1. Lobby start gate: start blocked until `playerCount >= 2` and all players are ready.
2. Name collision handling: duplicate names resolve as `Name`, `Name (2)`, `Name (3)`.
3. Choice timeout behavior: missing choices resolve to the most balanced final split possible while keeping explicit picks fixed; if a side is still empty afterward, randomly force-move the minimum number of players needed to reach the most balanced non-empty split.
4. Argument turn order: even rounds `A->B`, odd rounds `B->A`.
5. Argument penalty carryover: dissenter penalty reduces next-round selected side budget to `100s`, then clears and never stacks.
6. Verdict timeout behavior: missing verdicts become `ABSTAIN`.
7. Outcome computation: quorum check first (`<2` non-abstaining => `DRAW`), then unanimity check, else `DRAW`.
8. Dissenter rules: all-but-one non-abstaining votes trigger dissenter; exact `1-1` split has no dissenter; all abstain has no dissenter.
9. Resolution host guardrail: missing host triggers promotion from remaining players; if none remain, room transitions to `ended`.
10. Prompt sampling: no prompt repetition within a room session; repeats allowed across different rooms.
11. End-of-life behavior: final round transitions room to `status=ended`; ended rooms cannot be resumed/rejoined.
12. Security rules matrix: non-members cannot read room internals; clients cannot directly write authoritative game state.
13. Scoring rules: `A_WON` gives +1 to side A choosers; `B_WON` gives +1 to side B choosers; `DRAW` gives +0 to all players.
14. Lone-side bonus scoring: if `bonusEligiblePlayerId` exists and that player's side wins, that player gets +2 total for the round (+1 base +1 bonus); otherwise no bonus.
15. Input validation rules: invalid `displayName` values (including non-ASCII letters) and invalid `roomCode` values are rejected by backend validation.
16. Share-link behavior: room share link uses a dedicated join path and can be copied from lobby, then opens a join path that resolves to the target room by code.
17. Ended-room lifecycle: room end sets `status=ended` + `expiresAt=now+2h`; ended status blocks resume/rejoin; ended-room data remains readable until expiry for late clients.
18. Post-expiry cleanup trigger is deferred in MVP; no automatic deletion trigger is implemented in this plan.

## Required User-Owned Validation Checklists (Expanded)
1. Prompt pack review: appropriateness, variety, and fun factor.
2. UI direction review: visual identity fit for party-game tone.
3. Lobby workflow review: join/create/ready/start clarity on real devices.
4. Share-link review: query-format copy link and join-via-link behavior works reliably on target devices.
5. In-game interaction review: phase comprehension and timer readability.
6. Resolution/game-over review: scoreboard clarity and winner communication.
7. Responsive quality review: mobile and desktop usability.
8. Final full-session playtest: perceived flow, pacing, and enjoyment.

## Cross-Cutting AGENTS.md Workflow Enforcement
1. Documentation is not a separate milestone task. Every implementation task must include required updates to `STATE.md`, and append to `decision_log.md`/`test_log.md` when criteria are met per instructions in `AGENTS.md`.
2. One commit per task with code + docs/log updates together.
3. Task gates follow `AGENTS.md` statuses only: PASS, PENDING, FAIL.
4. Implementation proceeds one user-approved task at a time; no unlisted tasks without explicit approval.

## Gate Semantics and Failure Handling (Normative)
1. PASS: all required agent-owned checks pass and there are no pending user-owned validations for the task.
2. PENDING: task requires user-owned validation; work pauses until user reports PASS/FAIL observations.
3. FAIL: required agent-owned checks fail after two fix attempts, or require out-of-scope changes; record in `test_log.md`, set task gate FAIL in `STATE.md`, and stop for guidance.

## Assumptions and Defaults
1. No staging Firebase project is required for emulator/rules testing.
2. No reconnect UX or rate-limiting implementation in MVP.
3. Hold-to-act (2s) is treated as UX protection; authoritative validation is role/phase based.
4. Prompt moderation remains offline/manual via vetted seed content.
