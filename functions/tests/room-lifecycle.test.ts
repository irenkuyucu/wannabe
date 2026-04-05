import assert from "node:assert/strict";
import test from "node:test";

import {
  HARD_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RoomLifecycleService,
  SOFT_TIMEOUT_MS,
  validateDisplayName,
  validateRoomCode,
} from "../src/domain/room-lifecycle";
import { assertHttpsErrorCode, InMemoryRoomStore } from "./test-helpers";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

async function setPresenceTimestamp(
  store: InMemoryRoomStore,
  roomId: string,
  playerId: string,
  lastSeenAtMs: number,
) {
  await Promise.all([
    store.updatePlayer(roomId, playerId, {
      lastSeenAtMs,
    }),
    store.updatePresence(roomId, playerId, {
      lastSeenAtMs,
    }),
  ]);
}

test("display name validation enforces MVP rules", () => {
  assert.equal(validateDisplayName("Alex"), "Alex");
  assert.equal(validateDisplayName("Jean-Luc"), "Jean-Luc");
  assert.equal(validateDisplayName("abcdefghijkl"), "abcdefghijkl");

  assert.throws(
    () => validateDisplayName(" Alex"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
  assert.throws(
    () => validateDisplayName("Al3x"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
  assert.throws(
    () => validateDisplayName("O'Neil"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
  assert.throws(
    () => validateDisplayName("Çağla"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
  assert.throws(
    () => validateDisplayName("abcdefghijklm"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
});

test("room code validation enforces 6-digit numeric values", () => {
  assert.equal(validateRoomCode("123456"), "123456");
  assert.throws(
    () => validateRoomCode("12345"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
  assert.throws(
    () => validateRoomCode("12ab56"),
    (error: unknown) => assertHttpsErrorCode(error, "invalid-argument"),
  );
});

test("room lifecycle supports create/join collisions/ready/start", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.000123);

  const created = await service.createRoom({
    uid: "host-uid",
    displayName: "Alex",
    avatarId: "avatar-1",
  });
  assert.equal(created.roomCode, "000123");
  assert.equal(created.roomId, "000123");

  const join2 = await service.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Alex",
  });
  assert.equal(join2.assignedDisplayName, "Alex (2)");

  const join3 = await service.joinRoom({
    uid: "p3",
    roomCode: created.roomCode,
    displayName: "Alex",
  });
  assert.equal(join3.assignedDisplayName, "Alex (3)");

  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p3", roomId: created.roomId, ready: true });

  const started = await service.startGame({ uid: "host-uid", roomId: created.roomId });
  assert.deepEqual(started, {
    roundIndex: 0,
    phase: "choice",
    deadlineAtMs: now + 60_000,
  });

  const room = await store.getRoom(created.roomId);
  const round = await store.getRound(created.roomId, 0);
  assert.equal(room?.status, "inGame");
  assert.equal(room?.phase, "choice");
  assert.equal(room?.phaseDeadlineAtMs, now + 60_000);
  assert.equal(room?.currentPromptId, round?.promptId);
  assert.equal(room?.activeArgumentSide, null);
  assert.equal(room?.pendingPenaltyPlayerId, null);
  assert.equal(round?.roundIndex, 0);
  assert.equal(typeof round?.promptId, "string");
});

test("create and join allocate matching presence records", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.000123);

  const created = await service.createRoom({
    uid: "host-uid",
    displayName: "Alex",
    avatarId: "avatar-1",
  });
  await service.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Blake",
  });

  const hostPresence = await store.getPresence(created.roomId, "host-uid");
  const guestPresence = await store.getPresence(created.roomId, "p2");

  assert.deepEqual(hostPresence, {
    playerId: "host-uid",
    lastSeenAtMs: now,
  });
  assert.deepEqual(guestPresence, {
    playerId: "p2",
    lastSeenAtMs: now,
  });
});

test("start game enforces host/all-ready/joinable constraints", async () => {
  const store = new InMemoryRoomStore();
  const service = new RoomLifecycleService(store, () => 1_710_000_000_000, () => 0.5);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });

  await assert.rejects(
    () => service.startGame({ uid: "host-uid", roomId: created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "failed-precondition"),
  );

  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });

  await assert.rejects(
    () => service.startGame({ uid: "p2", roomId: created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "permission-denied"),
  );

  await service.startGame({ uid: "host-uid", roomId: created.roomId });

  await assert.rejects(
    () => service.joinRoom({ uid: "p3", roomCode: created.roomCode, displayName: "Casey" }),
    (error: unknown) => assertHttpsErrorCode(error, "failed-precondition"),
  );
});

test("start game ignores inactive players for lobby gating", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.5);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.joinRoom({ uid: "p3", roomCode: created.roomCode, displayName: "Casey" });

  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p3", roomId: created.roomId, ready: true });

  await setPresenceTimestamp(store, created.roomId, "p3", now - SOFT_TIMEOUT_MS - 1);

  const started = await service.startGame({ uid: "host-uid", roomId: created.roomId });
  const inactivePlayer = await store.getPlayer(created.roomId, "p3");

  assert.equal(started.phase, "choice");
  assert.equal(inactivePlayer?.ready, false);
});

