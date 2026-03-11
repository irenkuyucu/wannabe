import assert from "node:assert/strict";
import test from "node:test";

import { getFirestore } from "firebase-admin/firestore";

import { FirestoreRoomStore } from "../src/data/firestore-room-store";
import { RoomLifecycleService } from "../src/domain/room-lifecycle";
import { RoundActionService } from "../src/domain/round-actions";

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

async function createResolutionGame(params?: { playerIds?: string[] }) {
  let now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, () => 0.5);
  const playerIds = params?.playerIds ?? ["host", "p2", "p3"];
  const displayNames = ["Host", "Blake", "Casey", "Devon"];

  const created = await lifecycle.createRoom({
    uid: playerIds[0],
    displayName: displayNames[0],
  });

  for (const [index, playerId] of playerIds.slice(1).entries()) {
    await lifecycle.joinRoom({
      uid: playerId,
      roomCode: created.roomCode,
      displayName: displayNames[index + 1],
    });
  }

  for (const playerId of playerIds) {
    await lifecycle.setReady({
      uid: playerId,
      roomId: created.roomId,
      ready: true,
    });
  }

  await lifecycle.startGame({ uid: playerIds[0], roomId: created.roomId });
  await actions.submitChoice({ uid: playerIds[0], roomId: created.roomId, side: "A" });
  await actions.submitChoice({ uid: playerIds[1], roomId: created.roomId, side: "B" });

  for (const playerId of playerIds.slice(2)) {
    await actions.submitChoice({ uid: playerId, roomId: created.roomId, side: "A" });
  }

  await actions.endArgumentTurn({ uid: playerIds[0], roomId: created.roomId });
  await actions.endArgumentTurn({ uid: playerIds[1], roomId: created.roomId });
  await actions.advanceRebuttal({ uid: playerIds[0], roomId: created.roomId });

  for (const playerId of playerIds) {
    await actions.submitVerdict({
      uid: playerId,
      roomId: created.roomId,
      verdict: "DRAW",
    });
  }

  return {
    store,
    actions,
    created,
    playerIds,
    get now() {
      return now;
    },
    set now(value: number) {
      now = value;
    },
  };
}

runWithEmulator("round actions persist timed transitions in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  let now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const randomValues = [0, 0, 0, 0.75];
  let randomIndex = 0;
  const random = () => {
    const next = randomValues[randomIndex] ?? 0.5;
    randomIndex += 1;
    return next;
  };
  const actions = new RoundActionService(store, () => now, random);
  const db = getFirestore();

  const created = await lifecycle.createRoom({
    uid: "host",
    displayName: "Host",
  });

  for (const [joiner, displayName] of [
    ["p2", "Blake"],
    ["p3", "Casey"],
    ["p4", "Devon"],
  ] as const) {
    await lifecycle.joinRoom({
      uid: joiner,
      roomCode: created.roomCode,
      displayName,
    });
    await lifecycle.setReady({
      uid: joiner,
      roomId: created.roomId,
      ready: true,
    });
  }

  await lifecycle.setReady({ uid: "host", roomId: created.roomId, ready: true });
  await lifecycle.startGame({ uid: "host", roomId: created.roomId });

  await actions.submitChoice({ uid: "host", roomId: created.roomId, side: "A" });

  now += 60_000;
  await actions.tickRoom({ uid: "p2", roomId: created.roomId });
  now += 120_000;
  await actions.tickRoom({ uid: "p3", roomId: created.roomId });
  now += 120_000;
  await actions.tickRoom({ uid: "p4", roomId: created.roomId });
  now += 60_000;
  await actions.tickRoom({ uid: "host", roomId: created.roomId });

  await actions.submitVerdict({ uid: "host", roomId: created.roomId, verdict: "A_WON" });
  await actions.submitVerdict({ uid: "p2", roomId: created.roomId, verdict: "A_WON" });
  await actions.submitVerdict({ uid: "p3", roomId: created.roomId, verdict: "DRAW" });

  now += 60_000;
  await actions.tickRoom({ uid: "p4", roomId: created.roomId });
  await actions.advanceResolution({ uid: "host", roomId: created.roomId });

  await actions.submitChoice({ uid: "host", roomId: created.roomId, side: "A" });
  await actions.submitChoice({ uid: "p2", roomId: created.roomId, side: "A" });
  await actions.submitChoice({ uid: "p3", roomId: created.roomId, side: "B" });
  await actions.submitChoice({ uid: "p4", roomId: created.roomId, side: "A" });

  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const roundZeroSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("rounds")
    .doc("0")
    .get();
  const roundOneSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("rounds")
    .doc("1")
    .get();

  assert.equal(roomSnapshot.get("phase"), "argument");
  assert.equal(roomSnapshot.get("activeArgumentSide"), "B");
  assert.equal(roomSnapshot.get("pendingPenaltyPlayerId"), null);
  assert.equal(roomSnapshot.get("phaseDeadlineAtMs"), now + 100_000);
  assert.equal(roundZeroSnapshot.get("forcedAssignedPlayerId"), "p4");
  assert.equal(roundZeroSnapshot.get("verdictsByPlayer.p4"), "ABSTAIN");
  assert.equal(roundZeroSnapshot.get("outcome"), "DRAW");
  assert.equal(roundZeroSnapshot.get("dissenterPlayerId"), "p3");
  assert.equal(roundOneSnapshot.get("penalizedSide"), "B");
  assert.equal(typeof roundOneSnapshot.get("promptId"), "string");
});

runWithEmulator("resolution host guardrail promotes the next remaining player in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const game = await createResolutionGame();
  const db = getFirestore();

  await game.store.deletePlayer(game.created.roomId, "host");

  await assert.rejects(
    () => game.actions.advanceResolution({ uid: "p3", roomId: game.created.roomId }),
    /Only host can advance from resolution/i,
  );

  const promotedSnapshot = await db.collection("rooms").doc(game.created.roomId).get();
  assert.equal(promotedSnapshot.get("hostPlayerId"), "p2");

  const result = await game.actions.advanceResolution({
    uid: "p2",
    roomId: game.created.roomId,
  });
  const advancedSnapshot = await db.collection("rooms").doc(game.created.roomId).get();

  assert.deepEqual(result, { nextState: "inGame", roundIndex: 1 });
  assert.equal(advancedSnapshot.get("hostPlayerId"), "p2");
  assert.equal(advancedSnapshot.get("phase"), "choice");
});
