# Wannabe MVP Spec

## 1. Overview

**Wannabe** is a synchronous, room-based party game (web app) built around prompts of the form:

> “Would you rather be **[Side A]** or **[Side B]**?”

Players join a room, pick sides in each round, argue in timed phases, then submit a verdict. The game runs for a fixed number of rounds (default: 10) and awards points based on round outcomes.

Important: Wannabe is an in-person party game played when all players are physically present in the same room. The web app is only a companion to facilitate the actual game. Argument/Rebuttal phases are conducted outside the app, players speak in-person.

This document defines **product behavior and game rules** for the MVP. It intentionally **does not** include an implementation plan (see `PLAN.md`).

---

## 2. Goals and Non-goals

### 2.1 Goals (MVP)
- Fast room creation and joining via 6-digit numeric room codes and share links.
- Clear, repeatable round loop with explicit phases and timers.
- Minimal friction: no accounts, no setup, placeholder assets acceptable.
- Deterministic rules that prevent the game from getting stuck.

### 2.2 Non-goals (MVP)
- Multiple game modes, tie-break modes, custom room configuration UI.
- Advanced reconnect flows beyond the heartbeat-based recovery gate, mid-game joining, or free drop-in/out after removal.
- Enterprise-grade security, moderation tools, or anti-abuse systems beyond basic common-sense safeguards.
- Persistent rooms across multiple full game sessions (room ends after the game).

---

## 3. Core Concepts

### 3.1 Roles
- **Host**: the player who creates the room. Has control over:
  - Starting the game (once all players are ready).
  - Early phase skipping where specified.
  - Advancing from Resolution → next round (or Game Over).
- **Player**: any non-host participant.

### 3.2 Room
A **Room** is a single game container with:
- a 6-digit numeric room code (numbers only, no alphabetic characters),
- a lobby state, and
- one game session (10 rounds) after which it ends.

### 3.3 Round Count
- Default: **10 rounds** per game session.
- No modes or tie-breaks in MVP.

### 3.4 Minimum Players
- The game may start only if **playerCount >= 2**.

---

## 4. UX Flow and Screens (MVP)

### 4.1 Title Screen
- Shows game name: **Wannabe**
- Tone: social, playful, fun (visual direction TBD)

### 4.2 Main Screen
- Avatar preview with tap/click-to-open avatar picker
- Avatar picker presents the available local avatar assets in a simple grid overlay and lets the player choose one before creating or joining
- Name input (used for display names; 1–12 characters; only letters A-Z, spaces, and hyphens allowed; trimmed; no leading/trailing spaces)
- Buttons:
  - **Create Room** (requires filled name to be active)
  - **Join Room** (requires filled name and room code to be active)

### 4.3 Create Room → Lobby (Host)
- Creating a room makes the creator the **Host**.
- Lobby displays:
  - Room code (6 digits)
  - Player list (avatars + display names) and ready/not status
  - “Share link” (copyable)
  - Ready toggles (for each player on their own device)
  - Start button (host only; gated by readiness)

### 4.4 Join Room → Lobby (Player)
- Join by entering room code OR opening the share link.
- The same avatar picker used on the main screen is available before joining, including when the room code is prefilled by a share link.
- Lobby displays player list and readiness.

### 4.5 In-Game Round Screens
- **Choice**
- **Argument**
- **Rebuttal**
- **Verdict**
- **Resolution**
- **Game Over** (winner + scoreboard + return to main)

---

## 5. Game State Machine

### 5.1 Room States
Room lifecycle states:
- `lobby → inGame → ended`

### 5.2 In-game Per-round Structure
Each round consists of in-game phases:

1) **Choice**  
2) **Argument** (two side turns)  
3) **Rebuttal**  
4) **Verdict**  
5) **Resolution**  

Each round progresses through this phase order:
- `choice → argument → rebuttal → verdict → resolution`

After Resolution:
  - If `roundIndex` < `roundsTotal`: next round starts at `choice` phase
  - Else: room transitions to `ended` state (game over)

