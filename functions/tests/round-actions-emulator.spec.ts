import assert from "node:assert/strict";
import test from "node:test";

import { getFirestore } from "firebase-admin/firestore";

import { FirestoreRoomStore } from "../src/data/firestore-room-store";
import { getArgumentTurnOrder, type Side, type VerdictVote } from "../src/domain/game-domain";
import { ROOM_TTL_MS, RoomLifecycleService } from "../src/domain/room-lifecycle";
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

async function createResolutionGame(params?: {
  playerIds?: string[];
  actionRandom?: () => number;
}) {
  let now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, params?.actionRandom ?? (() => 0));
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

async function createStartedGame(params?: {
  playerIds?: string[];
  actionRandom?: () => number;
}) {
  let now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, params?.actionRandom ?? (() => 0.5));
  const playerIds = params?.playerIds ?? ["host", "p2", "p3", "p4"];
  const [hostId, ...joiners] = playerIds;
  const joinerNames = ["Blake", "Casey", "Devon", "Elliot", "Frankie"];

  const created = await lifecycle.createRoom({
    uid: hostId,
    displayName: "Host",
  });

  for (const [index, joinerId] of joiners.entries()) {
    await lifecycle.joinRoom({
      uid: joinerId,
      roomCode: created.roomCode,
      displayName: joinerNames[index] ?? `Guest ${String.fromCharCode(65 + index)}`,
    });
  }

  for (const playerId of playerIds) {
    await lifecycle.setReady({
      uid: playerId,
      roomId: created.roomId,
      ready: true,
    });
  }

  await lifecycle.startGame({
    uid: hostId,
    roomId: created.roomId,
  });

  return {
    store,
    lifecycle,
    actions,
    created,
    playerIds,
    async refreshPresence(activePlayerIds = playerIds) {
      await Promise.all(
        activePlayerIds.map((playerId) =>
          store.updatePresence(created.roomId, playerId, {
            lastSeenAtMs: now,
          }),
        ),
      );
    },
    get now() {
      return now;
    },
    set now(value: number) {
      now = value;
    },
  };
}