test("start game requires at least two active players", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.5);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.joinRoom({ uid: "p3", roomCode: created.roomCode, displayName: "Casey" });

  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p3", roomId: created.roomId, ready: true });

  await setPresenceTimestamp(store, created.roomId, "p2", now - SOFT_TIMEOUT_MS - 1);
  await setPresenceTimestamp(store, created.roomId, "p3", now - SOFT_TIMEOUT_MS - 1);

  await assert.rejects(
    () => service.startGame({ uid: "host-uid", roomId: created.roomId }),
    (error: unknown) =>
      error instanceof Error &&
      assertHttpsErrorCode(error, "failed-precondition") &&
      /At least two active players/i.test(error.message),
  );
});

test("leave room handles host reassignment and ended state", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.3);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });

  const hostLeft = await service.leaveRoom({ uid: "host-uid", roomId: created.roomId });
  assert.equal(hostLeft.roomStatus, "lobby");

  const roomAfterHostLeave = await store.getRoom(created.roomId);
  assert.equal(roomAfterHostLeave?.hostPlayerId, "p2");
  assert.equal(roomAfterHostLeave?.hostPromotionNonce, 1);
  assert.equal(roomAfterHostLeave?.lastPromotedHostPlayerId, "p2");

  const finalLeave = await service.leaveRoom({ uid: "p2", roomId: created.roomId });
  assert.equal(finalLeave.roomStatus, "ended");

  const roomAfterFinalLeave = await store.getRoom(created.roomId);
  assert.equal(roomAfterFinalLeave?.status, "ended");
  assert.equal(roomAfterFinalLeave?.expiresAtMs, now + ROOM_TTL_MS);
});

test("lobby actions promote a replacement host when the current host is already gone", async () => {
  const store = new InMemoryRoomStore();
  const service = new RoomLifecycleService(store, () => 1_710_000_000_000, () => 0);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.joinRoom({ uid: "p3", roomCode: created.roomCode, displayName: "Casey" });

  await store.deletePlayer(created.roomId, "host-uid");
  await store.deletePresence(created.roomId, "host-uid");

  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });

  const roomAfterReady = await store.getRoom(created.roomId);
  assert.equal(roomAfterReady?.hostPlayerId, "p2");
  assert.equal(roomAfterReady?.hostPromotionNonce, 1);
  assert.equal(roomAfterReady?.lastPromotedHostPlayerId, "p2");

  await service.setReady({ uid: "p3", roomId: created.roomId, ready: true });
  const started = await service.startGame({ uid: "p2", roomId: created.roomId });

  assert.deepEqual(started, {
    roundIndex: 0,
    phase: "choice",
    deadlineAtMs: 1_710_000_060_000,
  });
});

test("heartbeatRoom refreshes the active player's presence timestamp", async () => {
  const store = new InMemoryRoomStore();
  let now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  now += HEARTBEAT_INTERVAL_MS;

  const heartbeat = await service.heartbeatRoom({
    uid: "host-uid",
    roomId: created.roomId,
  });
  const host = await store.getPlayer(created.roomId, "host-uid");
  const hostPresence = await store.getPresence(created.roomId, "host-uid");

  assert.deepEqual(heartbeat, { ok: true });
  assert.equal(host?.lastSeenAtMs, now);
  assert.equal(hostPresence?.lastSeenAtMs, now);
});

test("heartbeatRoom pre-refresh prevents self-eviction after hard timeout", async () => {
  const store = new InMemoryRoomStore();
  let now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await setPresenceTimestamp(store, created.roomId, "host-uid", now - HARD_TIMEOUT_MS - 1);

  now += HEARTBEAT_INTERVAL_MS;
  const heartbeat = await service.heartbeatRoom({
    uid: "host-uid",
    roomId: created.roomId,
  });
  const host = await store.getPlayer(created.roomId, "host-uid");

  assert.deepEqual(heartbeat, { ok: true });
  assert.equal(host?.lastSeenAtMs, now);
});

test("heartbeatRoom returns not-found after hard eviction already happened", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_000_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await setPresenceTimestamp(store, created.roomId, "host-uid", now - HARD_TIMEOUT_MS - 1);

  await service.cleanupRoomPresence(created.roomId);

  await assert.rejects(
    () => service.heartbeatRoom({ uid: "host-uid", roomId: created.roomId }),
    (error: unknown) => assertHttpsErrorCode(error, "not-found"),
  );
});

