# Two-Tier Presence Model + Recovery Gate

Replace the current single 45-second eviction threshold with a two-tier model that separates "inactive" from "evicted," fix correctness bugs, harden the client-side presence handling, and add a recovery gate for deterministic return behavior.

## User Review Required

> [!IMPORTANT]
> **Hard timeout value**: Proposing **3 minutes** for the hard eviction threshold. Covers a typical phone call or app switch while still cleaning up truly-gone players within a reasonable window for a 20–30 minute game session.

> [!IMPORTANT]
> **No UI changes for inactive players**: This plan does not add a visual "away" indicator to the player list. Players in the same physical room already know who stepped away. Remote-play indicators are a separate task.

## Policy Decisions (Locked)

| Scenario | Rule |
|----------|------|
| Soft timeout (45s) | Mark inactive. Reset `ready: false` in lobby. Transfer host to a random active player if needed. Do NOT evict. |
| Hard timeout (3min) | Evict (delete player doc). Promote host from remaining players if needed. End room if empty. |
| Hard timeout finality | Hard timeout means "eligible for cleanup." The client-side recovery gate ensures that when a player returns, their heartbeat resolves before any game action or phase tick fires. Once evicted by sweep or another player's action, the eviction is final. |
| Host returns after soft timeout | Stays non-host. No auto-restore. |
| Inactive player returns | Recovery gate sends heartbeat and awaits result. If heartbeat succeeds, player resumes immediately. If it fails (already evicted), player exits cleanly. |
| Post-hard-eviction return | Player is out. Sees "You were removed from the room due to inactivity." No rejoin path. |
| Lobby start gate | Only active players count toward minimum-2 and all-ready checks. Inactive players are ignored. |
| In-game phase completion | Inactive players do NOT change phase completion logic. Early completion (all submitted) still requires ALL remaining players. Phases complete via deadline timeout if inactive players haven't submitted. This is existing behavior — no code change needed. |
| Submitted choices/verdicts | Persist through inactivity. No change needed. |

---

## Proposed Changes

### Backend Domain Logic

#### [MODIFY] [room-lifecycle.ts](file:///Users/irencankuyucu/wannabe/functions/src/domain/room-lifecycle.ts)

This file carries the heaviest changes.

**1. Constants** — rename and add:
```diff
-export const STALE_PLAYER_TIMEOUT_MS = 45_000;
+export const SOFT_TIMEOUT_MS = 45_000;
+export const HARD_TIMEOUT_MS = 180_000;
```

**2. Return type** — extend `StaleRoomCleanupResult` with inactive tracking:
```diff
 export type StaleRoomCleanupResult = {
   room: RoomRecord | null;
   players: PlayerRecord[];
   removedPlayerIds: string[];
+  inactivePlayerIds: string[];
 };
```

**3. `pruneStalePlayersForRoom`** — refactor for two tiers:

Signature unchanged:
```typescript
export async function pruneStalePlayersForRoom(params: {
  store: RoomLifecycleStore;
  room: RoomRecord;
  nowMs: number;
  random?: () => number;
}): Promise<StaleRoomCleanupResult>
```

New logic (replacing current single-pass approach):
1. List all players.
2. Compute two cutoffs: `softCutoffMs = nowMs - SOFT_TIMEOUT_MS`, `hardCutoffMs = nowMs - HARD_TIMEOUT_MS`.
3. Categorize each player:
   - **Active**: `lastSeenAtMs > softCutoffMs`
   - **Inactive** (soft): `lastSeenAtMs <= softCutoffMs AND > hardCutoffMs`
   - **Abandoned** (hard): `lastSeenAtMs <= hardCutoffMs`