async function playRound(
  game: Awaited<ReturnType<typeof createStartedGame>>,
  params: {
    roundIndex: number;
    choicesByPlayer: Record<string, Side>;
    verdictsByPlayer: Partial<Record<string, Exclude<VerdictVote, "ABSTAIN">>>;
    expectedOutcome: "A_WON" | "B_WON" | "DRAW";
    expectedBonusEligiblePlayerId: string | null;
    expectedDissenterPlayerId: string | null;
    expectedPenalizedPlayerId: string | null;
    expectedInitialBudgetSeconds: number;
    expectVerdictTimeout?: boolean;
    finalRound?: boolean;
  },
) {
  const hostId = game.playerIds[0];

  for (const playerId of game.playerIds) {
    await game.actions.submitChoice({
      uid: playerId,
      roomId: game.created.roomId,
      side: params.choicesByPlayer[playerId],
    });
  }

  const roomAfterChoices = await game.store.getRoom(game.created.roomId);
  const roundAfterChoices = await game.store.getRound(game.created.roomId, params.roundIndex);
  const [firstSide, secondSide] = getArgumentTurnOrder(params.roundIndex);
  assert.equal(roomAfterChoices?.phase, "argument");
  assert.equal(roomAfterChoices?.activeArgumentSide, firstSide);
  assert.equal(roomAfterChoices?.phaseDeadlineAtMs, game.now + params.expectedInitialBudgetSeconds * 1000);
  assert.equal(roundAfterChoices?.bonusEligiblePlayerId, params.expectedBonusEligiblePlayerId);
  assert.equal(roundAfterChoices?.penalizedPlayerId, params.expectedPenalizedPlayerId);

  const firstSpeakerId = game.playerIds.find(
    (playerId) => params.choicesByPlayer[playerId] === firstSide,
  );
  assert.ok(firstSpeakerId);
  await game.actions.endArgumentTurn({
    uid: firstSpeakerId,
    roomId: game.created.roomId,
  });

  const roomAfterFirstTurn = await game.store.getRoom(game.created.roomId);
  assert.equal(roomAfterFirstTurn?.phase, "argument");
  assert.equal(roomAfterFirstTurn?.activeArgumentSide, secondSide);
  assert.equal(roomAfterFirstTurn?.phaseDeadlineAtMs, game.now + 120_000);

  const secondSpeakerId = game.playerIds.find(
    (playerId) => params.choicesByPlayer[playerId] === secondSide,
  );
  assert.ok(secondSpeakerId);
  await game.actions.endArgumentTurn({
    uid: secondSpeakerId,
    roomId: game.created.roomId,
  });

  const roomAfterSecondTurn = await game.store.getRoom(game.created.roomId);
  assert.equal(roomAfterSecondTurn?.phase, "rebuttal");
  assert.equal(roomAfterSecondTurn?.phaseDeadlineAtMs, game.now + 60_000);

  await game.actions.advanceRebuttal({
    uid: hostId,
    roomId: game.created.roomId,
  });

  for (const playerId of Object.keys(params.verdictsByPlayer)) {
    await game.actions.submitVerdict({
      uid: playerId,
      roomId: game.created.roomId,
      verdict: params.verdictsByPlayer[playerId]!,
    });
  }

  if (params.expectVerdictTimeout) {
    game.now += 60_000;
    await game.refreshPresence();
    await game.actions.tickRoom({
      uid: hostId,
      roomId: game.created.roomId,
    });
  }

  const roomAfterVerdicts = await game.store.getRoom(game.created.roomId);
  const resolvedRound = await game.store.getRound(game.created.roomId, params.roundIndex);
  assert.equal(roomAfterVerdicts?.phase, "resolution");
  assert.equal(resolvedRound?.outcome, params.expectedOutcome);
  assert.equal(resolvedRound?.dissenterPlayerId, params.expectedDissenterPlayerId);

  if (params.expectVerdictTimeout) {
    for (const playerId of game.playerIds) {
      assert.ok(resolvedRound?.verdictsByPlayer[playerId]);
    }
  }

  const advanceResult = await game.actions.advanceResolution({
    uid: hostId,
    roomId: game.created.roomId,
  });

  if (params.finalRound) {
    assert.deepEqual(advanceResult, {
      nextState: "ended",
      roundIndex: params.roundIndex,
    });
    return;
  }

  assert.deepEqual(advanceResult, {
    nextState: "inGame",
    roundIndex: params.roundIndex + 1,
  });

  const nextRoom = await game.store.getRoom(game.created.roomId);
  assert.equal(nextRoom?.phase, "choice");
  assert.equal(nextRoom?.roundIndex, params.roundIndex + 1);
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
  const refreshPresence = async (playerIds: string[]) => {
    await Promise.all(
      playerIds.map((playerId) =>
        store.updatePresence(created.roomId, playerId, {
          lastSeenAtMs: now,
        }),
      ),
    );
  };

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
  await refreshPresence(["host", "p2", "p3", "p4"]);
  await actions.tickRoom({ uid: "p2", roomId: created.roomId });
  now += 120_000;
  await refreshPresence(["host", "p2", "p3", "p4"]);
  await actions.tickRoom({ uid: "p3", roomId: created.roomId });
  now += 120_000;
  await refreshPresence(["host", "p2", "p3", "p4"]);
  await actions.tickRoom({ uid: "p4", roomId: created.roomId });
  now += 60_000;
  await refreshPresence(["host", "p2", "p3", "p4"]);
  await actions.tickRoom({ uid: "host", roomId: created.roomId });

  await actions.submitVerdict({ uid: "host", roomId: created.roomId, verdict: "A_WON" });
  await actions.submitVerdict({ uid: "p2", roomId: created.roomId, verdict: "A_WON" });
  await actions.submitVerdict({ uid: "p3", roomId: created.roomId, verdict: "DRAW" });

  now += 60_000;
  await refreshPresence(["host", "p2", "p3", "p4"]);
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
  const roundZeroChoices = roundZeroSnapshot.get("choicesByPlayer");
  const roundZeroSides = Object.values(roundZeroChoices ?? {});
  assert.deepEqual(roundZeroSnapshot.get("autoAssignedPlayerIds").sort(), ["p2", "p3", "p4"]);
  assert.equal(roundZeroSnapshot.get("forceAssignedPlayerIds").length, 0);
  assert.equal(roundZeroSnapshot.get("bonusEligiblePlayerId"), null);
  assert.equal(roundZeroSides.filter((side) => side === "A").length, 2);
  assert.equal(roundZeroSides.filter((side) => side === "B").length, 2);
  assert.equal(roundZeroSnapshot.get("verdictsByPlayer.p4"), "ABSTAIN");
  assert.equal(roundZeroSnapshot.get("outcome"), "DRAW");
  assert.equal(roundZeroSnapshot.get("dissenterPlayerId"), "p3");
  assert.equal(roundOneSnapshot.get("penalizedPlayerId"), "p3");
  assert.equal(typeof roundOneSnapshot.get("promptId"), "string");
});