test("cleanupRoomPresence prefers dedicated presence records when present", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_050_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });

  await store.updatePlayer(created.roomId, "p2", {
    lastSeenAtMs: now,
  });
  await store.updatePresence(created.roomId, "p2", {
    lastSeenAtMs: now - HARD_TIMEOUT_MS - 1,
  });

  const cleaned = await service.cleanupRoomPresence(created.roomId);
  const stalePlayer = await store.getPlayer(created.roomId, "p2");
  const stalePresence = await store.getPresence(created.roomId, "p2");

  assert.deepEqual(cleaned.removedPlayerIds, ["p2"]);
  assert.equal(stalePlayer, null);
  assert.equal(stalePresence, null);
});

test("cleanupRoomPresence marks soft-timed-out players inactive without removing them", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_100_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });

  await setPresenceTimestamp(store, created.roomId, "p2", now - SOFT_TIMEOUT_MS - 1);

  const cleaned = await service.cleanupRoomPresence(created.roomId);
  const host = await store.getPlayer(created.roomId, "host-uid");
  const inactive = await store.getPlayer(created.roomId, "p2");

  assert.deepEqual(cleaned.removedPlayerIds, []);
  assert.deepEqual(cleaned.inactivePlayerIds, ["p2"]);
  assert.equal(cleaned.players.length, 2);
  assert.equal(host?.playerId, "host-uid");
  assert.equal(inactive?.ready, false);
});

test("cleanupRoomPresence does not reset ready during in-game soft timeout", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_200_000;
  const service = new RoomLifecycleService(store, () => now, () => 0);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await service.startGame({ uid: "host-uid", roomId: created.roomId });

  await setPresenceTimestamp(store, created.roomId, "p2", now - SOFT_TIMEOUT_MS - 1);

  const cleaned = await service.cleanupRoomPresence(created.roomId);
  const player = await store.getPlayer(created.roomId, "p2");

  assert.deepEqual(cleaned.removedPlayerIds, []);
  assert.deepEqual(cleaned.inactivePlayerIds, ["p2"]);
  assert.equal(player?.ready, true);
});

test("cleanupRoomPresence promotes a fresh player when the host becomes inactive", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_200_000;
  const service = new RoomLifecycleService(store, () => now, () => 0);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });
  await service.joinRoom({ uid: "p3", roomCode: created.roomCode, displayName: "Casey" });

  await setPresenceTimestamp(store, created.roomId, "host-uid", now - SOFT_TIMEOUT_MS - 1);

  const cleaned = await service.cleanupRoomPresence(created.roomId);
  const room = await store.getRoom(created.roomId);
  const host = await store.getPlayer(created.roomId, "host-uid");

  assert.deepEqual(cleaned.removedPlayerIds, []);
  assert.deepEqual(cleaned.inactivePlayerIds, ["host-uid"]);
  assert.equal(room?.hostPlayerId, "p2");
  assert.equal(room?.hostPromotionNonce, 1);
  assert.equal(room?.lastPromotedHostPlayerId, "p2");
  assert.equal(host?.playerId, "host-uid");
});

test("cleanupRoomPresence evicts hard-timed-out non-host players without removing fresh players", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_100_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await service.joinRoom({ uid: "p2", roomCode: created.roomCode, displayName: "Blake" });

  await setPresenceTimestamp(store, created.roomId, "p2", now - HARD_TIMEOUT_MS - 1);

  const cleaned = await service.cleanupRoomPresence(created.roomId);
  const host = await store.getPlayer(created.roomId, "host-uid");
  const removed = await store.getPlayer(created.roomId, "p2");
  const removedPresence = await store.getPresence(created.roomId, "p2");

  assert.deepEqual(cleaned.removedPlayerIds, ["p2"]);
  assert.deepEqual(cleaned.inactivePlayerIds, []);
  assert.equal(cleaned.players.length, 1);
  assert.equal(cleaned.players[0]?.playerId, "host-uid");
  assert.equal(host?.playerId, "host-uid");
  assert.equal(removed, null);
  assert.equal(removedPresence, null);
});

test("sweepStaleRooms ends a room when the final remaining player is stale", async () => {
  const store = new InMemoryRoomStore();
  const now = 1_710_000_300_000;
  const service = new RoomLifecycleService(store, () => now, () => 0.25);

  const created = await service.createRoom({ uid: "host-uid", displayName: "Host" });
  await setPresenceTimestamp(store, created.roomId, "host-uid", now - HARD_TIMEOUT_MS - 1);

  const sweep = await service.sweepStaleRooms();
  const room = await store.getRoom(created.roomId);
  const host = await store.getPlayer(created.roomId, "host-uid");
  const hostPresence = await store.getPresence(created.roomId, "host-uid");

  assert.deepEqual(sweep, {
    roomsProcessed: 1,
    playersRemoved: 1,
  });
  assert.equal(room?.status, "ended");
  assert.equal(room?.expiresAtMs, now + ROOM_TTL_MS);
  assert.equal(host, null);
  assert.equal(hostPresence, null);
});
