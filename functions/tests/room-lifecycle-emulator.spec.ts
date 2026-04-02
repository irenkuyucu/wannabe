import assert from "node:assert/strict";
import test from "node:test";

import { getFirestore } from "firebase-admin/firestore";

import { FirestoreRoomStore } from "../src/data/firestore-room-store";
import {
  HARD_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RoomLifecycleService,
  SOFT_TIMEOUT_MS,
} from "../src/domain/room-lifecycle";

const runWithEmulator = process.env.FIRESTORE_EMULATOR_HOST ? test : test.skip;

async function clearFirestoreEmulator(): Promise<void> {
  const projectId = process.env.GCLOUD_PROJECT ?? "wannabe-game";
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const flushUrl = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;

  const response = await fetch(flushUrl, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to clear Firestore emulator. HTTP ${response.status}`);
  }
}

runWithEmulator("room lifecycle persists records in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  let now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const service = new RoomLifecycleService(store, () => now, () => 0.000321);
  const db = getFirestore();

  const created = await service.createRoom({
    uid: "host-uid",
    displayName: "Alex",
    avatarId: "avatar-1",
  });
  assert.equal(created.roomCode, "000321");

  const joined = await service.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Alex",
  });
  assert.equal(joined.assignedDisplayName, "Alex (2)");

  await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });
  await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });

  now += 5_000;
  await service.startGame({ uid: "host-uid", roomId: created.roomId });

  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const hostSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("host-uid")
    .get();
  const p2Snapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("p2")
    .get();

  assert.equal(roomSnapshot.get("status"), "inGame");
  assert.equal(roomSnapshot.get("phase"), "choice");
  assert.equal(roomSnapshot.get("phaseDeadlineAtMs"), now + 60_000);
  assert.equal(hostSnapshot.get("displayName"), "Alex");
  assert.equal(p2Snapshot.get("displayName"), "Alex (2)");
});

runWithEmulator("heartbeatRoom persists presence timestamps and hard-timeout sweeps end empty rooms", async () => {
  await clearFirestoreEmulator();

  let now = 1_710_000_100_000;
  const store = new FirestoreRoomStore();
  const service = new RoomLifecycleService(store, () => now, () => 0.000322);
  const db = getFirestore();

  const created = await service.createRoom({
    uid: "host-uid",
    displayName: "Alex",
  });

  now += HEARTBEAT_INTERVAL_MS;
  await service.heartbeatRoom({
    uid: "host-uid",
    roomId: created.roomId,
  });

  const beforeStale = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("host-uid")
    .get();
  assert.equal(beforeStale.get("lastSeenAtMs"), now);

  await store.updatePlayer(created.roomId, "host-uid", {
    lastSeenAtMs: now - HARD_TIMEOUT_MS - 1,
  });

  const sweep = await service.sweepStaleRooms();
  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const hostSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("host-uid")
    .get();

  assert.deepEqual(sweep, {
    roomsProcessed: 1,
    playersRemoved: 1,
  });
  assert.equal(roomSnapshot.get("status"), "ended");
  assert.equal(hostSnapshot.exists, false);
});

runWithEmulator(
  "lobby actions soft-timeout a stale host, reset ready, and promote an active guest in Firestore emulator",
  async () => {
    await clearFirestoreEmulator();

    const now = 1_710_000_200_000;
    const store = new FirestoreRoomStore();
    const service = new RoomLifecycleService(store, () => now, () => 0.000323);
    const db = getFirestore();

    const created = await service.createRoom({
      uid: "host-uid",
      displayName: "Alex",
    });

    await service.joinRoom({
      uid: "p2",
      roomCode: created.roomCode,
      displayName: "Blake",
    });
    await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });

    await store.updatePlayer(created.roomId, "host-uid", {
      lastSeenAtMs: now - SOFT_TIMEOUT_MS - 1,
    });

    await service.setReady({ uid: "p2", roomId: created.roomId, ready: true });

    const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
    const hostSnapshot = await db
      .collection("rooms")
      .doc(created.roomId)
      .collection("players")
      .doc("host-uid")
      .get();
    const guestSnapshot = await db
      .collection("rooms")
      .doc(created.roomId)
      .collection("players")
      .doc("p2")
      .get();

    assert.equal(roomSnapshot.get("hostPlayerId"), "p2");
    assert.equal(roomSnapshot.get("hostPromotionNonce"), 1);
    assert.equal(roomSnapshot.get("lastPromotedHostPlayerId"), "p2");
    assert.equal(hostSnapshot.get("ready"), false);
    assert.equal(guestSnapshot.get("ready"), true);
  },
);

runWithEmulator(
  "lobby actions hard-timeout a stale guest and keep the remaining active host in Firestore emulator",
  async () => {
    await clearFirestoreEmulator();

    const now = 1_710_000_300_000;
    const store = new FirestoreRoomStore();
    const service = new RoomLifecycleService(store, () => now, () => 0.000324);
    const db = getFirestore();

    const created = await service.createRoom({
      uid: "host-uid",
      displayName: "Alex",
    });

    await service.joinRoom({
      uid: "p2",
      roomCode: created.roomCode,
      displayName: "Blake",
    });
    await store.updatePlayer(created.roomId, "p2", {
      lastSeenAtMs: now - HARD_TIMEOUT_MS - 1,
    });

    await service.setReady({ uid: "host-uid", roomId: created.roomId, ready: true });

    const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
    const hostSnapshot = await db
      .collection("rooms")
      .doc(created.roomId)
      .collection("players")
      .doc("host-uid")
      .get();
    const guestSnapshot = await db
      .collection("rooms")
      .doc(created.roomId)
      .collection("players")
      .doc("p2")
      .get();

    assert.equal(roomSnapshot.get("status"), "lobby");
    assert.equal(roomSnapshot.get("hostPlayerId"), "host-uid");
    assert.equal(hostSnapshot.get("ready"), true);
    assert.equal(guestSnapshot.exists, false);

    await assert.rejects(
      () => service.startGame({ uid: "host-uid", roomId: created.roomId }),
      /At least two active players/i,
    );
  },
);