4. **Hard pass**: delete all abandoned players.
5. **Soft pass** (lobby only): for each inactive player with `ready === true`, write `ready: false`.
6. **Host transfer**: if the current host is abandoned OR inactive, and there are active players, promote a random active player via `pickPromotedHost(activePlayers)`. If no active players exist (all are inactive or abandoned), skip promotion — the hard timeout will eventually resolve it, or a returning player will trigger cleanup.
7. Re-list remaining players (active + inactive).
8. If nobody remains, end the room.
9. Return `{ room, players, removedPlayerIds, inactivePlayerIds }`.

**4. `heartbeatRoom`** — fix self-eviction race:

The fix is to refresh `lastSeenAtMs` BEFORE running cleanup. This prevents the calling player from being categorized as inactive or abandoned by their own heartbeat.

```diff
 async heartbeatRoom(params) {
   const uid = this.requireUid(params.uid);
   const roomId = validateRoomId(params.roomId);
   const room = await this.store.getRoom(roomId);
   if (!room) throw ...;

+  // Refresh timestamp BEFORE cleanup so the caller cannot
+  // be categorized as stale by their own heartbeat.
+  const player = await this.store.getPlayer(roomId, uid);
+  if (!player) throw new HttpsError("not-found", "Player is not in this room.");
+  await this.store.updatePlayer(roomId, uid, { lastSeenAtMs: this.nowMs() });

-  await this.cleanupRoomPresence(roomId);
-  const player = await this.store.getPlayer(roomId, uid);
-  if (!player) throw ...;
-  await this.store.updatePlayer(roomId, uid, { lastSeenAtMs: this.nowMs() });
+  await this.cleanupRoomPresence(roomId);

   return { ok: true };
 }
```

> [!NOTE]
> If the player was already hard-evicted by a prior sweep or another player's action before this heartbeat arrives, `getPlayer` returns null and we throw "Player is not in this room." — which is correct. The pre-refresh only helps players who haven't been evicted yet.

**5. `startGame`** — gate on active players only:

After cleanup, derive active players by filtering out `inactivePlayerIds`:
```typescript
const activePlayers = cleanedRoom.players.filter(
  (p) => !cleanedRoom.inactivePlayerIds.includes(p.playerId),
);

if (activePlayers.length < 2) {
  throw new HttpsError(
    "failed-precondition",
    "At least two active players are required to start the game.",
  );
}
if (!activePlayers.every((p) => p.ready)) {
  throw new HttpsError(
    "failed-precondition",
    "All active players must be ready before the game can start.",
  );
}
```

**6. `sweepStaleRooms`** — use soft cutoff to find rooms needing any cleanup:

```diff
 async sweepStaleRooms() {
   const now = this.nowMs();
-  const stalePlayers = await this.store.listStalePlayers(now - STALE_PLAYER_TIMEOUT_MS);
+  const stalePlayers = await this.store.listStalePlayers(now - SOFT_TIMEOUT_MS);
   // ... rest stays the same — cleanupRoomPresence handles both tiers internally
 }
```

---

#### [MODIFY] [round-actions.ts](file:///Users/irencankuyucu/wannabe/functions/src/domain/round-actions.ts)

No changes. The `loadMemberContext` and `advanceResolution` calls to `pruneStalePlayersForRoom` remain unchanged.

The rationale: the client-side recovery gate (see below) blocks all game-action callables until the foreground heartbeat resolves. By the time any callable from the returning player reaches `loadMemberContext`, the heartbeat has already refreshed their `lastSeenAtMs`. If the player was already hard-evicted before the heartbeat arrived, the heartbeat itself fails and the recovery gate exits the player — no game-action callable is ever sent.

The `ensureActiveHost` fallback remains as-is — it handles the "host doc completely missing" case after hard eviction. Soft-timeout host promotion is now handled upstream in `pruneStalePlayersForRoom`.

---

### Firestore Configuration

#### [MODIFY] [firestore.indexes.json](file:///Users/irencankuyucu/wannabe/firestore.indexes.json)

> [!CAUTION]
> **Required for production deployment.** Without this index, the `sweepDisconnectedPlayers` scheduled function will fail with `FAILED_PRECONDITION`. The emulator does NOT enforce indexes, so this cannot be validated locally.