- Each timed phase shows a visible countdown timer on the UI.
  Timers are:
  - **Choice**: 60 seconds
  - **Argument**: side-turn timers (derived from side budgets; see below)
  - **Rebuttal**: 60 seconds
  - **Verdict**: 60 seconds
  - **Resolution** has no timer; host advances.

---

## 6. Prompts (Questions)

- Prompts are pre-specified and each must fit:
  - Side A: an identity/role
  - Side B: an identity/role
- Prompt display format:
  - “Would you rather be”
  - **[Side A]** (button)
  - “or”
  - **[Side B]** (button)
- MVP includes an initial set of prompts (e.g., 100) generated/seeded ahead of time.
- MVP prompts come from a fixed, vetted seed file in the repo. There is no moderation filtering at runtime.
- For each room/game session, prompts are selected randomly from the full prompt pool without replacement until the session ends.
- The 'without replacement' rule only concerns the current room at the time, so prompts may repeat across different rooms/game sessions.

---

## 7. Session and Round Rules

## 7.1 Lobby (Room State)
- Players can join via code/link.
- Player display names must be unique within a room.
  - If duplicates exist, the system automatically assigns a unique variant by appending a numeric suffix:
  - Example: "Alex" → "Alex (2)", then "Alex (3)", etc.
  - The final assigned name is shown to the player and used for the session.
- While a player is in a room, the client maintains room presence with periodic heartbeats.
- If a player stops heartbeating for more than **45 seconds**, that player becomes **inactive** but is not removed yet.
- Inactive players remain in the room, but in the lobby their **Ready** status is reset to **false**.
- If a player continues without a heartbeat for more than **3 minutes**, that player is removed from the room automatically.
- Automatic inactive/removed-player handling applies in both lobby and in-game states.
- If the current host becomes inactive or is removed and other active players remain, a new host is promoted from the active remaining players.
- If stale-player cleanup leaves no players in the room, the room ends immediately.
- Each player can toggle their own **Ready** status.
- The host may start the game only if:
  - activePlayerCount ≥ 2 AND all active players are Ready
- Once the host starts the game, it transitions to Round 1's Choice phase.

---

## 7.2 Phase 1 — Choice (60s)
### UI
- Stacked vertical buttons for Side A and Side B (fitting mobile “candybar” layout).

### Player action
- Each player chooses exactly one side: **A** or **B**.
- Once chosen, it is **locked** for the round (cannot be reversed).

### Timeout handling
At the end of 60 seconds:
1. **Assign missing choices toward the most balanced final split possible**:
   - Keep all explicit player choices fixed.
   - Assign the missing-choice players so that the final Side A / Side B split has the smallest possible absolute difference.
   - If multiple final assignments are equally balanced, choose randomly among those equally balanced outcomes.
2. **Ensure both sides are populated only when necessary**:
   - After missing-choice assignment, if one side is still empty, force-assign the minimum number of players from the populated side needed to make the final split as balanced as possible.
   - Choose the force-assigned players randomly from the populated side, without replacement.
   - If both sides are already populated after missing-choice assignment, do not change any explicit or auto-assigned choices further, even if the split is uneven.

### Advancement
- The phase ends early only if all players have chosen.
- Otherwise, it ends at the 60-second timeout after applying the above rules.
- Then transitions to **Argument**.

---

## 7.3 Phase 2 — Argument (Timed side turns)
Argument is split into two turns: one for each side, with order alternating by round.

### Turn order by round index
Let rounds be 0-indexed:
- Even rounds (0, 2, 4, ...): **A then B**
- Odd rounds (1, 3, 5, ...): **B then A**

### Side time budget
- Base time budget per side per round: **120 seconds**
- Dissenter penalty may reduce the budget for one side in the next round (see Section 8):
  - Reduced budget: **100 seconds** (120 - 20) for that side only
  - Penalties never stack

