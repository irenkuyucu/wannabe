import assert from "node:assert/strict";
import test from "node:test";

import {
  RoomLifecycleService,
  validateDisplayName,
  validateRoomCode,
} from "../src/domain/room-lifecycle";
import { assertHttpsErrorCode, InMemoryRoomStore } from "./test-helpers";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

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