runWithEmulator("full ten-round lifecycle persists deterministic state in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const game = await createStartedGame();
  const db = getFirestore();
  const promptIds = new Set<string>();

  await playRound(game, {
    roundIndex: 0,
    choicesByPlayer: { host: "A", p2: "B", p3: "A", p4: "B" },
    verdictsByPlayer: {
      host: "A_WON",
      p2: "A_WON",
      p3: "DRAW",
      p4: "A_WON",
    },
    expectedOutcome: "DRAW",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: "p3",
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 0))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 1,
    choicesByPlayer: { host: "A", p2: "A", p3: "B", p4: "A" },
    verdictsByPlayer: {
      host: "B_WON",
      p2: "B_WON",
      p3: "B_WON",
      p4: "B_WON",
    },
    expectedOutcome: "B_WON",
    expectedBonusEligiblePlayerId: "p3",
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: "p3",
    expectedInitialBudgetSeconds: 100,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 1))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 2,
    choicesByPlayer: { host: "B", p2: "B", p3: "A", p4: "B" },
    verdictsByPlayer: {
      host: "B_WON",
      p2: "B_WON",
      p3: "B_WON",
      p4: "B_WON",
    },
    expectedOutcome: "B_WON",
    expectedBonusEligiblePlayerId: "p3",
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 2))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 3,
    choicesByPlayer: { host: "A", p2: "A", p3: "B", p4: "B" },
    verdictsByPlayer: {
      host: "A_WON",
      p2: "A_WON",
      p3: "A_WON",
      p4: "A_WON",
    },
    expectedOutcome: "A_WON",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 3))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 4,
    choicesByPlayer: { host: "A", p2: "A", p3: "B", p4: "B" },
    verdictsByPlayer: {
      host: "DRAW",
      p2: "DRAW",
    },
    expectedOutcome: "DRAW",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
    expectVerdictTimeout: true,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 4))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 5,
    choicesByPlayer: { host: "B", p2: "B", p3: "B", p4: "A" },
    verdictsByPlayer: {
      host: "A_WON",
      p2: "A_WON",
      p3: "A_WON",
      p4: "A_WON",
    },
    expectedOutcome: "A_WON",
    expectedBonusEligiblePlayerId: "p4",
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 5))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 6,
    choicesByPlayer: { host: "A", p2: "B", p3: "A", p4: "A" },
    verdictsByPlayer: {
      host: "B_WON",
      p2: "B_WON",
      p3: "B_WON",
      p4: "B_WON",
    },
    expectedOutcome: "B_WON",
    expectedBonusEligiblePlayerId: "p2",
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 6))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 7,
    choicesByPlayer: { host: "A", p2: "B", p3: "A", p4: "B" },
    verdictsByPlayer: {
      host: "A_WON",
      p2: "A_WON",
      p3: "A_WON",
      p4: "A_WON",
    },
    expectedOutcome: "A_WON",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 7))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 8,
    choicesByPlayer: { host: "A", p2: "B", p3: "A", p4: "B" },
    verdictsByPlayer: {
      host: "B_WON",
      p2: "B_WON",
      p3: "B_WON",
      p4: "B_WON",
    },
    expectedOutcome: "B_WON",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 8))?.promptId ?? "");

  await playRound(game, {
    roundIndex: 9,
    choicesByPlayer: { host: "A", p2: "B", p3: "A", p4: "B" },
    verdictsByPlayer: {
      host: "DRAW",
      p2: "DRAW",
      p3: "DRAW",
      p4: "DRAW",
    },
    expectedOutcome: "DRAW",
    expectedBonusEligiblePlayerId: null,
    expectedDissenterPlayerId: null,
    expectedPenalizedPlayerId: null,
    expectedInitialBudgetSeconds: 120,
    finalRound: true,
  });
  promptIds.add((await game.store.getRound(game.created.roomId, 9))?.promptId ?? "");

  const roomSnapshot = await db.collection("rooms").doc(game.created.roomId).get();
  const roundSnapshots = await db
    .collection("rooms")
    .doc(game.created.roomId)
    .collection("rounds")
    .get();
  const scores = Object.fromEntries(
    await Promise.all(
      game.playerIds.map(async (playerId) => {
        const player = await game.store.getPlayer(game.created.roomId, playerId);
        return [playerId, player?.score ?? null];
      }),
    ),
  );

  assert.equal(promptIds.size, 10);
  assert.equal(roundSnapshots.size, 10);
  assert.equal(roomSnapshot.get("status"), "ended");
  assert.equal(roomSnapshot.get("phase"), null);
  assert.equal(roomSnapshot.get("expiresAtMs"), game.now + ROOM_TTL_MS);
  assert.deepEqual(scores, {
    host: 3,
    p2: 5,
    p3: 3,
    p4: 4,
  });

  await assert.rejects(
    () =>
      game.lifecycle.joinRoom({
        uid: "p5",
        roomCode: game.created.roomCode,
        displayName: "Elliot",
      }),
    /Room is not joinable/i,
  );
});