### End Turn behavior
- Only players on the currently speaking side see an **End Turn** control.
- **Any single player** on the speaking side may end that side’s turn early by pressing and holding the button for 2 seconds (prevents accidents).
- If End Turn is triggered:
  - If this was the first side turn, control passes to the other side’s turn.
  - If this was the second side turn, the phase advances to **Rebuttal**.

### Timeout behavior
- If the speaking side’s timer hits 0:
  - If first side turn: pass to the other side.
  - If second side turn: advance to **Rebuttal**.

---

## 7.4 Phase 3 — Rebuttal (60s)
- Free-form discussion; no turns.
- Timer is visible.
- The phase ends when:
  - timer reaches 0, OR
  - the host explicitly advances early by pressing and holding an **Advance** button for 2 seconds (button only visible on host's UI)
- Game transitions to **Verdict**.

---

## 7.5 Phase 4 — Verdict (60s)
Players submit their view of the round result.

### Allowed verdicts
- **A_WON**
- **B_WON**
- **DRAW**

### Locking
- Once a player submits a verdict, it is locked for the round.

### Timeout handling
At 60 seconds:
- Any missing verdict becomes **ABSTAIN** (not counted toward consensus or dissenter logic).

### Advancement
- The phase ends early only if all players have submitted verdicts.
- Otherwise, it ends at timeout after applying missing → ABSTAIN.
- Then transitions to **Resolution**.

---

## 7.6 Phase 5 — Resolution (Host-advanced, no timer)
Resolution phase:
- Computes the round outcome
- Applies penalties and bonuses (if any)
- Updates per player scores
- Shows the scoreboard
- Awaits the host to proceed

### Outcome computation
- Ignore any **ABSTAIN** verdicts.
- **Quorum check**: if fewer than **2** non-abstaining verdicts were submitted, outcome is **DRAW**.
- **Unanimity check**: if all non-abstaining verdicts match, outcome is that result.
- Otherwise: outcome is **DRAW**.

### Penalties and Bonuses
- See Section 8.

### Advancement
- The host sees a control to:
  - proceed to next round (if rounds remain), or
  - proceed to game over (after the final round).
- Host absence guardrail: If the host is not present in the room’s player list during Resolution, auto-promote a new host from the remaining players. If there are no remaining players to promote, mark the room `ended` immediately.

---

## 8. Scoring and Anti-cheat Mechanics

### 8.1 Scoring
- If outcome is **A_WON**:
  - Each player whose **Choice** was A gains **+1** point.
- If outcome is **B_WON**:
  - Each player whose **Choice** was B gains **+1** point.
- If outcome is **DRAW**:
  - No points are awarded.

### 8.2 Lone-side bonus
At the end of Choice resolution:
- If the round had fewer than **3** players at Choice resolution time, no bonus applies.
- Otherwise, if exactly one player is the sole representative of their side after all timeout assignment / empty-side correction is complete, that player becomes **bonus-eligible** for the round.
- If the bonus-eligible player’s side wins the round, that player gains **+1 extra point** (total **+2** for that round).
- If the round outcome is **DRAW**, no points are awarded, including the bonus.
- Bonus eligibility is based on the final resolved side distribution for the round, regardless of whether the lone-side player arrived there via explicit choice, missing-choice auto-assignment, or empty-side force-assignment.

### 8.3 Dissenter penalty (strict trigger, non-stacking)
Penalty is **computed during the Resolution phase**, based **only on verdicts submitted in the Verdict phase**, and **ignoring ABSTAIN**.

A dissenter penalty applies **only** when:
- All non-abstaining verdicts are the same **except for one** (a single outlier).
- In other words: among non-abstaining voters, it’s all-but-one vs one.
- Edge case handling: If there are exactly two non-abstaining votes and they disagree (1–1), no dissenter.

Examples (penalty applies):
- 3 players vote A_WON, 1 votes DRAW (and nobody abstains) → the DRAW voter is the dissenter.
- 4 vote DRAW, 1 votes B_WON → the B_WON voter is the dissenter.

Examples (penalty does NOT apply):
- 2 vote A_WON, 2 vote B_WON → no dissenter.
- 3 vote A_WON, 1 vote B_WON, 1 vote DRAW → no dissenter (three-way split).
- Everyone abstains → no dissenter.

Effect:
- The single player whose non-abstaining verdict differs from all other non-abstaining verdicts is marked as the dissenter for this round.
- The round outcome remains computed as in §7.6 (typically DRAW when not unanimous).

Penalty:
- The dissenter carries a **20-second argument time deduction** into the **next round only**:
  - In the next round’s Argument phase, the side the dissenter chooses (or is assigned to) receives **100s** budget instead of 120s.
- Non-stacking rule:
  - The penalty does **not** accumulate.
  - A player can carry at most one pending penalty at any time.
  - Once applied in the next round’s Argument phase, it is cleared.

---

## 9. Scoreboard and Winner

### 9.1 Scoreboard display
- During Resolution, all players see a basic scoreboard for the session (avatars + names + points tally).

### 9.2 Game Over
After the final round:
- Show a winner screen with:
  - top player(s) (ties allowed)
  - full scoreboard
- All players see a **Return to Main** button.

---

## 10. Room End-of-life

### 10.1 End behavior
- When the game ends and players return to main, the room is considered **ended**.
- If automatic stale-player cleanup removes the final remaining player, the room is also considered **ended** immediately.
- The MVP does not support restarting another full game within the same room.

### 10.2 Expiry
- When a game ends, the room is marked:
  - `status = ended`
  - `expiresAt = now + 2 hours`

- Until `expiresAt`, ended-room data may remain readable (e.g., for late clients).
- After `expiresAt`, the room may be deleted at any time. Deletion is best-effort (not guaranteed to happen exactly at `expiresAt`).
- `status = ended` is the definitive signal that a room cannot be resumed or rejoined.

---

## 11. Constraints and Safety (MVP)

### 11.1 Disconnections
- The MVP does not provide manual reconnect flows or room rejoin after eviction. Recovery is limited to heartbeat-based presence plus a short foreground recovery gate.
- In-room clients are considered present while periodic heartbeats succeed.
- If a player has no heartbeat for more than **45 seconds**, that player becomes **inactive**. Inactive players stay in the room, but lobby readiness resets and inactive players do not count toward lobby start gating.
- If a player has no heartbeat for more than **3 minutes**, that player becomes eligible for automatic removal from the room.
- When a player returns to a foregrounded tab while still in the room, the client runs a short recovery gate: it waits for a heartbeat result before allowing room actions or automatic phase-driving ticks to proceed. If the heartbeat succeeds, play resumes immediately. If the player was already removed, the client exits them from the room cleanly.
- Automatic inactive/removed-player handling applies during both lobby and in-game states, with host promotion or immediate room ending handled by the normal room lifecycle rules.
- Timed phases and timeout rules still ensure the game progresses regardless of missing player input.
- If a player becomes inactive or is removed mid-round, any already-recorded choice/verdict data for that round is not rewritten.
- Inactive or removed players are no longer considered active participants for controls, lobby readiness, lobby start gating, or future scoring updates.
- Inactivity does not introduce special early-completion behavior for timed phases: the existing “all submitted or deadline” phase rules still apply to the remaining in-room player set until hard removal occurs.

### 11.2 Common-sense security
- Do not commit secrets.
- Do not expose privileged credentials in client code.
- No need for enterprise-grade security posture for MVP beyond standard best practices.

### 11.3 Content safety for prompts
- Prompts should avoid hate, slurs, harassment, or targeted protected-group content.
- Prompts should be playful and broadly socially acceptable.

---

## 12. Open Items (Explicitly Deferred)
- Custom room configuration options (round count, timers, modes).
- Tie-break logic beyond joint winners.
- Additional anti-griefing controls (vote-kick, host override readiness, etc.).
- Asset pipeline (avatars, UI theme, sound effects).
- Room-code abuse guardrails: For the MVP, rate limiting and other similar guardrails are deferred.
