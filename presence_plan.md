# Presence / Disconnect Handling Plan

Companion to [presence_spec.md](/Users/irencankuyucu/wannabe/presence_spec.md).

Within the scope of presence, heartbeats, inactivity, disconnect cleanup, and foreground recovery behavior, this auxiliary plan and its paired spec take precedence over the main [SPEC.md](/Users/irencankuyucu/wannabe/SPEC.md) and [PLAN.md](/Users/irencankuyucu/wannabe/PLAN.md) until the feature is implemented and reconciled back into the main files.

## Scope
- Replace the current single-threshold disconnect behavior with a two-tier presence model: `45s` soft timeout to inactive, `3m` hard timeout to removal.
- Keep implementation inside the existing Firebase + web stack: callable heartbeats, Firestore-backed cleanup, scheduled sweep, and client-side recovery gate.
- Preserve current in-game phase-completion rules while making lobby gating and return-from-background behavior deterministic.

## Task Breakdown

| Task ID | Task | Deliverables | Agent-owned validation | User-owned validation | Gate |
|---|---|---|---|---|---|
| P-T1 | Backend presence lifecycle | `SOFT_TIMEOUT_MS` / `HARD_TIMEOUT_MS`, two-tier stale-player cleanup, active-player lobby start gating, heartbeat pre-refresh, scheduled stale-player sweep, required Firestore index update | targeted functions unit tests for room lifecycle and presence rules | None | PASS on green checks |
| P-T2 | Client recovery gate and disconnect UX | foreground recovery gate, hidden/visible heartbeat handling, recovery-aware action guards, recovery-aware phase-tick suppression, targeted permission-error exit handling, explicit leave on return-to-main, updated presence helper/message utilities | targeted web tests for recovery helper and component integration | None | PASS on green checks |
| P-T3 | Feature verification sweep | backend + client test additions completed, emulator coverage for stale cleanup behavior, full feature verification run, required docs/log updates bundled with implementation | `pnpm test:functions`, `pnpm test:web`, emulator presence scenarios, `pnpm verify` | None | PASS on green checks |
| P-T4 | Mobile/background validation handoff | final presence/disconnect checklist executed against built behavior, any user-reported observations captured in logs/state before reconciliation | rerun impacted agent-owned checks after any follow-up fix | Real-device validation of background/foreground recovery and removal behavior | User-deferred until post-M5 deployed validation; then PENDING until user outcome; then PASS/FAIL |

## Task Notes

### P-T1 Notes
- Keep direct authoritative presence writes behind callable Functions; do not widen Firestore client write access.
- Soft timeout resets lobby `ready` and can trigger host promotion, but does not remove the player.
- Hard timeout removes the player, promotes a replacement host when possible, and ends the room if no players remain.
- In-game early-completion behavior remains unchanged until hard removal occurs.

### P-T2 Notes
- The recovery gate is local client state only; it is not a new backend subsystem.
- On foreground return after a hidden period, the client must await `heartbeatRoom` before allowing actions or automatic phase-driving ticks.
- If the awaited heartbeat fails because the player was already removed, the client exits to main with the inactivity message.
- Transient non-membership errors should not be silently reclassified unless the client has room-membership context proving eviction.

### P-T3 Notes
- Feature verification must include both backend and client coverage; presence behavior is not complete with functions-only tests.
- Emulator coverage should exercise scheduled cleanup and member-action-triggered cleanup separately.
- All documentation/log updates required by repo workflow ship with the same task commit as the implementation they describe.

### P-T4 Notes
- This task exists because the main risk surface is real mobile browser background/foreground behavior.
- The user approved deferring this validation until a post-M5 deployed environment is available, rather than blocking ongoing implementation on LAN/local-phone setup work.
- Extra emulator coverage now certifies the lobby-side timeout effects that do not depend on real mobile browser suspension behavior, reducing but not eliminating the remaining validation surface.
- The deferment does not count as completion; the checklist below still must be executed before the feature can be treated as fully release-validated.
- If the mobile validation uncovers behavior that contradicts [presence_spec.md](/Users/irencankuyucu/wannabe/presence_spec.md), stop and reconcile spec/plan before further coding.

## Required Automated Test Scenarios
1. Heartbeat callable updates `lastSeenAtMs` while direct authoritative client writes remain disallowed by rules.
2. Soft timeout marks a player inactive without evicting them.
3. Soft timeout resets lobby `ready` and excludes inactive players from lobby start gating.
4. Soft timeout promotes a replacement host from active players when the host becomes inactive.
5. Hard timeout removes the stale player, promotes a replacement host when available, and ends the room when none remain.
6. Mid-round inactivity/removal preserves already-recorded choice/verdict data and does not rewrite round history.
7. Timed phase completion behavior remains unchanged for inactive players until hard removal occurs.
8. Foreground recovery helper enters recovery only when the tab was hidden, is visible again, and active room membership should still be maintained.
9. Recovery gate blocks room actions while the awaited heartbeat is pending.
10. Successful recovery heartbeat clears the gate and allows normal play to continue.
11. Failed recovery heartbeat with lost membership exits the player to main with the inactivity message.
12. Automatic phase-driving ticks are suppressed while the recovery gate is active.
13. Scheduled cleanup processes soft/hard stale-player handling even when no active client triggers cleanup.

## User-Owned Validation Checklist
1. Background a phone/browser tab for about `60s`, return, and confirm the player resumes in-room without eviction.
2. Background a phone/browser tab for `3m+`, ensure cleanup has run, return, and confirm the player is removed with the inactivity message.
3. In lobby, set ready, background past soft timeout, and confirm another player sees ready reset before game start.
4. Make the host inactive past soft timeout and confirm another active player becomes host while the returning host stays non-host.
5. Background and foreground quickly and confirm there is no visible control glitch or accidental first-tap loss on return.

## Assumptions and Defaults
1. Presence cadence is fixed for this feature at `15s` heartbeat, `45s` soft timeout, `3m` hard timeout, and `1m` scheduled sweep cadence.
2. No RTDB presence, `onDisconnect`, away indicators, or post-eviction rejoin flow are added in this feature.
3. The recovery gate is intentionally lightweight and limited to foreground return behavior; it is not a general reconnect subsystem.