runWithEmulator("resolution host guardrail promotes the next remaining player in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const game = await createResolutionGame();
  const db = getFirestore();

  await game.store.deletePlayer(game.created.roomId, "host");
  await game.store.deletePresence(game.created.roomId, "host");

  await assert.rejects(
    () => game.actions.advanceResolution({ uid: "p3", roomId: game.created.roomId }),
    /Only host can advance from resolution/i,
  );

  const promotedSnapshot = await db.collection("rooms").doc(game.created.roomId).get();
  assert.equal(promotedSnapshot.get("hostPlayerId"), "p2");
  assert.equal(promotedSnapshot.get("hostPromotionNonce"), 1);
  assert.equal(promotedSnapshot.get("lastPromotedHostPlayerId"), "p2");

  const result = await game.actions.advanceResolution({
    uid: "p2",
    roomId: game.created.roomId,
  });
  const advancedSnapshot = await db.collection("rooms").doc(game.created.roomId).get();

  assert.deepEqual(result, { nextState: "inGame", roundIndex: 1 });
  assert.equal(advancedSnapshot.get("hostPlayerId"), "p2");
  assert.equal(advancedSnapshot.get("phase"), "choice");
});

runWithEmulator("final round ending persists ended status and expiry in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, () => 0.5);
  const db = getFirestore();

  const created = await lifecycle.createRoom({
    uid: "host",
    displayName: "Host",
  });

  await lifecycle.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Blake",
  });
  await lifecycle.setReady({ uid: "host", roomId: created.roomId, ready: true });
  await lifecycle.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await lifecycle.startGame({ uid: "host", roomId: created.roomId });
  await store.updateRoom(created.roomId, { roundsTotal: 1 });

  await actions.submitChoice({ uid: "host", roomId: created.roomId, side: "A" });
  await actions.submitChoice({ uid: "p2", roomId: created.roomId, side: "B" });
  await actions.endArgumentTurn({ uid: "host", roomId: created.roomId });
  await actions.endArgumentTurn({ uid: "p2", roomId: created.roomId });
  await actions.advanceRebuttal({ uid: "host", roomId: created.roomId });
  await actions.submitVerdict({ uid: "host", roomId: created.roomId, verdict: "DRAW" });
  await actions.submitVerdict({ uid: "p2", roomId: created.roomId, verdict: "DRAW" });

  const result = await actions.advanceResolution({
    uid: "host",
    roomId: created.roomId,
  });
  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const roundSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("rounds")
    .doc("0")
    .get();

  assert.deepEqual(result, { nextState: "ended", roundIndex: 0 });
  assert.equal(roomSnapshot.get("status"), "ended");
  assert.equal(roomSnapshot.get("phase"), null);
  assert.equal(roomSnapshot.get("expiresAtMs"), now + ROOM_TTL_MS);
  assert.equal(roundSnapshot.get("outcome"), "DRAW");

  await assert.rejects(
    () =>
      lifecycle.joinRoom({
        uid: "p3",
        roomCode: created.roomCode,
        displayName: "Casey",
      }),
    /Room is not joinable/i,
  );
});