```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "players",
      "fieldPath": "lastSeenAtMs",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" },
        { "order": "DESCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

---

### Client — Presence Hardening + Recovery Gate

#### [MODIFY] [wannabe-app.tsx](file:///Users/irencankuyucu/wannabe/src/components/wannabe-app.tsx)

**1. Add recovery gate state and ref:**

```typescript
const [isRecoveringPresence, setIsRecoveringPresence] = useState(false);
const wasHiddenRef = useRef(false);
```

**2. Add `visibilitychange` effect with recovery gate:**

New `useEffect` after the existing heartbeat interval effect (~L421):
```typescript
useEffect(() => {
  if (
    !shouldMaintainRoomPresence({
      roomId,
      roomStatus: room?.status,
      currentPlayerId: currentPlayer?.playerId ?? null,
    })
  ) {
    return undefined;
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      wasHiddenRef.current = true;
      // Best-effort last heartbeat. May not complete before
      // the browser suspends JS — the design does not depend on it.
      void sendRoomHeartbeat();
      return;
    }

    // Tab became visible.
    if (!wasHiddenRef.current) {
      return;
    }
    wasHiddenRef.current = false;

    // Enter recovery: block actions and phase ticks until
    // the heartbeat confirms we're still in the room.
    setIsRecoveringPresence(true);

    (async () => {
      try {
        await heartbeatRoom({ roomId: roomId! });
        setIsRecoveringPresence(false);
      } catch (error) {
        if (isLostRoomMembershipError(error)) {
          void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
        } else {
          // Transient error (network blip) — clear gate and
          // let the next interval heartbeat retry.
          setIsRecoveringPresence(false);
          handleRoomActionError(error);
        }
      }
    })();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [currentPlayer?.playerId, handleReturnToMain, handleRoomActionError, room?.status, roomId, sendRoomHeartbeat]);
```

> [!NOTE]
> The recovery gate calls `heartbeatRoom` directly (not via `sendRoomHeartbeat`) and awaits the result. `sendRoomHeartbeat` is fire-and-forget and does not set recovery state. The `hidden` path still uses the fire-and-forget `sendRoomHeartbeat` because we can't block on `hidden`.

**3. Fix heartbeat interval effect dependency array** — prevent recreation on every player mutation (score, ready, etc.):

```diff
-  }, [currentPlayer, handleRoomActionError, room?.status, roomId]);
+  }, [currentPlayer?.playerId, handleRoomActionError, room?.status, roomId]);
```

```diff
-  }, [currentPlayer, room?.status, roomId, sendRoomHeartbeat]);
+  }, [currentPlayer?.playerId, room?.status, roomId, sendRoomHeartbeat]);
```

**4. Guard all action handlers with recovery gate:**

Add `isRecoveringPresence` check to every action handler:
```typescript
async function handleSubmitChoice(side: "A" | "B") {
  if (!roomId || isRecoveringPresence) return;
  // ...
}
```

Same pattern for: `handleReadyToggle`, `handleStartGame`, `handleEndArgumentTurn`, `handleAdvanceRebuttal`, `handleSubmitVerdict`, `handleAdvanceResolution`, `handleEndGameReturnToMain`.

**5. Suppress phase tick while recovering:**

```diff
 useEffect(() => {
   if (
     !roomId ||
     !room ||
     room.status !== "inGame" ||
     room.phase === null ||
     room.phase === "resolution" ||
     room.phaseDeadlineAtMs === null ||
-    !currentPlayer
+    !currentPlayer ||
+    isRecoveringPresence
   ) {
     return undefined;
   }
   // ... phase tick logic
-}, [currentPlayer, players, room, roomId]);
+}, [currentPlayer, isRecoveringPresence, players, room, roomId]);
```

**6. Handle `PERMISSION_DENIED` in snapshot error callback** — targeted, not broad:

Instead of widening `isLostRoomMembershipError`, handle permission errors specifically in the `subscribeToLobby` error callback where we have membership context:

```typescript
// In the subscribeToLobby onError callback (~L239):
onError: (message) => {
  startTransition(() => {
    if (
      hadActiveMembershipRef.current &&
      /Missing or insufficient permissions/i.test(message)
    ) {
      void handleReturnToMain(ROOM_DISCONNECTED_MESSAGE);
      return;
    }
    setErrorMessage(message);
  });
},
```

This is precise: only treat permission errors as eviction when we KNOW the player had an active membership. A fresh page load with broken auth or a real rules mistake will still show the raw error.

`isLostRoomMembershipError` in `firebase-client.ts` stays narrow — no changes.

---

#### [MODIFY] [firebase-client.ts](file:///Users/irencankuyucu/wannabe/src/lib/firebase-client.ts)

No changes. `isLostRoomMembershipError` keeps its intentionally narrow patterns.

---

#### [MODIFY] [room-presence.ts](file:///Users/irencankuyucu/wannabe/src/lib/room-presence.ts)

Update the disconnection message:
```diff
-export const ROOM_DISCONNECTED_MESSAGE = "You were disconnected from the room.";
+export const ROOM_DISCONNECTED_MESSAGE = "You were removed from the room due to inactivity.";
```

---

### Backend Tests

#### [MODIFY] [room-lifecycle.test.ts](file:///Users/irencankuyucu/wannabe/functions/tests/room-lifecycle.test.ts)

Update existing tests and add new ones:

1. **Update imports**: `STALE_PLAYER_TIMEOUT_MS` → `SOFT_TIMEOUT_MS`, add `HARD_TIMEOUT_MS`.

2. **Update existing cleanup tests** to use `HARD_TIMEOUT_MS` for eviction assertions.

3. **New tests**:
   - `soft timeout marks player as inactive without evicting` — player past 45s but under 3min is returned in `inactivePlayerIds` but still in `players`.
   - `soft timeout resets ready flag in lobby` — inactive player in lobby has `ready: false` after cleanup.
   - `soft timeout does not reset ready during inGame` — inactive player during a game keeps state untouched.
   - `soft timeout transfers host to random active player` — host past 45s, active players remain → host transferred, old host still in room.
   - `soft timeout skips host transfer when all players are inactive` — all past 45s → host stays, no promotion.
   - `hard timeout evicts player` — player past 3min is deleted.
   - `heartbeatRoom pre-refresh prevents self-eviction` — player past hard timeout calls heartbeat, timestamp refreshes, player survives.
   - `heartbeatRoom after hard eviction returns not-found` — player already deleted by sweep, heartbeat throws "Player is not in this room."
   - `startGame requires minimum 2 active players` — 3 players, 1 inactive, 2 active+ready → succeeds. Then 3 players, 2 inactive → fails.
   - `startGame ignores inactive players for ready gate` — inactive player doesn't block start.

---

### Client Tests

#### [MODIFY] [room-presence.ts](file:///Users/irencankuyucu/wannabe/src/lib/room-presence.ts)

Extract a pure helper for the recovery-gate decision to keep the logic testable outside of React:

```typescript
export function shouldEnterPresenceRecovery(params: {
  wasHidden: boolean;
  isVisible: boolean;
  roomId: string | null;
  roomStatus: RoomDoc["status"] | null | undefined;
  currentPlayerId: string | null | undefined;
}): boolean {
  const { wasHidden, isVisible, roomId, roomStatus, currentPlayerId } = params;

  return Boolean(
    wasHidden &&
      isVisible &&
      shouldMaintainRoomPresence({ roomId, roomStatus, currentPlayerId }),
  );
}
```

The `visibilitychange` handler in `wannabe-app.tsx` uses this helper instead of inlining the condition. This keeps the React component thin and the decision logic unit-testable.

#### [MODIFY] [room-presence.test.mjs](file:///Users/irencankuyucu/wannabe/tests/room-presence.test.mjs)

Add unit tests for the new helper:

- `shouldEnterPresenceRecovery returns true when tab was hidden and becomes visible with active membership` — all conditions met → true.
- `shouldEnterPresenceRecovery returns false when tab was not previously hidden` — `wasHidden: false` → false.
- `shouldEnterPresenceRecovery returns false when room is ended` — `roomStatus: "ended"` → false.
- `shouldEnterPresenceRecovery returns false when no current player` — `currentPlayerId: null` → false.

Also update the existing `ROOM_DISCONNECTED_MESSAGE` assertion to match the new wording.

#### [NEW] [recovery-gate.test.tsx](file:///Users/irencankuyucu/wannabe/tests/recovery-gate.test.tsx)

Component-level tests using the existing JSDOM + `@testing-library/react` harness (`react-test-env.tsx`). These tests mock `heartbeatRoom` and simulate `visibilitychange` events to verify the recovery gate's integration in `WannabeApp`:

> [!NOTE]
> These tests render `WannabeApp` with mocked Firebase services (auth, Firestore subscriptions, callables). The existing `ui-components.test.tsx` already demonstrates this pattern with mocked props. The recovery gate tests use the same setup approach, stubbing `heartbeatRoom` to control its resolution.

4 test cases:

1. **`recovery gate blocks actions while heartbeat is pending`** — Simulate `hidden` → `visible`. While the mocked heartbeat promise is unresolved, verify that action buttons (e.g., ready toggle) are non-responsive (click handler returns early).

2. **`successful heartbeat clears recovery and resumes play`** — Simulate `hidden` → `visible`. Resolve the mocked heartbeat with `{ ok: true }`. Verify `isRecoveringPresence` is cleared and action buttons become responsive.

3. **`failed heartbeat with lost membership exits to main`** — Simulate `hidden` → `visible`. Reject the mocked heartbeat with a "Player is not in this room" error. Verify the app navigates to main with the inactivity message.

4. **`phase auto-tick is suppressed during recovery`** — Set up an in-game room with an expired phase deadline. Simulate `hidden` → `visible` with the heartbeat pending. Verify `tickRoom` is NOT called while recovering. Resolve the heartbeat successfully. Verify `tickRoom` is then scheduled.

---

## Verification Plan

### Automated Tests
```bash
# Backend unit tests
cd functions && pnpm test

# Client unit + component tests (includes recovery gate)
pnpm test:web

# Full verify (lint + types + all tests)
pnpm verify
```

The `test:web` script (`node --import tsx --test tests/*.test.mjs tests/*.test.tsx`) automatically picks up the new `recovery-gate.test.tsx`.

### Index Validation
The collection group index in `firestore.indexes.json` cannot be validated on the emulator. It must be verified by:
1. Inspecting the JSON schema (it's small and deterministic).
2. Deploying via `firebase deploy --only firestore:indexes` when the project reaches production deployment.

### Manual Mobile Testing
1. **Soft timeout**: Open game on phone → join room → switch to another app for ~60s → return. Verify player is still in the room, not evicted.
2. **Hard timeout + recovery gate**: Background tab for 3+ minutes, ensure the sweep has run. Return to tab. Verify the recovery gate fires, heartbeat fails, and player sees "removed due to inactivity."
3. **Soft timeout + recovery gate**: Background tab for ~60s (past soft, under hard). Return to tab. Verify recovery gate fires, heartbeat succeeds, player resumes normally.
4. **Lobby ready reset**: Set ready → background for 45+ seconds → have another player trigger an action. Verify ready state resets.
5. **Host transfer on soft timeout**: Make host go inactive for 45+ seconds. Verify another active player is promoted. Verify returning host stays non-host.
6. **Visibility heartbeat**: Background and foreground quickly (<45s). Verify player was never marked inactive.