runWithEmulator("concurrent choice submissions still advance to argument in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, () => 0.5);
  const db = getFirestore();

  const created = await lifecycle.createRoom({
    uid: "host",
    displayName: "Host",
  });

  await lifecycle.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Blake",
  });
  await lifecycle.setReady({ uid: "host", roomId: created.roomId, ready: true });
  await lifecycle.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await lifecycle.startGame({ uid: "host", roomId: created.roomId });

  await Promise.all([
    actions.submitChoice({ uid: "host", roomId: created.roomId, side: "A" }),
    actions.submitChoice({ uid: "p2", roomId: created.roomId, side: "B" }),
  ]);

  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const roundSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("rounds")
    .doc("0")
    .get();

  assert.equal(roomSnapshot.get("phase"), "argument");
  assert.equal(roundSnapshot.get("choicesByPlayer.host"), "A");
  assert.equal(roundSnapshot.get("choicesByPlayer.p2"), "B");
});

runWithEmulator("concurrent verdict submissions resolve once in Firestore emulator", async () => {
  await clearFirestoreEmulator();

  const now = 1_710_000_000_000;
  const store = new FirestoreRoomStore();
  const lifecycle = new RoomLifecycleService(store, () => now, () => 0.000321);
  const actions = new RoundActionService(store, () => now, () => 0.5);
  const db = getFirestore();

  const created = await lifecycle.createRoom({
    uid: "host",
    displayName: "Host",
  });

  await lifecycle.joinRoom({
    uid: "p2",
    roomCode: created.roomCode,
    displayName: "Blake",
  });
  await lifecycle.setReady({ uid: "host", roomId: created.roomId, ready: true });
  await lifecycle.setReady({ uid: "p2", roomId: created.roomId, ready: true });
  await lifecycle.startGame({ uid: "host", roomId: created.roomId });

  await actions.submitChoice({ uid: "host", roomId: created.roomId, side: "A" });
  await actions.submitChoice({ uid: "p2", roomId: created.roomId, side: "B" });
  await actions.endArgumentTurn({ uid: "host", roomId: created.roomId });
  await actions.endArgumentTurn({ uid: "p2", roomId: created.roomId });
  await actions.advanceRebuttal({ uid: "host", roomId: created.roomId });

  await Promise.all([
    actions.submitVerdict({ uid: "host", roomId: created.roomId, verdict: "A_WON" }),
    actions.submitVerdict({ uid: "p2", roomId: created.roomId, verdict: "A_WON" }),
  ]);

  const roomSnapshot = await db.collection("rooms").doc(created.roomId).get();
  const hostSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("host")
    .get();
  const guestSnapshot = await db
    .collection("rooms")
    .doc(created.roomId)
    .collection("players")
    .doc("p2")
    .get();

  assert.equal(roomSnapshot.get("phase"), "resolution");
  assert.equal(hostSnapshot.get("score"), 1);
  assert.equal(guestSnapshot.get("score"), 0);
});
